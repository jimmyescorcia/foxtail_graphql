const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");
const _ = require("lodash");
const { locSchema } = require("./Generic");

const EventsSchema = new mongoose.Schema({
  eventname: {
    type: String,
    required: true
  },
  image: {
    type: String
  },
  description: {
    type: String,
    default:
      "This member hasn't filled in their about me yet. Send a message to find out more about them."
  },
  type: {
    type: String,
    default: "public"
  },
  address: {
    type: String
  },
  lat: {
    type: Number
  },
  long: {
    type: Number
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  tagline: {
    type: String
  },
  interestedIn: [
    {
      type: String
    }
  ],
  desires: [
    {
      type: String
    }
  ],
  maxDistance: {
    type: Number
  },
  active: {
    type: Boolean,
    required: true,
    default: true
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  participants: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "Profile",
    default: []
  },
  invited: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "Profile",
    default: []
  },
  blocked: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Profile"
    }
  ],
  location: locSchema,
  flagIDs: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "Flag",
    default: []
  },
  chatID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Chat",
    required: true
  },
  ownerProfileID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Profile",
    required: true
  }
});

// EventsSchema.methods.toJSON = function () {
//   const event = this;
//   const eventObject = event.toObject();

//   return eventObject;
// };

EventsSchema.index({ startTime: -1 });

EventsSchema.plugin(timestamps);
const Events = mongoose.model("Events", EventsSchema);
module.exports = Events;
