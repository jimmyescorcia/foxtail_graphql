const GraphQL = require("graphql");
const auth = require("../../config/auth");
const { ObjectID } = require("mongodb");

const {
  GraphQLString,
  GraphQLList,
  GraphQLInt,
  GraphQLFloat,
  GraphQLID,
  GraphQLNonNull
} = GraphQL;

// import the Profile type we created
const ProfileType = require("../types/Profile");

// import the Profile resolver we created
const ProfileResolver = require("../resolvers/Profile");

const { searchProfileResType } = require("../types/Generic");

module.exports = {
  profile: {
    type: ProfileType,
    args: {
      id: {
        type: new GraphQLNonNull(GraphQLID)
      }
    },
    resolve(parentValue, { id }, req) {
      if (auth.isAuthenticated(req)) {
        if (!ObjectID.isValid(id)) {
          throw new Error("Client: ID Invalid.");
        }
        return ProfileResolver.getByID(id, req);
      }
    }
  },
  getMyProfile: {
    type: ProfileType,
    resolve(parentValue, {}, req) {
      if (auth.isAuthenticated(req)) {
        return ProfileResolver.getMyProfile(req);
      }
    }
  },
  generateCode: {
    type: GraphQLString,
    resolve(parentValue, {}, req) {
      if (auth.isAuthenticated(req)) {
        return ProfileResolver.generateCode(req);
      }
    }
  },
  testCall: {
    type: GraphQLString,
    resolve(parentValue, {}, req) {
      if (
        process.env.NODE_ENV === "development" ||
        process.env.NODE_ENV === "staging"
      ) {
        return ProfileResolver.testCall({ req });
      }
    }
  },
  searchProfiles: {
    type: searchProfileResType,
    args: {
      limit: { type: new GraphQLNonNull(GraphQLInt) },
      skip: { type: new GraphQLNonNull(GraphQLInt) },
      long: { type: new GraphQLNonNull(GraphQLFloat) },
      lat: { type: new GraphQLNonNull(GraphQLFloat) },
      distance: { type: new GraphQLNonNull(GraphQLInt) },
      ageRange: { type: new GraphQLNonNull(new GraphQLList(GraphQLInt)) },
      interestedIn: { type: new GraphQLNonNull(new GraphQLList(GraphQLString)) }
    },
    resolve(
      parentValue,
      { long, lat, distance, ageRange, interestedIn, limit, skip },
      req
    ) {
      if (auth.isAuthenticated(req)) {
        return ProfileResolver.searchProfiles({
          long,
          lat,
          distance,
          ageRange,
          interestedIn,
          req,
          limit,
          skip
        });
      }
    }
  }
};
