const Flag = require("../../models/Flag");
const User = require("../../models/User");
const Profile = require("../../models/Profile");
const Event = require("../../models/Event");
const Chat = require("../../models/Chat");
const { clearHash } = require("../../utils/cache");
const config = require("../../config/config");
const moment = require("moment");
import * as Sentry from "@sentry/node";

async function flagItem({ type, targetID, reason, req }) {
  try {
    const existFlag = await Flag.findOne({
      targetID,
      userID: req.user._id,
      type
    });

    if (existFlag) {
      throw new Error("Client: You may only flag this once!");
    }
    const flag = new Flag({
      type,
      targetID,
      reason,
      userID: req.user._id
    });

    await flag.save();

    switch (type) {
      case config.flagTypes.Chat:
        await Chat.findByIdAndUpdate(targetID, {
          $push: {
            flagIDs: flag._id
          }
        });
        break;
      case config.flagTypes.Event:
        await Event.findByIdAndUpdate(targetID, {
          $push: {
            flagIDs: flag._id
          }
        });
        break;
      case config.flagTypes.Profile:
        const profile = await Profile.findByIdAndUpdate(
          targetID,
          {
            $push: {
              flagIDs: flag._id
            }
          },
          {
            new: true
          }
        );
        profile.userIDs.forEach(async userID => {
          await User.findByIdAndUpdate(userID, {
            $push: {
              flagIDs: flag._id
            }
          });
        });
        break;
      case config.flagTypes.User:
        await User.findByIdAndUpdate(targetID, {
          $push: {
            flagIDs: flag._id
          }
        });
        break;
      default:
        throw new Error("Client: Sorry, not type selected!");
    }
    clearHash(targetID);
    return true;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function getByID(id) {
  try {
    const flag = await Flag.findOne({
      _id: id
    });

    if (!flag) {
      throw new Error("Client: Flag not found.");
    }

    return flag;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function cleanOldFlags() {
  try {
    const end = moment()
      .subtract(60, "days")
      .endOf("day");

    await Flag.deleteMany({
      createdAt: { $lte: end },
      alert: false,
      reviewed: true
    });

    return true;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

module.exports = {
  flagItem,
  getByID,
  cleanOldFlags
};
