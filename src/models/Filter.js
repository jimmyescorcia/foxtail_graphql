const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");
const _ = require("lodash");

const FilterSchema = new mongoose.Schema({
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  searchParams: {
    distance: {
      type: Number,
      default: 100
    },
    distanceMetric: {
      type: String,
      default: "mi"
    },
    ageRange: {
      type: [Number],
      default: [18, 80]
    },
    interestedIn: {
      type: [String],
      default: ["M", "F"]
    }
  },
  rejected: [
    {
      profileID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Profile"
      },
      rejectDate: {
        type: Date,
        default: Date.now
      }
    }
  ],
  blocked: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Profile"
    }
  ]
});

FilterSchema.methods.toJSON = function() {
  const filter = this;
  const filterObject = filter.toObject();

  return filterObject;
};
FilterSchema.plugin(timestamps);

const Filter = mongoose.model("filter", FilterSchema);
module.exports = Filter;
