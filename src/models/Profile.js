const mongoose = require("mongoose");
const _ = require("lodash");
const timestamps = require("mongoose-timestamp");
const { locSchema, notifySchema } = require("./Generic");
const { clearHash } = require("../utils/cache");

const ProfileSchema = new mongoose.Schema({
  userIDs: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "User",
    required: true
  },
  userDOBs: {
    type: [Date],
    required: true
  },
  gender: {
    type: String,
    required: true
  },
  active: {
    type: Boolean,
    default: true
  },
  likesToday: {
    count: {
      type: Number,
      default: 0
    },
    date: {
      type: Date,
      default: Date.now()
    },
    lastUpdate: {
      type: Date,
      default: Date.now()
    }
  },
  about: {
    type: String,
    default: ""
  },
  interestedIn: [
    {
      type: String,
      required: true
    }
  ],
  publicPhotos: [
    {
      url: {
        type: String
      }
    }
  ],
  privatePhotos: [
    {
      url: {
        type: String
      }
    }
  ],
  profilePic: {
    type: String,
    default: ""
  },
  profileName: {
    type: String,
    default: ""
  },
  desires: {
    type: [String]
  },
  isBlackMember: {
    type: Boolean,
    default: false,
    required: true
  },
  discoverySettings: {
    showOnline: {
      type: Boolean,
      default: true
    },
    likedOnly: {
      type: Boolean,
      default: false
    },
    visible: {
      type: Boolean,
      default: true
    }
  },
  blockedProfileIDs: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "Profile"
  },
  loc: locSchema,
  cplLink: {
    linkCode: {
      type: String,
      default: ""
    },
    includeMsgs: {
      type: Boolean,
      default: false
    },
    expiration: {
      type: Date,
      default: Date.now()
    }
  },
  flagIDs: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Flag"
    }
  ],
  likeIDs: [
    {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Profile"
    }
  ],
  badges: [
    {
      badgeName: {
        type: String
      },
      active: {
        type: Boolean
      }
    }
  ],
  online: { type: Boolean, default: false, required: true },
  lastActive: {
    type: Date,
    default: Date.now()
  },
  notifications: [notifySchema]
});

ProfileSchema.statics.offline = async function(token) {
  const User = require("./User");
  const Profile = this;
  const user = await User.findOneAndUpdate(
    {
      "tokens.token": token,
      "tokens.access": "auth"
    },
    {
      $set: {
        online: false,
        "activity.lastActive": Date.now()
      }
    },
    { profileID: 1 }
  );

  await Profile.findOneAndUpdate(
    {
      _id: user.profileID,
      active: true
    },
    {
      $set: {
        online: false,
        updatedAt: Date.now()
      }
    }
  );
};

ProfileSchema.statics.addNotification = async function({
  toMemberIDs,
  type,
  text,
  pic,
  fromUserID,
  targetID,
  name,
  event
}) {
  const Profile = this;
  try {
    await toMemberIDs.forEach(async id => {
      const profile = await Profile.findOne({ _id: id, active: true }).cache({
        key: id
      });
      // if (
      //   profile.notifications.findIndex(
      //     i =>
      //       i.toMemberID === id &&
      //       i.fromUserID === fromUserID.toString() &&
      //       i.targetID === targetID &&
      //       i.text === text
      //   ) < 0
      // ) {
      profile.notifications.push({
        toMemberID: id,
        type,
        text,
        pic,
        fromUserID,
        targetID,
        name,
        event
      });
      await profile.save();
      // } else {
      //   return;
      // }

      clearHash(id);
    });
    return true;
  } catch (e) {
    console.error(e.message);
    throw new Error("Client: Error occurred please try again.");
  }
};

ProfileSchema.statics.removeNotification = async function({
  removeMemberIDs,
  type,
  targetID
}) {
  const Profile = this;

  try {
    await removeMemberIDs.forEach(async id => {
      await Profile.updateOne(
        { _id: id },
        {
          $pull: {
            notifications: {
              toMemberID: id,
              type,
              targetID
            }
          }
        }
      );
    });
    return true;
  } catch (e) {
    console.error(e.message);
    throw new Error("Remoove Notification error:", e.message);
  }
};

ProfileSchema.plugin(timestamps);

ProfileSchema.index({ "loc.loc": "2dsphere" });
const Profile = mongoose.model("profiles", ProfileSchema);
Profile.createIndexes({ "loc.loc": "2dsphere" });
module.exports = Profile;
