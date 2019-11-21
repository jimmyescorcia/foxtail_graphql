const GraphQL = require("graphql");
const auth = require("../../config/auth");

const { GraphQLNonNull, GraphQLString, GraphQLID, GraphQLBoolean } = GraphQL;

// lets import our Profile type
const { s3PayloadType, linkType } = require("../types/Generic");

// lets import our Profile resolver
const ProfileResolver = require("../resolvers/Profile");

module.exports = {
  linkProfile: {
    type: linkType,
    args: {
      code: {
        type: new GraphQLNonNull(GraphQLString)
      }
    },
    resolve(parentValue, { code }, req) {
      if (auth.isAuthenticated(req)) {
        return ProfileResolver.linkProfile({
          code,
          req
        });
      }
    }
  },

  likeProfile: {
    type: GraphQLString,
    args: {
      toProfileID: {
        type: new GraphQLNonNull(GraphQLID)
      }
    },
    resolve(parentValue, { toProfileID }, req) {
      if (auth.isAuthenticated(req)) {
        return ProfileResolver.likeProfile({
          toProfileID,
          req
        });
      }
    }
  },

  unlinkProfile: {
    type: GraphQLBoolean,
    resolve(parentValue, {}, req) {
      if (auth.isAuthenticated(req)) {
        return ProfileResolver.unlinkProfile({
          profileID: req.user.profileID
        });
      }
    }
  },

  signS3: {
    type: s3PayloadType,
    args: {
      filename: {
        type: new GraphQLNonNull(GraphQLString)
      },
      filetype: {
        type: new GraphQLNonNull(GraphQLString)
      }
    },
    resolve(parentValue, { filename, filetype }, req) {
      if (auth.isAuthenticated(req)) {
        return ProfileResolver.signS3({
          filename,
          filetype,
          req
        });
      }
    }
  },

  rejectProfile: {
    type: GraphQLBoolean,
    args: {
      rejectedProfileID: {
        type: new GraphQLNonNull(GraphQLID)
      }
    },
    resolve(parentValue, { rejectedProfileID }, req) {
      if (auth.isAuthenticated(req)) {
        return ProfileResolver.rejectProfile({
          rejectedProfileID,
          req
        });
      }
    }
  },

  blockProfile: {
    type: GraphQLBoolean,
    args: {
      blockedProfileID: {
        type: new GraphQLNonNull(GraphQLID)
      }
    },
    resolve(parentValue, { blockedProfileID }, req) {
      if (auth.isAuthenticated(req)) {
        return ProfileResolver.blockProfile({
          blockedProfileID,
          req
        });
      }
    }
  },

  toggleOnline: {
    type: GraphQLBoolean,
    args: {
      online: {
        type: new GraphQLNonNull(GraphQLBoolean)
      }
    },
    resolve(parentValue, { online }, req) {
      if (auth.isAuthenticated(req)) {
        return ProfileResolver.toggleOnline({
          online,
          req
        });
      }
    }
  }

  // sendDailyUpdates: {
  //   type: GraphQLBoolean,
  //   args: {},
  //   resolve(parentValue, {}, req) {
  //     return ProfileResolver.sendDailyUpdates();
  //   }
  // }
};
