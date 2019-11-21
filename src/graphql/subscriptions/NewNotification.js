// @flow

const { pubsub } = require("../../config/pubsub");
const { notificationType } = require("../types/Generic");
const _ = require("lodash");
const mongoose = require("mongoose");

const NOTICE_ADDED = "NOTICE_ADDED";

module.exports = {
  type: notificationType,
  args: {},
  subscribe: () => pubsub.asyncIterator(NOTICE_ADDED),
  async resolve(payload, {}, req, info) {
    if (!payload) {
      return;
    } else if (
      payload.notification.toMemberIDs &&
      payload.notification.toMemberIDs.indexOf(req.user.profileID.toString()) <
        0
    ) {
      return;
    } else if (
      payload.notification.toUserIDs &&
      payload.notification.toUserIDs.indexOf(req.user.id.toString()) < 0
    ) {
      return;
    }

    payload.notification.id = mongoose.Types.ObjectId();
    return payload.notification;
  }
};
