const { GraphQLDateTime } = require("graphql-iso-date");

const graphql = require("graphql");

const {
  GraphQLObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLID,
  GraphQLBoolean
} = graphql;

const ProfileType = require("./Profile");
const { EventType } = require("./Event");
const UserType = require("./User");
const FlagType = require("./Flag");
const MessageType = require("./Message");

const Flag = require("../../models/Flag");
const User = require("../../models/User");
const Profile = require("../../models/Profile");
const Event = require("../../models/Event");
const { ObjectId } = require("mongoose").Types;
ObjectId.prototype.valueOf = function() {
  return this.toString();
};

const ChatType = new GraphQLObjectType({
  name: "ChatType",
  fields: {
    id: {
      type: GraphQLID
    },
    participants: {
      type: new GraphQLList(ProfileType),
      resolve(parentValue, args, req) {
        return Profile.find({
          _id: parentValue.participants,
          active: true
        });
      }
    },
    event: {
      type: EventType,
      resolve(parentValue, args, req) {
        return Event.findOne({
          _id: parentValue.eventID
        });
      }
    },
    invited: {
      type: new GraphQLList(ProfileType),
      resolve(parentValue, args, req) {
        return Profile.find({
          _id: parentValue.invited,
          active: true
        });
      }
    },
    ownerProfile: {
      type: ProfileType,
      resolve(parentValue, args, req) {
        return Profile.findOne({
          _id: parentValue.ownerProfileID,
          active: true
        });
      }
    },
    flags: {
      type: new GraphQLList(FlagType),
      resolve(parentValue, args, req) {
        return Flag.find({
          _id: parentValue.flagIDs
        });
      }
    },
    createdAt: {
      type: GraphQLDateTime
    },
    updatedAt: {
      type: GraphQLDateTime
    },
    messages: {
      type: new GraphQLList(MessageType)
    },
    blocked: {
      type: new GraphQLList(GraphQLID)
    },
    active: {
      type: GraphQLBoolean,
      default: true
    },
    unSeenCount: {
      type: GraphQLInt,
      default: 0
    }
  }
});

module.exports = ChatType;
