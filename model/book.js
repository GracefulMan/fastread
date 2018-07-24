'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const bookSchema = new Schema({
    "bookname": { type: String },
    "author": { type: String },
    "cover": { type: String },
    "segments": [{ type: mongoose.Schema.Types.ObjectId, ref: 'Segment' }],
    "level": { type: Number },
    "downloads": { type: Number },
    "gutenburgId": { type: Number },
    "category": [{ type: String }],
    "year": { type: String },
    "publisher": { type: String },
    "commentary": { type: String },
    "likes": [{ type: mongoose.Schema.Types.ObjectId, ref: 'Segment' }],
    "likeNum": { type: Number, default :0 },
    "numberOfReading":{type:Number,default :0},
    "comments": [
        {type: mongoose.Schema.Types.ObjectId, ref: 'Comment'}
    ],
    "CommentNum":{type:Number,default:0},
    "goodreads_rating":{type:Number,default:0},
    "goodreads_ratingVal":{type:Number,default:0}
});

bookSchema.pre('save', function (next) {
    this.updated = Date.now();
    next();
});
const Book = mongoose.model('Book', bookSchema);
module.exports = Book;
