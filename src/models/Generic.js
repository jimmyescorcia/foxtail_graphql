const mongoose = require("mongoose");

const locSchema = new mongoose.Schema({
  loc: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  }
});
locSchema.index({ loc: "2dsphere" });

const notifySchema = new mongoose.Schema({
  targetID: {
    type: String
  },
  type: {
    type: String
  },
  pic: {
    type: String
  },
  toMemberID: {
    type: String
  },
  name: {
    type: String
  },
  event: {
    type: String
  },
  fromUserID: {
    type: String
  },
  fromUsername: {
    type: String
  },
  text: {
    type: String
  },
  body: {
    type: String
  },
  link: {
    type: String
  },
  date: {
    type: Date,
    default: Date.now()
  },
  read: { type: Boolean, default: false },
  seen: { type: Boolean, default: false }
});

module.exports = { locSchema, notifySchema };
