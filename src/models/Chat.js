const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");
const _ = require("lodash");

const ChatsSchema = new mongoose.Schema({
  participants: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "Profile",
    required: true,
    default: []
  },
  eventID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event"
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
  ownerProfileID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Profile",
    required: true
  },
  active: {
    type: Boolean,
    required: true,
    default: true
  },
  flagIDs: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "Flag",
    default: []
  },
  messages: [
    {
      fromUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      text: {
        type: String,
        required: true
      },
      type: {
        type: String,
        required: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  lastSeen: [
    {
      userID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
      },
      date: {
        type: Date,
        default: Date.now
      }
    }
  ]
});
ChatsSchema.plugin(schema => {
  schema.options.usePushEach = true;
});
ChatsSchema.methods.toJSON = function() {
  const chat = this;
  const chatObject = chat.toObject();

  return chatObject;
};

ChatsSchema.plugin(timestamps);
ChatsSchema.index({ "messages.createdAt": -1 });

const Chats = mongoose.model("Chats", ChatsSchema);
module.exports = Chats;
