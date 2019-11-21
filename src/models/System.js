const mongoose = require("mongoose");

const SystemSchema = new mongoose.Schema({
  maintenance: {
    active: {
      type: Boolean,
      default: false
    },
    startDate: {
      type: Date
    },
    endDate: {
      type: Date
    }
  },
  announcement: {
    message: {
      type: String,
      default: ""
    },
    endDate: {
      type: Date
    }
  },
  malesNum: {
    type: Number,
    default: 799
  },
  femalesNum: {
    type: Number,
    default: 334
  },
  couplesNum: {
    type: Number,
    default: 64
  },
  totalNum: {
    type: Number
  }
});

SystemSchema.methods.toJSON = function() {
  const system = this;
  const systemObject = system.toObject();

  return systemObject;
};

const System = mongoose.model("System", SystemSchema);
module.exports = System;
