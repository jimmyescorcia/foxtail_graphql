const System = require("../../models/System");
const User = require("../../models/User");
const URL = require("../../models/URL");
const { clearHash } = require("../../utils/cache");
import * as Sentry from "@sentry/node";
const sanitize = require("sanitize-filename");

async function getDemoCounts() {
  try {
    const system = await System.findOne({}).cache({ key: "system" });
    const { malesNum, femalesNum, couplesNum } = system;
    return { malesNum, femalesNum, couplesNum };
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function updateDemoCounts() {
  try {
    const system = await System.findOne({}).cache({ key: "system" });

    system.malesNum = await User.countDocuments({ gender: "M" });
    system.femalesNum = await User.countDocuments({ gender: "F" });
    system.couplesNum = await User.countDocuments({ isCouple: true });
    system.totalNum = await User.estimatedDocumentCount();

    system.save();

    clearHash("system");
    return true;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}
async function setAnnouncement({ message, endDate }) {
  try {
    const system = await System.findOne({}).cache({ key: "system" });
    system.announcement = { message, endDate };
    await system.save();
    clearHash("system");

    return true;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}
async function removeAnnouncement() {
  try {
    const system = await System.findOne({}).cache({ key: "system" });
    system.announcement = { message: "" };
    await system.save();
    clearHash("system");

    return true;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}
async function getAnnouncement() {
  try {
    const system = await System.findOne({}).cache({ key: "system" });

    if (
      system.announcement.endDate > Date.now() &&
      system.announcement.message !== ""
    ) {
      return system.announcement.message;
    }

    return null;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function getFullLink(shortenedUrl) {
  try {
    if (!shortenedUrl) {
      throw new Error("Client: Please enter a valid url");
    }
    const match = await URL.findOneAndUpdate(
      { shortenedUrl },
      { $set: { lastUsed: Date.now() } }
    );
    if (!match) {
      throw new Error("Client: Please enter a valid url");
    }
    return match.fullUrl;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}
// Regex for URL validation
var urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;

function makeShortenedURL() {
  var text = "";
  var possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (var i = 0; i < 5; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  //NEED ? for query detection on frontend
  return "?" + text;
}

async function setFullLink(destination) {
  try {
    // Save all URL text after /new/ in this var
    var shortened_url_to_create = sanitize(destination);

    // If URL is valid, search for existing record in schema
    const url = await URL.findOne(
      { fullUrl: shortened_url_to_create },
      "-_id fullUrl shortenedUrl"
    );
    if (url) {
      return url.shortenedUrl;
    } else {
      // Create a 5 random letter and number string for the shortened URL
      var randomString = makeShortenedURL();
      // Check if randomString is already in use, if so, run once more
      URL.findOne({ shortenedUrl: randomString }, function(err, url) {
        if (err) return handleError(err);
        if (url) {
          randomString = makeShortenedURL();
        }
      });
      // Create new mongodb document for shortened URL
      var new_instance = new URL({
        fullUrl: shortened_url_to_create,
        shortenedUrl: randomString
      });
      new_instance.save();
      return randomString;
    }
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

function hiccup() {
  const Profile = require("../../models/Profile");
  Profile.ensureIndexes();
  const Event = require("../../models/Event");
  Event.ensureIndexes();
  updateDemoCounts();
}

module.exports = {
  updateDemoCounts,
  setAnnouncement,
  removeAnnouncement,
  getAnnouncement,
  getDemoCounts,
  getFullLink,
  setFullLink,
  hiccup
};
