'use strict';

const crypto = require('crypto');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    "username": { type: String, index: { unique: true, sparse: true } },
    "password": { type: String },
    "books": [{
        book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book' },
        segment: { type: mongoose.Schema.Types.ObjectId, ref: 'Segment' },
        whetherOrNotToRead:{type:Boolean,default:false},
        like:{type:Boolean,default:false},
        currentSegment:{type:Number,default:0},
        totalSegment:{type:Number,default:0}



    }],
    "records": [{
        book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book' },
        segment: { type: mongoose.Schema.Types.ObjectId, ref: 'Segment' },
        score: { type: Number },
        time: { type: Number }
    }],
    "words": [{
        word: { type: mongoose.Schema.Types.ObjectId, ref: 'Word' },
        times: { type: Number }
    }],
    "level": { type: Number },
    "nickname": { type: String, default: "" },
    "wechatOpenId": { type: String, default: "" },
    "avatar": { type: String, default: "" },
    "age": { type: Number, default: 0 },
    "gender": { type: Number, default: 0 },
    "phone": { type: String, default: '' },
    "email": { type: String, default: '' },
    "created": { type: Date, default: Date.now, index: true },
    "updated": { type: Date, default: Date.now, index: true },
    "settings": {
        "font-size": { type: Number, default: 14 },
        "background": { type: Number, default: 0 }
    },
    "status": {
        "totalReadingTime": { type: Number, default: 0 },
        "totalChapters": { type: Number, default: 0 },
        "lastReadDate": { type: Date, default: Date.now, },
        "continuousReadingDayCount": { type: Number, default: 0 },
        "totalReadingWords": { type: Number, default: 0 },
        "totalReadingBooks": { type: Number, default: 0 },
        "totalAnswers": { type: Number, default: 0 },
        "totalCorrectAnswers": { type: Number, default: 0 },
        "totalLearnedWords": { type: Number, default: 0 }
    }
});

// use sha1 to crypt password
userSchema.path('password').set(function (v) {
    let shasum = crypto.createHash('sha1');
    shasum.update(v);
    return shasum.digest('hex');
});

userSchema.pre('save', function (next) {
    this.updated = Date.now();
    next();
});

userSchema.statics.findByUsername = function (username) {
    return this.findOne({ username: username });
};
userSchema.statics.timeDifference=function(lastReadDate){
    var dd= new Date();
    var yesterday=dd.setDate(dd.getDate()-1);
    var newDay = new Date(yesterday);
    if (lastReadDate.getDate()==newDay.getDate()){
        return 1;
    }else if (lastReadDate.getDate()==new Date().getDate()) {
        return 2;
    } else {
        return 0;
    } 
};
const User = mongoose.model('User', userSchema);

module.exports = User;
