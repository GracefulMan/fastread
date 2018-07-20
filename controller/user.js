'use strict';

const crypto = require('crypto');
const jwt = require('../middleware/jwt')
const UserModel = require('../model/user');
const BookModel = require('../model/book');
const CommentModel = require('../model/comment');
const ERRORCODE = require('../CONSTANTS').ERRORCODE;

const list = async (ctx) => {
    let page = ctx.query.page || 1;
    let limit = 10;
    let skip = (page - 1) * limit;
    let users = await UserModel.find().skip(skip).limit(limit).exec();
    ctx.body = users;
}

const auth = async (ctx) => {
    let username = ctx.request.body.username;
    let password = ctx.request.body.password;
    let user = await UserModel.findByUsername(username);
    if (user) {
        let shasum = crypto.createHash('sha1');
        shasum.update(password);
        if (user.password === shasum.digest('hex')) {
            ctx.status = 200;
            ctx.body = {
                token: jwt.issue({
                    id: user._id,
                    user: username
                })
            }
        } else {
            ctx.status = 403;
            ctx.body = { error: "Invalid login" };
        }
    } else {
        ctx.status = 401;
        ctx.body = { error: "Invalid login" }
    }
}

const authByWechat = async (ctx) => {
    let wechatOpenId = ctx.request.body.wechatOpenId;
    let avatar = ctx.request.body.avatar;
    let nickname = ctx.request.body.nickname;
    let user = await UserModel.findOne({ 'wechatOpenId': wechatOpenId });
    if (user) {
        ctx.status = 200;
        ctx.body = {
            token: jwt.issue({
                id: user._id,
                wechatOpenId: wechatOpenId
            })
        }
    } else {
        user = new UserModel({
            wechatOpenId: wechatOpenId,
            avatar: avatar,
            nickname: nickname,
            username: wechatOpenId,
            level: -1
        })
        try {
            let newUser = await user.save();
            ctx.status = 200;
            ctx.body = {
                token: jwt.issue({
                    id: newUser._id,
                    wechatOpenId: newUser.wechatOpenId
                })
            }
        } catch (error) {
            ctx.status = 403;
            console.log(error)
            ctx.body = { "errorCode": ERRORCODE.DUPLICATE_USERNAME }
        }
    }
}

const register = async (ctx) => {
    let username = ctx.request.body.username;
    let password = ctx.request.body.password;

    let user = new UserModel({
        username: username,
        password: password,
        level: -1
    })
    try {
        let newUser = await user.save();
        ctx.status = 200;
        ctx.body = {};
    } catch (error) {
        ctx.status = 403;
        ctx.body = { "errorCode": ERRORCODE.DUPLICATE_USERNAME }
    }
}

const myInfo = async (ctx) => {
    let token = jwt.getToken(ctx)
    let userId = token.id;
    let user = await UserModel
        .findById(userId)
        .populate(
            {
                path: 'books.book',
                select: {
                    id: 1,
                    bookname: 1,
                    cover:1,
                    category:1
                }
            }
        ).exec();
    ctx.status = 200;
    ctx.body = user;
}

const getMyComments = async (ctx) => {
    let page = ctx.query.page || 1;
    let limit = Number(ctx.query.limit) || 10;
    let skip = (page - 1) * limit;

    let token = jwt.getToken(ctx)
    let userId = token.id;

    let myComments = await CommentModel
        .find({ 'user': userId })
        .skip(skip)
        .limit(limit)
        .exec()
    ctx.body = myComments
}

const getInfoById = async (ctx) => {
    let userInfo = await UserModel
        .findById(ctx.params.id)
        .select("_id avatar username nickname")
        .exec()
    ctx.body = userInfo
}

const updateInfo = async (ctx) => {
    let token = jwt.getToken(ctx)
    let userId = token.id;
    let user = await UserModel.findByIdAndUpdate(
        userId,
        ctx.request.body
    );
    ctx.status = 200;
    ctx.body = {};
}

const updatePhone = async (ctx) => {
    let token = jwt.getToken(ctx)
    let userId = token.id;
    let phone = ctx.request.body.phone;

    let user = await UserModel.findById(userId);
    let checkPhone = await UserModel.findOne({ 'phone': phone });
    if (checkPhone) {
        ctx.status = 403;
        ctx.body = { error: "Phone number already exist!" }
    } else {
        user.phone = phone;
        user = await user.save();
        ctx.status = 200;
        ctx.body = {}
    }
}

const updateLevel = async (ctx) => {
    let token = jwt.getToken(ctx)
    let userId = token.id;
    let user = await UserModel.findByIdAndUpdate(
        userId,
        {
            level: ctx.request.body.level
        }
    );
    ctx.status = 200;
    ctx.body = {};
}

const updateWords = async (ctx) => {
    // TODO: use user token
    let updateWords = ctx.request.body.updateWords
    let token = jwt.getToken(ctx)
    let userId = token.id;
    let user = await UserModel.findById(userId);

    updateWords.forEach(word => {
        let isNewWord = true;
        for (var i = 0; i < user.words.length; i++) {
            if (String(user.words[i].word) === word) {
                user.words[i].times++;
                isNewWord = false;
            }
        }
        if (isNewWord) {
            user.words.push({
                word: word,
                times: 1
            })
        }
    });

    user = await user.save();
    ctx.status = 200;
    ctx.body = {};
}

const updateBookProgress = async (ctx) => {
    let updateBook = ctx.request.body.book;
    let updateProgress = ctx.request.body.segment;
    try {
        let book = await BookModel.findById(updateBook)
        if (book.segments.indexOf(updateProgress.toString()) < 0) {
            ctx.status = 401
            ctx.body = { error: "Invalid segment" }
            return;
        }
        let judge=false;
        if(book.segments[book.segments.length-1]==updateBookProgress.toString()){
            judge =true;
        }

        let token = jwt.getToken(ctx)
        let userId = token.id;
        let user = await UserModel.findById(userId);
        for (var i = 0; i < user.books.length; i++) {
            if (String(user.books[i].book) === updateBook) {
                user.books[i].segment = updateProgress;
                user.books[i].whetherOrNotToRead=judge;
            }
        }
        user = await user.save();
        ctx.status = 200;
        ctx.body = {};
    } catch (error) {
        ctx.status = 401;
        ctx.body = { error: "error" }
    }
}

const addBook = async (ctx) => {
    // TODO: use user token
    let newBookId = ctx.request.body.book
    try {
        let book = await BookModel.findById(newBookId);
        let totalSegmentLength = book.segments.length;
        console.log(totalSegmentLength);
        let num = book.numberOfReading+1;
        await BookModel.update({"_id":newBookId},{$set:{"numberOfReading":num}});
        let token = jwt.getToken(ctx)
        let userId = token.id;
        let user = await UserModel.findById(userId);
        // Check if the book already been read
        user.books.forEach(book => {
            if (String(book.book) === newBookId) {
                ctx.throw(400, 'The book has already been added in user\'s read list!')
            }
        });
        user.books.push({
            book: newBookId,
            segment: book.segments[0],
            totalSegment:totalSegmentLength
        })
        user = await user.save();
        ctx.status = 200;
        ctx.body = {};
    } catch (error) {
        ctx.status = 401;
        ctx.body = { error: error }
    }
}

const removeBook = async (ctx) => {
    let newBookId = ctx.request.body.book
    try {
        let token = jwt.getToken(ctx)
        let userId = token.id;
        let user = await UserModel.findById(userId)
        for (let i = 0; i < user.books.length; i++) {
            if (String(user.books[i].book) === newBookId) {
                user.books.slice(1, 1)
            }
        }
        user = await user.save();
        ctx.status = 200;
        ctx.body = {};
    } catch (error) {
        ctx.status = 401;
        ctx.body = { error: error }
    }
}

const getRecommendedBooks = async (ctx) => {
    try {
        let token = jwt.getToken(ctx)
        let userId = token.id;
        console.log(userId)
        let user = await UserModel.findById(userId)
        let userBookList = []
        user.books.forEach(book => {
            userBookList.push(book.book)
        });
        console.log(user)
        let books = await BookModel.find({
            level: user.level,
            _id: { "$nin": userBookList }
        }).select({
            segments: 0
        }).sort({
            download: -1
        }).limit(3).exec();
        ctx.body = books;
        ctx.status = 200;
    } catch (error) {
        ctx.status = 401;
        ctx.body = { error: error }
    }
}

const updateRecord = async (ctx) => {
    try {
        let token = jwt.getToken(ctx)
        let userId = token.id;
        let user = await UserModel.findById(userId)

        let book = ctx.request.body.book;
        let segment = ctx.request.body.segment;
        let time = ctx.request.body.time;
        let score = ctx.request.body.score;
        let isNewRecord = true;

        for (var i = 0; i < user.records.length; i++) {
            if (String(user.records[i].segment) === segment) {
                user.records[i].time = time
                user.records.score = score
                isNewRecord = false;
            }
        }
        if (isNewRecord) {
            user.records.push({
                book: book,
                segment: segment,
                time: time,
                score: score
            })
        }

        user = await user.save();
        ctx.status = 200;
        ctx.body = {};
    } catch (error) {
        ctx.status = 401;
        ctx.body = { error: error }
    }
}

const updateStatus = async (ctx) => {
    let token = jwt.getToken(ctx)
    let userId = token.id;
    let status = ctx.request.body.status;

    try {
        let user = await UserModel.findByIdAndUpdate(
            userId,
            {
                status: status
            }
        );
        ctx.status = 200;
        ctx.body = {};
    } catch (error) {
        ctx.status = 403
        ctx.body = { error: error }
    }
}

const consecutiveRTime=async (ctx)=>{
    let token = jwt.getToken(ctx)
    let userId= token.id;
    let result;
    let user = await UserModel.findById(userId);
    let judgeWhetherReadYesterday=await UserModel.timeDifference(user.status.lastReadDate);
    if (judgeWhetherReadYesterday==1){
        result = user.status.continuousReadingDayCount+1;
    }else if(judgeWhetherReadYesterday==2){
        result = user.status.continuousReadingDayCount;
    }else{
        result = 0;
    }
    await UserModel.findByIdAndUpdate(userId,{$set:{"status.continuousReadingDayCount":result,"status.lastReadDate":new Date()}})
    ctx.body = result;
    ctx.status =200;
}
const totalReadingWords = async(ctx)=>{
    let token = jwt.getToken(ctx);
    let userId=token.id;
    let user = await UserModel.findById(userId);
    let result =parseInt(ctx.params.query)+user.status.totalReadingWords;
    await UserModel.findByIdAndUpdate(userId,{$set:{"status.totalReadingWords":result}});
    ctx.body = result;
    ctx.status = 200;
}

const totalReadingBooks = async(ctx)=>{
    let token = jwt.getToken(ctx);
    let userId=token.id;
    let user = await UserModel.findById(userId);
    let result =parseInt(ctx.params.query)+user.status.totalReadingBooks;
    await UserModel.findByIdAndUpdate(userId,{$set:{"status.totalReadingBooks":result}});
    ctx.body = result;
    ctx.status = 200;
}

const totalAnswers = async(ctx)=>{
    let token = jwt.getToken(ctx);
    let userId=token.id;
    let user = await UserModel.findById(userId);
    let result =parseInt(ctx.params.query)+user.status.totalAnswers;
    await UserModel.findByIdAndUpdate(userId,{$set:{"status.totalAnswers":result}});
    ctx.body = result;
    ctx.status = 200;
}

const totalCorrectAnswers = async(ctx)=>{
    let token = jwt.getToken(ctx);
    let userId=token.id;
    let user = await UserModel.findById(userId);
    let result =parseInt(ctx.params.query)+user.status.totalCorrectAnswers;
    await UserModel.findByIdAndUpdate(userId,{$set:{"status.totalCorrectAnswers":result}});
    ctx.body = result;
    ctx.status = 200;
}

const totalLearnedWords=async(ctx)=>{
    let token = jwt.getToken(ctx);
    let userId=token.id;

    let user = await UserModel.findById(userId);
    let result =parseInt(ctx.params.query)+user.status.totalLearnedWords;
    await UserModel.findByIdAndUpdate(userId,{$set:{"status.totalLearnedWords":result}});
    ctx.body = result;
    ctx.status = 200;
}
const totalChapters=async(ctx)=>{
    let token = jwt.getToken(ctx);
    let userId=token.id;
    let user = await UserModel.findById(userId);
    let result =parseInt(ctx.params.query)+user.status.totalChapters;
    await UserModel.findByIdAndUpdate(userId,{$set:{"status.totalChapters":result}});
    ctx.body = result;
    ctx.status = 200;
}
const totalReadingTime=async(ctx)=>{
    let token = jwt.getToken(ctx);
    let userId=token.id;
    let user = await UserModel.findById(userId);
    let result =parseInt(ctx.params.query)+user.status.totalReadingTime;
    await UserModel.findByIdAndUpdate(userId,{$set:{"status.totalReadingTime":result}});
    ctx.body = result;
    ctx.status = 200;
}
const likeBook = async(ctx)=>{
    let userLikeBookId = ctx.request.body.book;
    let token = jwt.getToken(ctx);
    let userId = token.id;
    await UserModel.update(
        {"_id":userId,
        "books":{$elemMatch: {book:userLikeBookId}}},
        {$set:{"books.$.like":true     
        }})
    let book =await BookModel.findById(userLikeBookId);
    console.log(book);
    let likesNum = book["likeNum"]+1;
    await BookModel.update({"_id":userLikeBookId},{$set:{"likeNum":likesNum}}) 
    ctx.status =200;    
}
const unLikeBook=async(ctx)=>{
    let userLikeBookId = ctx.request.body.book;
    let token = jwt.getToken(ctx);
    let userId = token.id;
    await UserModel.update(
        {"_id":userId,
        "books":{$elemMatch: {book:userLikeBookId}}},
        {$set:{"books.$.like":false     
        }})
    let book =await BookModel.findById(userLikeBookId);
    let likesNum = book["likeNum"]-1;
    await BookModel.update({"_id":userLikeBookId},{$set:{"likeNum":likesNum}}) 
    ctx.status =200;  

}

module.exports.securedRouters = {
    'GET /totalAnswers/:query':totalAnswers,
    'GET /totalCorrectAnswers/:query':totalCorrectAnswers,
    'GET /totalLearnedWords/:query':totalLearnedWords,
    'GET /totalChapters/:query':totalChapters,
    'GET /totalReadingTime/:query':totalReadingTime,
    'GET /totalReadingBooks/:query':totalReadingBooks,
    'GET /totalReadingWords/:query':totalReadingWords,
    'GET /consecutiveTime':consecutiveRTime,
    'GET /myInfo': myInfo,
    'GET /myComments': getMyComments,
    'POST /updateLevel': updateLevel,
    'POST /updateWords': updateWords,
    'POST /updateBookProgress': updateBookProgress,
    'POST /user/book': addBook,
    'DEL /user/book': removeBook,
    'PUT /user': updateInfo,
    'GET /recommend': getRecommendedBooks,
    'POST /user/record': updateRecord,
    'PUT /user/phone': updatePhone,
    'PUT /user/status': updateStatus,
    'POST /like':likeBook,
    'POST /unlike':unLikeBook
};

module.exports.routers = {
    'GET /user': list,
    'POST /auth': auth,
    'POST /user': register,
    'POST /authByWechat': authByWechat,
    'GET /user/:id': getInfoById
};
