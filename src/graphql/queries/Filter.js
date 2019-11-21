const GraphQL = require("graphql");
const auth = require("../../config/auth");
const { ObjectID } = require("mongodb");

const { GraphQLID, GraphQLNonNull } = GraphQL;

// import the Filter type we created
const FilterType = require("../types/Filter");

// import the Filter resolver we created
const FilterResolver = require("../resolvers/Filter");

module.exports = {
  filter: {
    type: FilterType,
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
        return FilterResolver.getByID(id);
      }
    }
  },
  getFilterByUserID: {
    type: FilterType,
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
        return FilterResolver.getByUserID(id, req);
      }
    }
  }
};
