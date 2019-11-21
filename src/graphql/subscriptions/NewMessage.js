// @flow

const { pubsub } = require("../../config/pubsub");
const MessageType = require("../types/Message");
const Chat = require("../../models/Chat");
const _ = require("lodash");
const { clearHash } = require("../../utils/cache");
const auth = require("../../config/auth");
const graphql = require("graphql");
const { GraphQLID, GraphQLNonNull } = graphql;

const MESSAGE_ADDED = "MESSAGE_ADDED";

module.exports = {
  type: MessageType,
  args: {
    chatID: {
      type: new GraphQLNonNull(GraphQLID)
    }
  },
  subscribe: () => pubsub.asyncIterator(MESSAGE_ADDED),
  async resolve(payload, { chatID }, req) {
    if (auth.isAuthenticated(req)) {
      // Without this it does not work
      if (!payload || chatID !== payload.message.chatID) {
        return;
      }

      clearHash(chatID);
      return payload.message;
    }
  }
};
