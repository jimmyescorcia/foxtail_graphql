const Filter = require("../../models/Filter");
import * as Sentry from "@sentry/node";

async function getByID(id) {
  try {
    const filter = await Filter.findById({
      _id: id
    }).cache({ key: id });

    if (!filter) {
      throw new Error("Client: Filter not found.");
    }

    return filter;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function getByUserID(id) {
  try {
    const filter = await Filter.findOne({
      userID: id
    });

    if (!filter) {
      throw new Error("Client: Filter not found.");
    }

    return filter;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

module.exports = {
  getByID,
  getByUserID
};
