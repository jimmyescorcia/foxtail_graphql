const { GraphQLDateTime } = require("graphql-iso-date");
const graphql = require("graphql");

const {
  GraphQLObjectType,
  GraphQLString,
  GraphQLID,
  GraphQLList,
  GraphQLInt,
  GraphQLBoolean,
  GraphQLFloat
} = graphql;
const { getSignedUrl } = require("../../middlewares/uploadPicture");

const ProfileType = require("./Profile");
const FlagType = require("./Flag");
const Flag = require("../../models/Flag");
const Profile = require("../../models/Profile");
const { ObjectId } = require("mongoose").Types;
ObjectId.prototype.valueOf = function() {
  return this.toString();
};
const EventType = new GraphQLObjectType({
  name: "EventType",
  fields: {
    id: {
      type: GraphQLID
    },
    eventname: {
      type: GraphQLString
    },
    image: {
      type: GraphQLString,
      resolve(parentValue, args, req) {
        if (parentValue.image) {
          let sign = getSignedUrl(parentValue.image);
          return sign;
        }
        return "";
      }
    },
    description: {
      type: GraphQLString
    },
    type: {
      type: GraphQLString
    },
    startTime: {
      type: GraphQLDateTime
    },
    endTime: {
      type: GraphQLDateTime
    },
    tagline: {
      type: GraphQLString
    },
    address: {
      type: GraphQLString
    },
    interestedIn: {
      type: new GraphQLList(GraphQLString)
    },
    desires: {
      type: new GraphQLList(GraphQLString)
    },
    maxDistance: {
      type: GraphQLInt
    },
    active: {
      type: GraphQLBoolean
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
    invited: {
      type: new GraphQLList(ProfileType),
      resolve(parentValue, args, req) {
        return Profile.find({
          _id: parentValue.invited,
          active: true
        });
      }
    },
    blocked: {
      type: new GraphQLList(GraphQLID)
    },
    flags: {
      type: new GraphQLList(FlagType),
      resolve(parentValue) {
        return Flag.find({
          _id: parentValue.flagIDs
        });
      }
    },
    chatID: {
      type: GraphQLID
    },
    ownerProfile: {
      type: ProfileType,
      resolve(parentValue) {
        return Profile.findById(parentValue.ownerProfileID);
      }
    },
    distance: {
      type: GraphQLFloat,
      async resolve(parentValue, args, req) {
        const { getDistance } = require("../../utils/distanceCalc");

        return getDistance(
          req.user.location.crds.lat,
          req.user.location.crds.long,
          parentValue.lat,
          parentValue.long,
          "M"
        );
      }
    },
    lat: {
      type: GraphQLFloat
    },
    long: {
      type: GraphQLFloat
    },
    createdAt: {
      type: GraphQLDateTime
    }
  }
});

module.exports = { EventType };
