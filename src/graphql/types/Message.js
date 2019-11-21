const { GraphQLDateTime } = require("graphql-iso-date");
const graphql = require("graphql");
const moment = require("moment");

const {
  GraphQLObjectType,
  GraphQLString,
  GraphQLID,
  GraphQLList,
  GraphQLInt,
  GraphQLBoolean
} = graphql;
const UserType = require("./User");
const ProfileType = require("./Profile");
const User = require("../../models/User");
const { getSignedUrl } = require("../../middlewares/uploadPicture");
const Profile = require("../../models/Profile");
const Chat = require("../../models/Chat");
const { ObjectId } = require("mongoose").Types;
ObjectId.prototype.valueOf = function() {
  return this.toString();
};
//id pic name
const MessageType = new GraphQLObjectType({
  name: "MessageType",
  fields: {
    id: {
      type: GraphQLID
    },
    chatID: {
      type: GraphQLID
    },
    fromProfile: {
      type: ProfileType,
      async resolve(parentValue, args, req) {
        return await Profile.findById(parentValue.fromProfile);
      }
    },
    fromUser: {
      type: UserType,
      async resolve(parentValue, args, req) {
        return await User.findById(parentValue.fromUser);
      }
    },
    profilePic: {
      type: GraphQLString,
      async resolve(parentValue, args, req) {
        let picurl;

        if (parentValue.type === "alert" || parentValue.type === "left") {
          return "";
        }

        if (parentValue.fromUser) {
          picurl = (await Profile.findOne({
            userIDs: parentValue.fromUser,
            active: true
          })).profilePic;
        } else {
          picurl = (await Profile.findById(parentValue.fromProfile)).profilePic;
        }

        if (picurl !== "") {
          let sign = getSignedUrl(picurl);
          return sign;
        }
        return "";
      }
    },
    participants: {
      type: new GraphQLList(ProfileType),
      async resolve(parentValue, args, req) {
        //Remember subscrition auth must be enabled
        return await Profile.find({
          $and: [
            {
              _id: {
                $ne: req.user.profileID,
                $in: parentValue.participants
              },
              active: true
            }
          ]
        });
      }
    },
    invited: {
      type: new GraphQLList(ProfileType),
      async resolve(parentValue, args, req) {
        return await Profile.find({
          $and: [
            {
              _id: {
                $ne: req.user.profileID,
                $in: parentValue.invited
              },
              active: true
            }
          ]
        });
      }
    },
    text: {
      type: GraphQLString
    },
    type: {
      type: GraphQLString,
      default: "new"
    },
    unSeenCount: {
      type: GraphQLInt,
      async resolve(parentValue, args, req) {
        const chat = await Chat.findById(parentValue.chatID);

        if (!chat) {
          return;
        }

        return await calcUnseenMsgs({ chat, userID: req.user._id.toString() });
      }
    },
    blackMember: {
      type: GraphQLBoolean,
      async resolve(parentValue) {
        let isBlk;
        if (parentValue.fromProfile) {
          isBlk = (await Profile.findById(parentValue.fromProfile, {
            isBlackMember: 1
          })).isBlackMember;
        } else if (parentValue.fromUser) {
          isBlk = (await User.findById(parentValue.fromUser, {
            "blackMember.active": 1
          })).blackMember.active;
        } else {
          isBlk = false;
        }

        return isBlk;
      }
    },
    createdAt: {
      type: GraphQLDateTime
    }
  }
});

function calcUnseenMsgs({ chat, userID }) {
  let unSeenCount = 0;

  let lastSeen = chat.lastSeen.find(
    el => el.userID.toString() === userID.toString()
  );

  //They've never seen the entire chat
  if (lastSeen === undefined) {
    unSeenCount = chat.messages.length;
  } else {
    lastSeen = lastSeen.date;
    const unSeen = chat.messages.filter(message => {
      if (moment(message.createdAt).isAfter(lastSeen)) {
        if (
          message.fromUser &&
          message.fromUser.toString() === userID.toString()
        ) {
          return false;
        }
        return true;
      }
    });

    unSeenCount = unSeen.length;
  }

  return unSeenCount;
}

module.exports = MessageType;
