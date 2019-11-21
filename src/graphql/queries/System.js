const GraphQL = require("graphql");
const { GraphQLString, GraphQLNonNull } = GraphQL;
const { demoCountsType } = require("../types/Generic");
const SystemResolver = require("../resolvers/System");
const auth = require("../../config/auth");

module.exports = {
  version: {
    type: GraphQLString,
    resolve(parentValue, {}) {
      const config = require("../../config/config");
      // return config.appVersion;
      return process.env.NODE_ENV + " " + config.appVersion;
    }
  },
  getFullLink: {
    type: GraphQLString,
    args: {
      shortenedUrl: {
        type: new GraphQLNonNull(GraphQLString)
      }
    },
    resolve(parentValue, { shortenedUrl }, req) {
      return SystemResolver.getFullLink(shortenedUrl);
    }
  },
  setFullLink: {
    type: GraphQLString,
    args: {
      url: {
        type: new GraphQLNonNull(GraphQLString)
      }
    },
    resolve(parentValue, { url }, req) {
      if (auth.isAuthenticated(req)) {
        return SystemResolver.setFullLink(url);
      }
    }
  },
  getDemoCounts: {
    type: demoCountsType,
    resolve() {
      return SystemResolver.getDemoCounts();
    }
  },
  hiccup: {
    type: GraphQLString,
    resolve() {
      SystemResolver.hiccup();
      return "done";
    }
  }
};
