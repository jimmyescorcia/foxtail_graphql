// @flow

const { pubsub } = require("../../config/pubsub");
const MessageType = require("../types/Message");
const _ = require("lodash");
import * as Sentry from "@sentry/node";
const Chat = require("../../models/Chat");

const INBOX_MESSAGE_ADDED = "INBOX_MESSAGE_ADDED";

module.exports = {
  type: MessageType,
  subscribe: () => pubsub.asyncIterator(INBOX_MESSAGE_ADDED),
  async resolve(payload, {}, req) {
    if (!payload) {
      return;
    }

    try {
      if (
        _.includes(
          payload.message.participants,
          req.user.profileID.toString()
        ) ||
        _.includes(payload.message.invited, req.user.profileID.toString())
      ) {
        return payload.message;
      } else {
        return;
      }
    } catch (e) {
      Sentry.captureException(e);
      throw new Error(e);
    }
  }
};
