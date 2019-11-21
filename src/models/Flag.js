const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");
const _ = require("lodash");

const FlagSchema = new mongoose.Schema({
  targetID: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  type: {
    type: String,
    maxlength: 140,
    required: true
  },
  reason: {
    type: String,
    maxlength: 140,
    required: true
  },
  reviewed: {
    type: Boolean,
    default: false
  },
  alert: {
    type: Boolean,
    default: false
  }
});

FlagSchema.methods.toJSON = function() {
  const flag = this;
  const flagObject = flag.toObject();

  return flagObject;
};

FlagSchema.plugin(timestamps);
const Flag = mongoose.model("Flag", FlagSchema);
module.exports = Flag;
