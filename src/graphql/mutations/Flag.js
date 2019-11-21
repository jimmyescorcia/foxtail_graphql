const GraphQL = require("graphql");

const auth = require("../../config/auth");

const { GraphQLNonNull, GraphQLString, GraphQLID, GraphQLBoolean } = GraphQL;

// lets import our Flag resolver
const FlagResolver = require("../resolvers/Flag");

module.exports = {
  flagItem: {
    type: GraphQLBoolean,
    args: {
      type: {
        type: new GraphQLNonNull(GraphQLString)
      },
      targetID: {
        type: new GraphQLNonNull(GraphQLID)
      },
      reason: {
        type: new GraphQLNonNull(GraphQLString)
      }
    },
    resolve(parentValue, { type, targetID, reason }, req) {
      if (auth.isAuthenticated(req)) {
        return FlagResolver.flagItem({
          type,
          targetID,
          reason,
          req
        });
      }
    }
  },

  admin_deleteflag: {
    type: GraphQLBoolean,
    args: {
      id: {
        type: new GraphQLNonNull(GraphQLID)
      }
    },
    resolve(parentValue, { id }, req) {
      if (auth.isAuthenticated(req)) {
        return FlagResolver.admin_deleteflag({
          id,
          req
        });
      }
    }
  }

  // cleanOldFlags: {
  //   type: GraphQLBoolean,
  //   args: {},
  //   resolve(parentValue, {}, req) {
  //     return FlagResolver.cleanOldFlags();
  //   }
  // }
};
