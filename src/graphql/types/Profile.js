const { GraphQLDateTime } = require("graphql-iso-date");
const graphql = require("graphql");

const {
  GraphQLObjectType,
  GraphQLString,
  GraphQLBoolean,
  GraphQLID,
  GraphQLList,
  GraphQLInt,
  GraphQLFloat
} = graphql;

const User = require("../../models/User");
const Flag = require("../../models/Flag");
const Profile = require("../../models/Profile");
const { getSignedUrl } = require("../../middlewares/uploadPicture");
const { getDistance } = require("../../utils/distanceCalc");

const { photoType } = require("./Generic");
const { ObjectId } = require("mongoose").Types;
ObjectId.prototype.valueOf = function() {
  return this.toString();
};

const ProfileType = new GraphQLObjectType({
  name: "ProfileType",
  fields: () => {
    const UserType = require("./User");
    const FlagType = require("./Flag");

    return {
      id: {
        type: GraphQLID
      },
      users: {
        type: new GraphQLList(UserType),
        resolve(parentValue, args) {
          return User.find({
            profileID: parentValue._id.toString()
          });
        }
      },
      gender: {
        type: GraphQLString
      },
      userDOBs: {
        type: new GraphQLList(GraphQLDateTime)
      },
      updatedAt: {
        type: GraphQLDateTime
      },
      active: {
        type: GraphQLBoolean
      },
      isBlackMember: {
        type: GraphQLBoolean
      },
      showOnline: {
        type: GraphQLBoolean,
        resolve(parentValue) {
          return parentValue.discoverySettings.showOnline;
        }
      },
      about: {
        type: GraphQLString
      },
      interestedIn: {
        type: new GraphQLList(GraphQLString)
      },
      lastNotification: {
        type: GraphQLString
      },
      desires: {
        type: new GraphQLList(GraphQLString)
      },
      blockedProfiles: {
        type: new GraphQLList(ProfileType),
        resolve(parentValue, args, req) {
          return Profile.find({
            _id: parentValue.blockedProfileIDs,
            active: true
          });
        }
      },
      publicPhotos: {
        type: new GraphQLList(photoType)
      },
      privatePhotos: {
        type: new GraphQLList(photoType)
      },
      cplLink: {
        type: new graphql.GraphQLObjectType({
          name: "CoupleLink",
          fields: {
            linkCode: {
              type: GraphQLString
            },
            includeMsgs: {
              type: GraphQLString
            },
            expiration: {
              type: GraphQLDateTime
            }
          }
        })
      },
      profilePic: {
        type: GraphQLString,
        resolve(parentValue, args, req) {
          if (parentValue.profilePic !== "") {
            let sign = getSignedUrl(parentValue.profilePic);
            return sign;
          }
          return "";
        }
      },
      profileName: {
        type: GraphQLString
      },
      flags: {
        type: new GraphQLList(FlagType),
        resolve(parentValue, args, req) {
          return Flag.find({
            _id: parentValue.flagIDs
          });
        }
      },
      likeProfiles: {
        type: new GraphQLList(ProfileType),
        resolve(parentValue, args, req) {
          return Profile.find({
            _id: parentValue.likeIDs,
            active: true
          });
        }
      },
      publicCode: {
        type: GraphQLString
      },
      showOnline: {
        type: GraphQLBoolean,
        async resolve(parentValue, args, req) {
          return parentValue.discoverySettings.showOnline;
        }
      },
      online: {
        type: GraphQLBoolean
      },
      likedByMe: {
        type: GraphQLBoolean
      },
      msgdByMe: {
        type: GraphQLBoolean
      },
      distance: {
        type: GraphQLInt,
        async resolve(parentValue, args, req) {
          if (req.user.distanceMetric === "km") {
            return getDistance(
              req.user.location.crds.lat,
              req.user.location.crds.long,
              parentValue.loc.loc.coordinates[1],
              parentValue.loc.loc.coordinates[0],
              "K"
            );
          } else {
            return getDistance(
              req.user.location.crds.lat,
              req.user.location.crds.long,
              parentValue.loc.loc.coordinates[1],
              parentValue.loc.loc.coordinates[0],
              "M"
            );
          }
        }
      }
    };
  }
});

module.exports = ProfileType;
