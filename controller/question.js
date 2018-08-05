'use strict';

const jwt = require('../middleware/jwt');
const commonFunction=require('../middleware/common_function');
const SegmentModel = require('../model/segment')
const BookModel = require('../model/book')
const WordModel = require('../model/word');
const UserModel = require('../model/user');
const path = require('path');

const generateQuestion = async(ctx)=>{
    try
    {
        // let info = [];
        let startTime = new Date();
        let segmentId = ctx.request.body.segment;
        let segmentObj = await SegmentModel.findById(segmentId).exec();
        let segment = segmentObj["content"]
        

        let learningWordsId = ctx.request.body.words;
        let learningWordsInfo={};
        for(let i=0;i<learningWordsId.length;i++){
            try{
                let tempWordId = learningWordsId[i];
                let wordInfo = await WordModel.findById(tempWordId).exec();

                let word = wordInfo["word"];
                let explanations = wordInfo["chineseExplanations"];
                let posList = [];
                for(let j = 0; j < explanations.length; ++j){
                    let pos = explanations[j]["pos"];
                    posList.push(pos);
                }
                learningWordsInfo[word] = posList;
            }
            catch(e){
                continue;
            }
        }

        let token = jwt.getToken(ctx);
        let userId = token.id;
        let user = await UserModel.findById(userId).exec();
        
        let learntWordsId = user["words"];
        let learntWordsInfo = {};
        for(let i=0;i<learntWordsId.length;i++){
            try{
                let tempWordId = learntWordsId[i]["word"];
                let wordInfo = await WordModel.findById(tempWordId).exec();
                let word = wordInfo["word"];
                let explanations = wordInfo["chineseExplanations"];
                let posList = [];
                for(let j = 0; j < explanations.length; ++j){
                    let pos = explanations[j]["pos"];
                    posList.push(pos);
                }
                learntWordsInfo[word] = posList;
            }
            catch(e){
                continue;
            }
        }
        let altWordsInfo = {};
        if(learntWordsId.length < 300){
            let userLevel = user["level"] > 1 ? user["level"] - 1 : 1;
            // info.push({
            //     "userLevel": userLevel,
            //     "orgLevel": user["level"]
            // });
            let altWordsRawInfo = await WordModel.find({"level":userLevel}).exec();
            for(let i = 0; i < altWordsRawInfo.length; i++){
                try{
                    let wordInfo = altWordsRawInfo[i];
                    let word = wordInfo["word"];
                    let explanations = wordInfo["chineseExplanations"];
                    let posList = [];
                    for(let j = 0; j < explanations.length; j++){
                        let pos = explanations[j]["pos"];
                        posList.push(pos);
                    }
                    altWordsInfo[word] = posList;
                }
                catch(e){
                    continue;
                }
            }            
        }

        let endTime = new Date();
        let timeDiff = endTime - startTime; //in ms
        timeDiff /= 1000;

        let elapsedTime = []
        elapsedTime.push(timeDiff);



        // info.push(altWordsInfo.length);
        // info.push(learntWordsInfo.length);

        startTime = new Date();

        var java = require("java");
        java.classpath.push(path.resolve(__dirname, './src'));
        java.classpath.push(path.resolve(__dirname, './src/lib/stanford-ner-3.4.1.jar'));
        java.classpath.push(path.resolve(__dirname, './src/lib/stanford-postagger-3.4.1.jar'));
        java.classpath.push(path.resolve(__dirname, './src/lib/gson-2.8.5.jar'));
        
        // var runInterface = java.newInstanceSync("generator.Test");
        // java.callMethodSync(runInterface, "getList", "{\"id\":\"abc\"}");

        var runInterface = java.newInstanceSync("generator.QGen_server");
        java.callMethodSync(runInterface, "preprocess", 
                            JSON.stringify(segment), 
                            JSON.stringify(learningWordsInfo), 
                            JSON.stringify(learntWordsInfo), 
                            JSON.stringify(altWordsInfo));
        let resultStr = java.callMethodSync(runInterface, "getResultJson");
        let resultArr = JSON.parse(resultStr);

        let questions = []

        for(let i = 0; i < resultArr.length; i++){
            try{
                let question = resultArr[i][0];
                
                let choices = [];
                for(let j = 1; j < resultArr[i].length; j++){
                    choices.push(resultArr[i][j]);
                }
                questions.push({
                    "question": question,
                    "choices": choices
                });
            }
            catch(e){
                continue;
            }
        }
        // for(var i = 0; i < resultArr.length; i++) {
        //     try{
        //         l
        //         for(var j = 0; j < resultArr[i].length; j++) {
        //             info.push(resultArr[i][j]);
        //         }
        //     }
        // }
        let num = questions.length > 10 ? 10 : questions.length;
        let result = commonFunction.getRandomArrayElement(questions, num);

        endTime = new Date();
        timeDiff = endTime - startTime; //in ms
        timeDiff /= 1000;

        elapsedTime.push(timeDiff);

        ctx.body = result;
        
        // ctx.body = {"result": result, "info": info};
        // ctx.body = {"status":"ok"};
        // ctx.body = {"questions":questions, 
        // "first len":resultArr[0].length, 
        // "first":resultArr[0],
        // "first q":resultArr[0][0],
        // "info": info,
        // "resultArr":resultArr.length
        // };
        ctx.status = 200;
    }
    catch (err) {
        ctx.status = 400;
        ctx.body = {"error": "what"};
        // ctx.body = {error:"error"}
        // ctx.body = {error:err}
        // console.log("err");
        // console.log(err);

    }
};

module.exports.securedRouters = {
};

module.exports.routers = {
    'POST /question':generateQuestion
};
