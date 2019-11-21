const GraphQL = require("graphql");
const {
  GraphQLObjectType,
  GraphQLString,
  GraphQLBoolean,
  GraphQLInt,
  GraphQLList
} = GraphQL;
const { GraphQLDateTime } = require("graphql-iso-date");
const User = require("../../models/User");
const UserType = require("./User");
const { photoType } = require("./Generic");
const SettingsType = new GraphQLObjectType({
  name: "Settings",
  description: "User/Profile Settings",
  fields: () => {
    return {
      distance: {
        type: GraphQLInt
      },
      distanceMetric: {
        type: GraphQLString
      },
      ageRange: {
        type: new GraphQLList(GraphQLInt)
      },
      interestedIn: {
        type: new GraphQLList(GraphQLString)
      },
      city: {
        type: GraphQLString
      },
      profilePic: {
        type: GraphQLString
      },
      profilePicUrl: {
        type: GraphQLString,
        resolve(parentValue, args, req) {
          if (parentValue.profilePic !== "") {
            let sign =
              global.secrets.AWS_PROFILE_IMAGE_BUCKET_URL +
              parentValue.profilePic;
            return sign;
          }
          return "";
        }
      },
      lang: {
        type: GraphQLString
      },
      visible: {
        type: GraphQLBoolean
      },
      newMsgNotify: {
        type: GraphQLBoolean
      },
      emailNotify: {
        type: GraphQLBoolean
      },
      showOnline: {
        type: GraphQLBoolean
      },
      likedOnly: {
        type: GraphQLBoolean
      },
      vibrateNotify: {
        type: GraphQLBoolean
      },
      couplePartner: {
        type: GraphQLString
      },
      includeMsgs: {
        type: GraphQLBoolean
      },
      users: {
        type: new GraphQLList(UserType),
        resolve(parentValue, args) {
          return User.find({
            _id: parentValue.users
          });
        }
      },
      publicPhotos: {
        type: new GraphQLList(photoType)
      },
      privatePhotos: {
        type: new GraphQLList(photoType)
      },
      about: {
        type: GraphQLString
      },
      desires: {
        type: new GraphQLList(GraphQLString)
      },
      sexuality: {
        type: GraphQLString
      },
      lastActive: {
        type: GraphQLDateTime
      },
      password: {
        type: GraphQLString
      },
      ccLast4: {
        type: GraphQLString
      }
    };
  }
});
module.exports = SettingsType;
