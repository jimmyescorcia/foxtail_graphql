const GraphQL = require("graphql");
const moment = require("moment");
const auth = require("../../config/auth");
const { ObjectID } = require("mongodb");

const {
  GraphQLList,
  GraphQLID,
  GraphQLInt,
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLString,
  GraphQLBoolean
} = GraphQL;

// import the user type we created
const UserType = require("../types/User");
const SettingsType = require("../types/Settings");
const {
  userInfoType,
  notificationType,
  overviewCountsType
} = require("../types/Generic");

// import the user resolver we created
const UserResolver = require("../resolvers/User");
const ProfileResolver = require("../resolvers/Profile");
const SystemResolver = require("../resolvers/System");

module.exports = {
  user: {
    type: UserType,
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
        return UserResolver.getByID(id);
      }
    }
  },

  version: {
    type: GraphQLString,
    resolve(parentValue, {}) {
      const config = require("../../config/config");
      return config.appVersion;
    }
  },

  currentuser: {
    type: userInfoType,
    async resolve(parentValue, args, req) {
      if (await auth.isAuthenticated(req)) {
        //TODO: Find a way to reduce these calls
        let announcement = null;
        if (!req.user.online) {
          ProfileResolver.toggleOnline({ online: true, req });
        }

        if (
          !req.user.lastAnnounceDate ||
          moment(req.user.lastAnnounceDate).isBefore(Date.now(), "day")
        ) {
          announcement = await SystemResolver.getAnnouncement();
          req.user.lastAnnounceDate = Date.now();
          req.user.save();
        }

        if (
          !moment(req.user.activity.likesSent.date).isSame(Date.now(), "day") ||
          !moment(req.user.activity.msgsSent.date).isSame(Date.now(), "day")
        ) {
          req.user.activity.likesSent.count = 0;
          req.user.activity.likesSent.date = Date.now();
          req.user.activity.msgsSent.count = 0;
          req.user.activity.msgsSent.date = Date.now();
          req.user.save();
        }

        ProfileResolver.updateLastActive();
        return {
          userID: req.user._id,
          username: req.user.username,
          profileID: req.user.profileID,
          blackMember: req.user.blackMember,
          location: req.user.location,
          isProfileOK: req.user.isProfileOK,
          isEmailOK: req.user.isEmailOK,
          coupleProfileName: req.user.profileName,
          lang: req.user.lang,
          tours: req.user.tours,
          distanceMetric: req.user.distanceMetric,
          active: req.user.active,
          captchaReq: req.user.captchaReq,
          likesSent: req.user.activity.likesSent.count,
          msgsSent: req.user.activity.msgsSent.count,
          announcement
        };
      }
    }
  },

  getSettings: {
    type: SettingsType,
    resolve(parentValue, {}, req) {
      if (auth.isAuthenticated(req)) {
        return UserResolver.getSettings(req);
      }
    }
  },

  getCounts: {
    type: overviewCountsType,
    resolve(parentValue, {}, req) {
      if (auth.isAuthenticated(req)) {
        return UserResolver.getCounts({ req });
      }
    }
  },

  getNotifications: {
    type: new GraphQLObjectType({
      name: "NotficationListType",
      fields: {
        notifications: {
          type: new GraphQLList(notificationType)
        },
        total: {
          type: GraphQLInt
        }
      }
    }),
    args: {
      limit: {
        type: new GraphQLNonNull(GraphQLInt)
      },
      skip: {
        type: new GraphQLNonNull(GraphQLInt)
      }
    },
    async resolve(parentValue, { limit, skip }, req) {
      if (await auth.isAuthenticated(req)) {
        return await UserResolver.getNotifications({ limit, skip, req });
      }
    }
  },

  confirmEmail: {
    type: GraphQLBoolean,
    args: {
      token: {
        type: new GraphQLNonNull(GraphQLString)
      }
    },
    async resolve(parentValue, { token }) {
      return await UserResolver.confirmEmail({
        token
      });
    }
  }
};
