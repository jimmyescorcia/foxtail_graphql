const GraphQL = require("graphql");
const { GraphQLList, GraphQLString, GraphQLBoolean } = GraphQL;
const {
  countByDateType,
  adminInfoType,
  payInfoType
} = require("../types/Admin");
// import the user resolver we created
const AdminResolver = require("../resolvers/Admin");
const FlagType = require("../types/Flag");

module.exports = {
  memberCounts: {
    type: countByDateType,
    args: {
      country: {
        type: GraphQLString
      }
    },
    resolve(parentValue, { country }, req) {
      return AdminResolver.memberCounts({ country, req });
    }
  },

  getPayments: {
    type: new GraphQLList(payInfoType),
    resolve(parentValue, {}, req) {
      return AdminResolver.getPayments({ req });
    }
  },

  getFlagsByType: {
    type: new GraphQLList(FlagType),
    args: {
      type: {
        type: GraphQLString
      },
      isAlert: {
        type: GraphQLBoolean
      }
    },
    resolve(parentValue, args) {
      return AdminResolver.getFlagsByType(args);
    }
  },

  currentAdmin: {
    type: adminInfoType,
    async resolve(parentValue, args, req) {
      return {
        name: req.user.name,
        territories: req.user.territories
      };
    }
  }
};
