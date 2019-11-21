const GraphQL = require("graphql");
const auth = require("../../config/auth");
const { ObjectID } = require("mongodb");

const { GraphQLID, GraphQLNonNull } = GraphQL;

// import the Flag type we created
const FlagType = require("../types/Flag");

// import the Flag resolver we created
const FlagResolver = require("../resolvers/Flag");

module.exports = {
  flag: {
    type: FlagType,
    args: {
      id: {
        type: new GraphQLNonNull(GraphQLID)
      }
    },
    resolve(parentValue, { id }) {
      if (auth.isAuthenticated(req)) {
        if (!ObjectID.isValid(id)) {
          throw new Error("Client: ID Invalid.");
        }
        return FlagResolver.getByID(id);
      }
    }
  }
};
