const _ = require("lodash");
const shortid = require("shortid");
const moment = require("moment");
import * as Sentry from "@sentry/node";
const Profile = require("../../models/Profile");
const User = require("../../models/User");
const Chat = require("../../models/Chat");
const Event = require("../../models/Event");
const Filter = require("../../models/Filter");
const { clearHash } = require("../../utils/cache");
const { s3SignUrl, getSignedUrl } = require("../../middlewares/uploadPicture");
const { sexOptions } = require("../../config/listOptions");
const {
  emailDailyUpdates,
  sendCoupleUnLink,
  sendCoupleLink
} = require("../../utils/email");
import { pubsub } from "../../config/pubsub";
const NOTICE_ADDED = "NOTICE_ADDED";
const INBOX_MESSAGE_ADDED = "INBOX_MESSAGE_ADDED";

const LIMIT_FEATURED = 4;

async function createProfile({ user, interestedIn, user2 = null }) {
  try {
    // Get fields
    const profileFields = {
      interestedIn
    };
    // Create and Save Profile
    if (user2 === null) {
      profileFields.userIDs = [user.id];
      profileFields.userDOBs = [user.dob];
      profileFields.gender = user.gender;
      profileFields.profileName = user.username;
    } else {
      profileFields.userIDs = [user.id, user2.id];
      profileFields.userDOBs = [user.dob, user2.dob];

      if (user.gender === "M") {
        if (user2.gender === "M") {
          profileFields.gender = "MM";
        } else if (user2.gender === "F") {
          profileFields.gender = "MF";
        } else {
          profileFields.gender = "MI";
        }
      } else if (user.gender === "F") {
        if (user2.gender === "M") {
          profileFields.gender = "MF";
        } else if (user2.gender === "F") {
          profileFields.gender = "FF";
        } else {
          profileFields.gender = "FI";
        }
      } else {
        profileFields.gender = "II";
      }

      profileFields.profileName = user.username + " & " + user2.username;
    }

    profileFields.publicPhotos = [];
    profileFields.privatePhotos = [];
    profileFields.profilePic = "";
    profileFields.online = true;

    profileFields.loc = {};

    const newProfile = await new Profile(profileFields).save();

    Profile.ensureIndexes();
    return newProfile;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

//3 steps: (server)get signed url from amazon 2. (client) send file using url 3.
// on successful return from aws, save the url to the db
async function signS3({ filename, filetype }) {
  try {
    let s3payload = await s3SignUrl({ filename, filetype });
    if (!s3payload) {
      throw new Error("Invalid File Submitted");
    }
    s3payload.url = getSignedUrl(s3payload.key);
    return s3payload;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function likeProfile({ toProfileID, req, isDirect }) {
  try {
    if (toProfileID == req.user.profileID.toString()) {
      throw new Error("Client: Can't like yourself!");
    }

    const date = Date.now();

    //TODO:Test this and messages mac
    if (
      req.user.activity.likesSent.count > 24 &&
      !req.user.blackMember.active
    ) {
      if (moment(req.user.activity.likesSent.date).isSame(date, "day")) {
        throw new Error("Client: Max Daily Messages Reached!");
      } else {
        req.user.activity.likesSent.count = 0;
        req.user.activity.likesSent.date = date;
      }
    }

    // Check Validation
    const toProfile = await Profile.findById({
      _id: toProfileID
    }).cache({ key: toProfileID });

    if (!toProfile) {
      throw new Error("Client: User not found.");
    }

    if (!toProfile.active) {
      throw new Error("Client: Profile no longer available.");
    }

    const myProfile = await Profile.findById({
      _id: req.user.profileID
    }).cache({ key: req.user.profileID });

    //If like already found unlike profile
    if (myProfile.likeIDs.indexOf(toProfileID) > -1) {
      await Chat.findOneAndRemove({
        participants: [req.user.profileID, toProfile.id],
        ownerProfileID: req.user.profileID
      });
      req.user.activity.likesSent.count -= 1;
      myProfile.likeIDs = _.filter(
        myProfile.likeIDs,
        likeID => likeID.toString() !== toProfileID
      );
      myProfile.isNew = false;
      await myProfile.save();
      await req.user.save();
      clearHash(req.user.profileID);

      await Profile.findByIdAndUpdate(toProfileID, {
        $inc: { "likesToday.count": -1 }
      });

      clearHash(toProfileID);
      return "unlike";
    } else {
      myProfile.likeIDs.unshift(toProfileID);
      req.user.activity.likesSent.count += 1;
      req.user.activity.likesSent.date = date;
      myProfile.isNew = false;
      await req.user.save();
      await myProfile.save();
      await Profile.findByIdAndUpdate(toProfileID, {
        $set: {
          "likesToday.lastUpdate": date,
          "likesToday.count": toProfile.likesToday.count + 1
        }
      });
      clearHash(toProfileID);
      clearHash(req.user.profileID);

      if (!isDirect) {
        if (toProfile.likeIDs.indexOf(req.user.profileID) > -1) {
          const chat = new Chat({
            participants: [req.user.profileID, toProfile],
            ownerProfileID: req.user.profileID
          });
          chat.save();
          await pubsub.publish(INBOX_MESSAGE_ADDED, {
            message: {
              fromUser: req.user._id,
              text: "New Match!",
              type: "new",
              createdAt: date,
              chatID: chat._id,
              participants: [req.user.profileID, toProfile.id],
              invited: []
            }
          });

          return chat._id;
        }
      }
      return "like";
    }
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function linkProfile({ code, req }) {
  try {
    if (!shortid.isValid(code)) {
      throw new Error("Client: Invalid code!");
    }

    const theirProfile = await Profile.findOne({
      "cplLink.linkCode": code,
      active: true
    });
    if (!theirProfile) {
      throw new Error("Client: Profile not found");
    }
    if (!theirProfile.active) {
      throw new Error("Client: Profile no longer available");
    }
    if (theirProfile.id === req.user.profileID.toString()) {
      throw new Error("Client: This is your code. Send it to your partner.");
    }

    if (moment(theirProfile.cplLink.expiration).isBefore(Date.now())) {
      throw new Error(
        "Client: This code has expired, please request another or send yours."
      );
    }

    const myProfile = await Profile.findById(req.user.profileID);

    if (theirProfile.userIDs.length > 1 || myProfile.userIDs.length > 1) {
      throw new Error("Client: Too many users on this profile!");
    }

    //Have to get username and dont want to double call find Ueer
    const theirUser = await User.findById(theirProfile.userIDs[0]);

    let newProfile;

    await createProfile({
      user: req.user,
      interestedIn: _.merge(theirProfile.interestedIn, myProfile.interestedIn),
      user2: theirUser
    })
      .then(function(profile) {
        newProfile = profile;
      })
      .catch(function(e) {
        Sentry.captureException(e);
        throw new Error(e.message);
      });

    theirProfile.active = false;
    theirProfile.cplLink.linkCode = "";
    theirProfile.save();
    clearHash(theirProfile._id);

    myProfile.active = false;
    myProfile.cplLink.linkCode = "";
    myProfile.save();
    clearHash(myProfile._id);

    await User.findByIdAndUpdate(req.user.id, {
      $set: {
        profileID: newProfile._id,
        isCouple: true,
        isProfileOK: false
      }
    });

    theirUser.isNew = false;
    theirUser.profileID = newProfile._id;
    theirUser.isCouple = true;
    theirUser.isProfileOK = true;
    theirUser.save();

    let toMigrate = [];
    if (theirProfile.cplLink.includeMsgs) {
      toMigrate.push(theirProfile._id);
    }
    if (myProfile.cplLink.includeMsgs) {
      toMigrate.push(myProfile._id);
    }

    migrateToNewProfile({
      profileIDs: [myProfile._id, theirProfile._id],
      okMigrate: toMigrate,
      newProfileID: newProfile._id,
      profileName: newProfile.profileName,
      userId: req.user.id
    });

    await User.addNotification({
      link: "/settings",
      toUserIDs: [req.user.id],
      type: "alert",
      name: theirProfile.profileName + " ",
      body:
        "and you have created a Couple Profile! Please complete your profile together. Enjoy!",
      title: "Couple's Profile Created",
      text: "Couple's Profile Created"
    });
    await pubsub.publish(NOTICE_ADDED, {
      notification: {
        link: "/settings",
        toUserIDs: [req.user.id],
        type: "alert",
        name: theirProfile.profileName + " ",
        body:
          "and you have created a Couple Profile! Please complete your profile together. Enjoy!",
        title: "Couple's Profile Created",
        text: "Couple's Profile Created"
      }
    });

    await User.addNotification({
      link: "/settings",
      toUserIDs: [theirUser.id],
      type: "alert",
      name: myProfile.profileName + " ",
      body:
        "and you have created a Couple Profile! Please complete your profile together. Enjoy!",
      title: "Couple's Profile Created",
      text: "Couple's Profile Created"
    });

    await pubsub.publish(NOTICE_ADDED, {
      notification: {
        link: "/settings",
        toUserIDs: [theirUser.id],
        type: "alert",
        name: myProfile.profileName + " ",
        body:
          "and you have created a Couple Profile! Please complete your profile together. Enjoy!",
        title: "Couple's Profile Created",
        text: "Couple's Profile Created"
      }
    });
    if (process.env.NODE_ENV !== "development") {
      sendCoupleLink({
        name: req.user.username,
        email: req.user.email,
        lang: req.user.lang,
        theirName: theirUser.username
      });
      sendCoupleLink({
        name: theirUser.username,
        email: theirUser.email,
        lang: theirUser.lang,
        theirName: req.user.username
      });
    }

    newProfile.userIDs.forEach(id => {
      clearHash(id);
    });

    return { profileID: newProfile._id, partnerName: theirUser.username };
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function migrateToNewProfile({
  profileIDs,
  okMigrate,
  newProfileID,
  profileName,
  userId
}) {
  await Chat.find(
    {
      participants: { $in: profileIDs }
    },
    (err, res) => {
      if (!res) {
        return;
      }
      res.forEach(chat => {
        chat.messages.push({
          text: profileName + " has formed a couple",
          type: "alert",
          fromUser: userId
        });
        chat.participants = [
          ...chat.participants.filter(
            x =>
              okMigrate
                .map(function(e) {
                  return e.toString();
                })
                .indexOf(x.toString()) < 0
          ),
          newProfileID
        ];

        chat.ownerProfileID =
          profileIDs
            .map(function(e) {
              return e.toString();
            })
            .indexOf(chat.ownerProfileID.toString()) < 0
            ? chat.ownerProfileID
            : newProfileID;

        clearHash(chat._id);
        chat.isNew = false;
        chat.save();
      });
    }
  );

  await Event.find(
    {
      participants: { $in: profileIDs }
    },
    (err, res) => {
      res.forEach(event => {
        event.participants = [
          ...event.participants.filter(
            x =>
              okMigrate
                .map(function(e) {
                  return e.toString();
                })
                .indexOf(x.toString()) < 0
          ),
          newProfileID
        ];
        event.ownerProfileID =
          profileIDs
            .map(function(e) {
              return e.toString();
            })
            .indexOf(event.ownerProfileID.toString()) < 0
            ? event.ownerProfileID
            : newProfileID;

        event.isNew = false;
        event.save();
      });
    }
  );
}

async function unlinkProfile({ profileID }) {
  try {
    const coupleProfile = await Profile.findById(profileID);
    if (!coupleProfile.userIDs[1]) {
      return true;
    }

    const user1 = await User.findById(coupleProfile.userIDs[0]);
    const user2 = await User.findById(coupleProfile.userIDs[1]);

    const user1OldProfile = await Profile.findOneAndUpdate(
      {
        userIDs: {
          $in: [user1._id],
          $nin: [user2._id]
        },
        active: false
      },
      {
        $set: {
          active: true,
          isBlackMember: user1.blackMember.active ? true : false
        }
      }
    );
    user1.profileID = user1OldProfile._id;
    user1.isCouple = false;
    user1.save();

    const user2OldProfile = await Profile.findOneAndUpdate(
      {
        userIDs: {
          $in: [user2._id],
          $nin: [user1._id]
        },
        active: false
      },
      {
        $set: {
          active: true,
          isBlackMember: user2.blackMember.active ? true : false
        }
      }
    );

    user2.profileID = user2OldProfile._id;
    user2.isCouple = false;
    user2.save();

    Chat.find(
      {
        participants: coupleProfile.id
      },
      (err, res) => {
        const chats = res;
        chats.forEach(chat => {
          chat.messages.push({
            text: coupleProfile.profileName,
            type: "left"
          });

          chat.participants = [
            ...chat.participants.filter(
              x => x.toString() !== coupleProfile.id.toString()
            )
          ];

          chat.ownerProfileID = chat.participants[0];

          if (chat.participants.length < 2) {
            chat.remove();
          } else {
            chat.isNew = false;
            chat.save();
          }
        });
      }
    );

    Event.find({ ownerProfileID: coupleProfile.id }, (err, res) => {
      res.forEach(event => {
        event.remove();
      });
    });

    coupleProfile.active = false;
    coupleProfile.save();
    clearHash(coupleProfile._id);

    if (coupleProfile.flagIDs.length === 0) {
      coupleProfile.remove();
    }

    const notification = {
      link: "/settings",
      toUserIDs: [user1._id, user2._id],
      type: "alert",
      body:
        "Your couple profile couple profile has been closed. Check your out your new profile on the settings page",
      title: "Couple's Profile Closed",
      text: "Couple's Profile Closed"
    };
    if (process.env.NODE_ENV !== "development") {
      sendCoupleUnLink({
        name: user1.username,
        email: user1.email,
        lang: user1.lang
      });
      sendCoupleUnLink({
        name: user2.username,
        email: user2.email,
        lang: user2.lang
      });
    }
    await pubsub.publish(NOTICE_ADDED, {
      notification
    });
    User.addNotification(notification);
    clearHash(user1._id);
    clearHash(user2._id);
    return true;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function generateCode(req) {
  try {
    const profile = await Profile.findById({
      _id: req.user.profileID
    });
    if (!profile) {
      throw new Error("Client: Profile not found!");
    }

    if (!profile.active) {
      throw new Error("Client: Profile no longer available.");
    }

    if (!profile.userIDs.length > 1) {
      throw new Error("Client: Profile already linked.");
    }
    if (
      profile.cplLink.linkCode &&
      moment(profile.cplLink.expiration).isAfter(Date.now())
    ) {
      return profile.cplLink.linkCode;
    }
    profile.cplLink.linkCode = await shortid.generate();
    profile.cplLink.expiration = moment(Date.now()).add(3, "days");
    await profile.save();
    clearHash(req.user.profileID);
    return profile.cplLink.linkCode;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function searchProfiles({
  long,
  lat,
  distance,
  ageRange,
  interestedIn,
  limit,
  skip,
  req
}) {
  try {
    //set current location
    await req.user.setLocation({ long, lat });

    const myProfile = await Profile.findByIdAndUpdate(req.user.profileID, {
      $set: {
        "loc.loc": {
          type: "Point",
          coordinates: [long, lat]
        }
      }
    });
    clearHash(req.user.profileID);

    //Must be visible to see profiles
    if (!myProfile.discoverySettings.visible && !req.user.blackMember.active) {
      return { profiles: [], featuredProfiles: [], message: "invisible" };
    }

    let doNotDisplayList = [];
    if (!_.isEmpty(myProfile.likeIDs)) {
      doNotDisplayList.unshift(
        ...myProfile.likeIDs.map(item => item.toString())
      );
    }

    //ADD MY CURRENT CHAT Friends
    const myChats = await Chat.find(
      {
        $and: [
          {
            $or: [
              {
                participants: req.user.profileID
              },
              {
                invited: req.user.profileID
              }
            ]
          },
          {
            active: true
          }
        ]
      },
      { ownerProfileID: 1, participants: 1 }
    );

    if (!_.isEmpty(myChats)) {
      const recieveMsgs = await myChats.reduce(function(result, chat) {
        //TODO: figure out how to hide already chating for couples and not chatting yet for singles
        if (chat.participants.length < 3) {
          result.push(...chat.participants);
        }

        return result;
      }, []);
      doNotDisplayList.unshift(...recieveMsgs.map(item => item.toString()));
    }

    const filter = await Filter.findById({
      _id: req.user.filterID
    }).cache({ key: req.user.filterID });

    if (filter) {
      if (!_.isEmpty(filter.rejected)) {
        doNotDisplayList.unshift(
          ...filter.rejected.map(item => item.toString())
        );
      }
      if (!_.isEmpty(filter.blocked)) {
        doNotDisplayList.unshift(
          ...filter.blocked.map(item => item.toString())
        );
      }
    }

    if (!_.isEmpty(doNotDisplayList)) {
      doNotDisplayList = _.uniqBy(doNotDisplayList, String);
    }

    if (distance === 100) {
      distance = 3959;
    }

    if (interestedIn.length === 0) {
      interestedIn = sexOptions;
    }

    const featuredProfiles = await Profile.find({
      $and: [
        {
          _id: {
            $ne: req.user.profileID,
            $nin: doNotDisplayList
          },
          "loc.loc": {
            $nearSphere: [long, lat],
            $maxDistance: distance / 3959
          },
          userDOBs: {
            $lt: moment().subtract(ageRange[0], "years"),
            $gt: moment().subtract(ageRange[1], "years")
          },
          gender: {
            $in: interestedIn
          },
          likeIDs: {
            $in: req.user.profileID
          },
          // desires: {
          //   $in: currentProfile.desires,
          // },
          active: true,
          "discoverySettings.visible": true,
          blockedProfiles: {
            $ne: req.user.profileID
          },
          about: { $exists: true, $ne: "" },
          profilePic: { $exists: true, $ne: "" },
          desires: { $exists: true, $ne: [] }
        }
      ]
    })
      .sort({
        "likesToday.count": -1,
        "discoverySettings.likedOnly": -1,
        lastActive: -1,
        online: -1,
        isBlackMember: -1
      })
      .limit(LIMIT_FEATURED);
    if (!_.isEmpty(featuredProfiles)) {
      doNotDisplayList.unshift(...featuredProfiles.map(item => item._id));
      doNotDisplayList = _.uniqBy(doNotDisplayList, String);
    }

    const profiles = await Profile.find({
      $and: [
        {
          _id: {
            $ne: req.user.profileID,
            $nin: doNotDisplayList
          },
          "loc.loc": {
            $nearSphere: [long, lat],
            $maxDistance: distance / 3959
          },
          userDOBs: {
            $lt: moment().subtract(ageRange[0], "years"),
            $gt: moment().subtract(ageRange[1], "years")
          },
          gender: {
            $in: interestedIn
          },
          // desires: {
          //   $in: currentProfile.desires,
          // },
          active: true,
          "discoverySettings.visible": true,
          "discoverySettings.likedOnly": false,
          blockedProfiles: {
            $ne: req.user.profileID
          },
          about: { $exists: true, $ne: "" },
          profilePic: { $exists: true, $ne: "" },
          desires: { $exists: true, $ne: [] }
        }
      ]
    })
      .sort({
        "likesToday.count": -1,
        lastActive: -1,
        online: -1,
        isBlackMember: -1
      })
      .limit(limit)
      .skip(skip);

    return { profiles, featuredProfiles };
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function rejectProfile({ rejectedProfileID, req }) {
  try {
    if (req.user.profileID.toString() === rejectedProfileID) {
      throw new Error("Client: Can't reject yourself!");
    }

    const filter = await Filter.findById({
      _id: req.user.filterID
    }).cache({ key: req.user.filterID });

    if (filter.rejected) {
      if (
        filter.rejected
          .map(item => item.profileID.toString())
          .indexOf(rejectedProfileID) > -1
      ) {
        throw new Error("Client: Profile has already been rejected.");
      }
    }
    // Add to rejected profile to array
    await filter.rejected.unshift({
      profileID: rejectedProfileID
    });

    filter.isNew = false;
    await filter.save();
    clearHash(req.user.filterID);
    return true;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function blockProfile({ blockedProfileID, req }) {
  try {
    const filter = await Filter.findById({
      _id: req.user.filterID
    }).cache({ key: req.user.filterID });

    if (filter.blocked) {
      if (filter.blocked.indexOf(blockedProfileID) > -1) {
        throw new Error("Client: Block Profile ID already found.");
      }
    }
    // Add to rejected user to array
    await filter.blocked.unshift(blockedProfileID);
    filter.isNew = false;
    await filter.save();

    //update profile for not showing when viewing
    await Profile.findByIdAndUpdate(req.user.profileID, {
      $push: {
        blockedProfileIDs: blockedProfileID
      }
    });
    clearHash(req.user.filterID);
    clearHash(req.user.profileID);
    return true;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function getByID(id, req) {
  try {
    const blockedProfiles = await Profile.findById(req.user.profileID, {
      blockedProfileIDs: 1
    });

    //block those from being seen who have been blocked
    if (blockedProfiles.blockedProfileIDs.indexOf(id) > -1) {
      return null;
    }

    const profile = await Profile.findOne({
      _id: id,
      active: true
    }).cache({ key: id });
    if (!profile) {
      throw new Error("Client: Profile not found");
    }
    if (
      profile.likeIDs.indexOf(req.user.profileID) < 0 &&
      req.user.profileID.toString() !== id
    ) {
      for (let i = 0; i < profile.privatePhotos.length; i++) {
        profile.privatePhotos[i].url = "private";
      }
    }

    const myprofile = await Profile.findById(req.user.profileID);

    profile.likedByMe = myprofile.likeIDs.indexOf(id) > -1;

    //ADD MY CURRENT CHAT Friends
    const myChats = await Chat.find(
      {
        $and: [
          {
            $or: [
              {
                participants: req.user.profileID
              },
              {
                invited: req.user.profileID
              }
            ]
          },
          {
            $or: [
              {
                participants: id
              },
              {
                invited: id
              }
            ]
          },
          {
            active: true
          }
        ]
      },
      { participants: 1, invited: 1 }
    );

    if (!_.isEmpty(myChats)) {
      const recieveMsgs = await myChats.reduce(function(result, chat) {
        if (chat.participants.length < 3) {
          chat.participants.forEach(el => result.push(el.toString()));
          chat.invited.forEach(el => result.push(el.toString()));
        }

        return result;
      }, []);

      profile.msgdByMe = recieveMsgs.indexOf(id) > -1;
    }

    return profile;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function getMyProfile(req) {
  try {
    const profile = await Profile.findById({
      _id: req.user.profileID
    }).cache({ key: req.user.profileID });

    if (!profile) {
      throw new Error("Client: Profile not found.");
    }

    if (!profile.active) {
      throw new Error("Client: Profile no longer available.");
    }

    clearHash(req.user.profileID);
    return profile;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function toggleOnline({ online, req }) {
  try {
    await User.updateOne({ _id: req.user._id }, { $set: { online } });
    await Profile.updateOne({ userIDs: req.user._id }, { $set: { online } });

    return true;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function updateLastActive({ req }) {
  try {
    await Profile.updateOne(
      { id: req.user.profileID },
      { $set: { lastActive: Date.now() } }
    );

    return true;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function sendDailyUpdates() {
  try {
    const start = moment().startOf("day");

    const likedProfiles = await Profile.find(
      {
        "likesToday.date": { $gte: start },
        "likesToday.lastUpdate": { $gte: start },
        "likesToday.count": { $gt: 0 }
      },
      {
        "likesToday.count": 1,
        id: 1
      }
    );

    const likedUsers = await likedProfiles.reduce(async (result, pro) => {
      const users = await User.find(
        {
          profileID: pro.id,
          active: true
        },
        {
          username: 1,
          "notificationRules.emailNotify": 1,
          lang: 1,
          email: 1
        }
      );
      users.forEach(user => {
        result.push({ user, likesCount: pro.likesToday.count });
      });
      await Profile.findByIdAndUpdate(pro.id, {
        $set: { "likesToday.lastUpdate": Date.now(), "likesToday.count": 0 }
      });
      return result;
    }, []);

    likedUsers.forEach(likeUserObj => {
      const { user, likesCount } = likeUserObj;

      if (user.notificationRules.emailNotify && likesCount > 0) {
        emailDailyUpdates({
          email: user.email,
          likesCount,
          userName: user.username,
          lang: user.lang
        });
      }
    });

    return true;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function testCall({ req }) {
  const creditcardHandler = require("../../utils/creditcardHandler");
  await creditcardHandler.createSubscription(res => console.log("RESPO", res));
  return;
}

module.exports = {
  createProfile,
  likeProfile,
  linkProfile,
  searchProfiles,
  generateCode,
  rejectProfile,
  blockProfile,
  getByID,
  getMyProfile,
  signS3,
  unlinkProfile,
  toggleOnline,
  sendDailyUpdates,
  updateLastActive,
  testCall
};
