const GraphQL = require("graphql");

const auth = require("../../config/auth");
import { pubsub } from "../../config/pubsub";
const MESSAGE_ADDED = "MESSAGE_ADDED";
const NOTICE_ADDED = "NOTICE_ADDED";
const INBOX_MESSAGE_ADDED = "INBOX_MESSAGE_ADDED";

const {
  GraphQLNonNull,
  GraphQLString,
  GraphQLID,
  GraphQLList,
  GraphQLBoolean,
  GraphQLInt
} = GraphQL;

// lets import our Chat type
const ChatType = require("../types/Chat");

// lets import our Chat resolver
const ChatResolver = require("../resolvers/Chat");

module.exports = {
  sendMessage: {
    type: GraphQLBoolean,
    args: {
      chatID: {
        type: GraphQLID
      },
      text: {
        type: new GraphQLNonNull(GraphQLString)
      },
      invitedProfile: {
        type: GraphQLID
      },
      instant: {
        type: GraphQLBoolean
      }
    },
    async resolve(parentValue, { chatID, text, invitedProfile, instant }, req) {
      if (auth.isAuthenticated(req)) {
        const message = await ChatResolver.sendMessage({
          chatID,
          text,
          invitedProfile,
          instant,
          req
        });
        await pubsub.publish(MESSAGE_ADDED, {
          message
        });

        await pubsub.publish(INBOX_MESSAGE_ADDED, {
          message
        });

        return true;
      }
    }
  },

  readChat: {
    type: GraphQLID,
    args: {
      chatID: {
        type: GraphQLID
      }
    },
    resolve(parentValue, { chatID }, req) {
      if (chatID === null) {
        return null;
      }
      if (auth.isAuthenticated(req)) {
        return ChatResolver.readChat({
          chatID,
          req
        });
      }
    }
  },

  removeSelf: {
    type: GraphQLBoolean,
    args: {
      chatID: {
        type: new GraphQLNonNull(GraphQLID)
      }
    },
    async resolve(parentValue, { chatID }, req) {
      if (auth.isAuthenticated(req)) {
        const message = await ChatResolver.removeSelf({
          chatID,
          req
        });
        await pubsub.publish(MESSAGE_ADDED, {
          message
        });
        return true;
      }
    }
  },

  inviteProfile: {
    type: GraphQLBoolean,
    args: {
      chatID: {
        type: new GraphQLNonNull(GraphQLID)
      },
      invitedProfiles: {
        type: new GraphQLNonNull(new GraphQLList(GraphQLID))
      }
    },
    async resolve(parentValue, { chatID, invitedProfiles }, req) {
      if (auth.isAuthenticated(req)) {
        const notification = await ChatResolver.inviteProfile({
          chatID,
          invitedProfiles,
          req
        });
        if (notification.length === 0) {
          //Already invited
          return true;
        }
        await pubsub.publish(NOTICE_ADDED, {
          notification
        });
        return true;
      }
    }
  },

  removeProfiles: {
    type: GraphQLBoolean,
    args: {
      chatID: {
        type: new GraphQLNonNull(GraphQLID)
      },
      removedProfiles: {
        type: new GraphQLNonNull(new GraphQLList(GraphQLID))
      }
    },
    resolve(parentValue, { chatID, removedProfiles }, req) {
      return ChatResolver.removeProfiles({
        chatID,
        removedProfiles,
        req
      });
    }
  }
};
