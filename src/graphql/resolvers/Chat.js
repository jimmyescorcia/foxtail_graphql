import moment from "moment";
import { sendEmailToProfile } from "../../utils/email";
import * as Sentry from "@sentry/node";
const _ = require("lodash");
const Chat = require("../../models/Chat");
const Profile = require("../../models/Profile");
const validator = require("validator");

const { clearHash } = require("../../utils/cache");

async function sendMessage({ chatID, text, invitedProfile, instant, req }) {
  try {
    if (!req.user.isEmailOK) {
      throw new Error(
        "Client: Please confirm your email before contacting members."
      );
    }

    const date = Date.now();

    if (req.user.activity.msgsSent.count > 4) {
      if (moment(req.user.activity.msgsSent.date).isSame(date, "day")) {
        throw new Error("Client: Max Daily Messages Reached!");
      } else {
        req.user.activity.msgsSent.count = 0;
        req.user.activity.msgsSent.date = date;
      }
    }
    text.split(" ").forEach(word => {
      if (
        moment(req.user.activity.linksSent.today).isSame(date, "day") &&
        validator.isURL(word) &&
        req.user.activity.linksSent.count > 5 &&
        !moment(req.user.activity.linksSent.ignoreDate).isSame(date, "day")
      ) {
        req.user.captchaReq = true;
        throw new Error(
          "Client: Sent too many links today, please complete Captcha to continue."
        );
      } else if (validator.isURL(word)) {
        if (moment(req.user.activity.linksSent.today).isBefore(date, "day")) {
          req.user.activity.linksSent.count = 1;
          req.user.activity.linksSent.today = date;
        } else {
          req.user.activity.linksSent.count += 1;
        }
      }
    });

    if (chatID !== undefined) {
      await clearHash(chatID);
      //cache breaks this...WHY?...cached version not fully hydrated
      const chat = await Chat.findById(chatID).cache({ key: chatID });

      //Does Chat exist
      if (!chat) {
        throw new Error("Client: Chat not found.");
      }

      //Is the user trying to contact the other before they responded
      if (
        chat.participants.length === 1 &&
        chat.participants[0].toString() === req.user.profileID
      ) {
        throw new Error("Client: Please wait for user to respond.");
      }

      //Does user have access to chat or are they just invited
      if (
        !_.includes(
          chat.participants.map(item => item.toString()),
          req.user.profileID.toString()
        ) &&
        !_.includes(
          chat.invited.map(item => item.toString()),
          req.user.profileID.toString()
        )
      ) {
        throw new Error("Client: Chat is no longer available.");
      } else if (
        !_.includes(
          chat.participants.map(item => item.toString()),
          req.user.profileID.toString()
        )
      ) {
        chat.participants.unshift(req.user.profileID);
        chat.invited.remove(req.user.profileID);
      }

      chat.messages.push({
        fromUser: req.user._id,
        text,
        type: "msg",
        createdAt: date
      });

      const lastSeenIndex = chat.lastSeen.findIndex(
        el => el.userID.toString() === req.user._id.toString()
      );

      if (lastSeenIndex < 0) {
        chat.lastSeen.push({ userID: req.user._id, date });
      } else {
        chat.lastSeen[lastSeenIndex].date = date;
      }

      chat.isNew = false;
      await chat.save();
      req.user.save();
      await clearHash(chat._id);
      if (process.env.NODE_ENV !== "development") {
        await emailParticipants({
          chat,
          fromUsername: req.user.username,
          fromUserID: req.user._id
        });
      }
      const lastmessage = _.last(chat.messages);
      let lastmessage_chat = {
        id: lastmessage.id,
        text: lastmessage.text,
        fromUser: lastmessage.fromUser,
        type: "msg",
        createdAt: lastmessage.createdAt,
        chatID: chat._id,
        participants: chat.participants,
        invited: chat.invited
      };
      return lastmessage_chat;
    }

    if (_.includes(invitedProfile, req.user.profileID)) {
      throw new Error("Client: Cannot invite yourself!");
    }

    //Has this person already started a chat
    const oldchat = await Chat.findOne({
      $or: [
        {
          participants: req.user.profileID,
          invited: invitedProfile
        },
        { participants: { $all: [req.user.profileID, invitedProfile] } }
      ]
    });

    if (oldchat) {
      throw new Error("Client: You've already contacted this member.");
    }

    // Get fields
    const chatFields = {};

    // Check Validation
    // check if chat already exists by
    const toProfile = await Profile.findOne({
      _id: invitedProfile,
      active: true
    }).cache({ key: invitedProfile });

    if (!toProfile) {
      throw new Error("Client: User not found.");
    }

    const ProfileResolver = require("./Profile");
    ProfileResolver.likeProfile({
      toProfileID: invitedProfile,
      req,
      isDirect: true
    });

    if (req.user.blackMember.active && instant) {
      chatFields.participants = [req.user.profileID, invitedProfile];
      req.user.activity.msgsSent.count += 1;
      req.user.activity.msgsSent.date = date;
    } else {
      chatFields.participants = [req.user.profileID];
      chatFields.invited = [invitedProfile];
    }

    req.user.save();

    //Messages aren't pushing in for initial send.
    chatFields.messages = [
      {
        fromUser: req.user._id,
        text,
        type: "msg",
        createdAt: date
      }
    ];
    chatFields.ownerProfileID = req.user.profileID;
    chatFields.lastSeen = [{ userID: req.user._id, date }];

    const chat = await new Chat(chatFields).save();

    await emailParticipants({
      chat,
      fromUsername: req.user.username,
      fromUserID: req.user._id,
      toProfile
    });
    const lastmessage = _.last(chat.messages);
    let lastmessage_chat = {
      id: lastmessage.id,
      text: lastmessage.text,
      fromUser: lastmessage.fromUser,
      type: "msg",
      createdAt: lastmessage.createdAt,
      chatID: chat._id,
      participants: chat.participants,
      invited: chat.invited
    };
    return lastmessage_chat;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function emailParticipants({
  chat,
  fromUsername,
  fromUserID,
  toProfile
}) {
  try {
    if (chat.participants.length !== 1) {
      chat.participants.forEach(async id => {
        const profile = await Profile.findOne({
          _id: id,
          active: true
        }).cache({ key: id });
        if (profile) {
          await sendEmailToProfile({ profile, fromUsername, fromUserID });
        }
      });
    } else {
      if (toProfile) {
        await sendEmailToProfile({
          profile: toProfile,
          fromUsername,
          fromUserID
        });
      }
    }
  } catch (e) {
    console.error(e.message);
  }
}

async function getByID({ id, req }) {
  try {
    const chat = await Chat.findOne({
      _id: id
    }).cache({ key: id });

    if (!chat) {
      throw new Error("Client: Chat not found.");
    }

    if (!chat.active) {
      throw new Error("Client: Chat no longer available.");
    }

    //Does user have access to chat or are they just invited
    if (
      !_.includes(
        chat.participants.map(item => item.toString()),
        req.user.profileID.toString()
      ) &&
      !_.includes(
        chat.invited.map(item => item.toString()),
        req.user.profileID.toString()
      )
    ) {
      throw new Error("Client: Chat is no longer available.");
    }

    return chat;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function getMessages({ chatID, cursor, limit, req }) {
  try {
    const chat = await Chat.findById(chatID).cache({ key: chatID });
    if (!chat) {
      throw new Error("Client: Chat not found.");
    }
    if (!chat.active) {
      throw new Error("Client: Chat no longer available.");
    }

    if (chat.participants === undefined) {
      throw new Error("Client: Chat room closed.");
    }

    //Mark seen
    const lastSeenIndex = chat.lastSeen.findIndex(
      user => user.userID.toString() === req.user._id.toString()
    );

    if (lastSeenIndex < 0) {
      await chat.updateOne({
        $push: { lastSeen: { userID: req.user._id, date: Date.now() } }
      });
    } else {
      await Chat.updateOne(
        { _id: chatID, "lastSeen.userID": req.user._id },
        { $set: { "lastSeen.$.date": Date.now() } }
      );
    }

    if (chat.messages.length === 0) {
      return chat;
    }

    if (
      chat.participants.indexOf(req.user.profileID) < 0 &&
      chat.invited.indexOf(req.user.profileID) < 0
    ) {
      throw new Error("Client: Chat is no longer available.");
    }

    if (limit) {
      const messages =
        cursor !== null
          ? await _.take(
              _.filter(
                _.orderBy(chat.messages, ["createdAt"], ["desc"]),
                ({ createdAt }) =>
                  new Date(createdAt).getTime() < new Date(cursor).getTime()
              ),
              limit
            )
          : await _.take(
              _.orderBy(chat.messages, ["createdAt"], ["desc"]),
              limit
            );

      chat.messages = messages === null ? [] : messages;
    }

    return chat;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function removeSelf({ chatID, req }) {
  const removeMsg = {
    text: req.user.username,
    type: "left"
  };
  const chat = await Chat.findOneAndUpdate(
    {
      _id: chatID,
      eventID: { $exists: false }
    },
    {
      $pull: {
        participants: req.user.profileID,
        invited: req.user.profileID
      },
      $push: { messages: removeMsg }
    },
    {
      new: true
    }
  );

  if (!chat) {
    return null;
  }

  if (chat.participants.length == 0) {
    await Chat.remove({
      _id: chatID
    });
  }
  clearHash(chatID);
  return removeMsg;
}

async function inviteProfile({ chatID, invitedProfiles, req }) {
  try {
    // Check Validation
    const chat = await Chat.findOne({
      _id: chatID
    }).cache({ key: chatID });
    if (!chat) {
      throw new Error("Client: Chat not found.");
    }

    if (!chat.active) {
      throw new Error("Client: Chat no longer available.");
    }

    if (chat.participants.indexOf(req.user.profileID) < 0) {
      throw new Error("Client: Only Participants can invite others.");
    }

    invitedProfiles = await invitedProfiles.reduce(function(result, profile) {
      if (
        chat.invited.indexOf(profile) < 0 &&
        chat.participants.indexOf(profile) < 0
      ) {
        chat.invited.unshift(profile);
        result.push(profile);
      }
      return result;
    }, []);

    if (invitedProfiles.length === 0) {
      //User has already been invited or are participants
      return invitedProfiles;
    }

    //Need fake id for item key in frontend
    const notification = {
      targetID: chatID,
      toMemberIDs: invitedProfiles,
      type: "chat",
      text: "has invited you to chat",
      fromUserID: req.user._id,
      fromUsername: req.user.username,
      date: new Date()
    };

    await Profile.addNotification(notification);

    await invitedProfiles.forEach(async id => {
      const profile = await Profile.findOne({ _id: id, active: true }).cache({
        key: id
      });
      await sendEmailToProfile({
        profile,
        fromUserID: req.user._id,
        fromUsername: req.user.username,
        isChatInvite: true
      });
    });
    chat.isNew = false;
    await chat.save();
    clearHash(chatID);

    return notification;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function removeProfiles({ chatID, removedProfiles, req }) {
  try {
    const chat = await Chat.findOne({
      _id: chatID
    }).cache({ key: chatID });

    if (!chat) {
      throw new Error("Client: Chat not found.");
    }

    if (!chat.active) {
      throw new Error("Client: Chat no longer available.");
    }

    if (chat.ownerProfileID.toString() != req.user.profileID) {
      throw new Error("Client: Only the Owner can remove members.");
    }

    if (removedProfiles.indexOf(chat.ownerProfileID.toString()) > -1) {
      throw new Error("Client: Can't remove the owner!");
    }

    removedProfiles = await removedProfiles.reduce(async function(
      result,
      profile
    ) {
      if (
        chat.invited.indexOf(profile) > -1 ||
        chat.participants.indexOf(profile) > -1
      ) {
        await chat.updateOne({
          $pull: {
            participants: {
              $in: profile
            },
            invited: {
              $in: profile
            }
          },
          $push: {
            blocked: profile
          }
        });
        result.push(profile);
      }
      return result;
    },
    []);

    if (removedProfiles.length === 0) {
      return false;
    }

    await Profile.removeNotification({
      removeMemberIDs: removedProfiles,
      type: "chat",
      targetID: chatID
    });

    clearHash(chatID);
    return true;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function getInbox({ limit, skip, req }) {
  try {
    let lastMessages = [];

    let chats = await Chat.find(
      {
        $and: [
          {
            $or: [
              { participants: req.user.profileID },
              { invited: req.user.profileID }
            ],
            eventID: { $exists: false },
            active: true
          }
        ]
      },
      {
        messages: 1,
        id: 1,
        participants: 1,
        invited: 1,
        lastSeen: 1,
        createdAt: 1
      },
      { skip, limit }
    ).sort("-updatedAt");
    if (chats.length === 0) {
      return [];
    }

    chats = await chats.reduce(function(result, chat) {
      if (
        chat.participants[0].toString() === req.user.profileID.toString() &&
        chat.participants.length === 1
      ) {
        return result;
      } else {
        result.push(chat);
      }

      return result;
    }, []);

    await Promise.all(
      _.map(chats, async function(value) {
        let lastmessage = _.last(value.messages);
        if (value.messages.length > 0) {
          if (lastmessage.type === "alert" || lastmessage.type === "left") {
            let lastmessage_chat = {
              text: lastmessage.text,
              createdAt: lastmessage.createdAt,
              type: lastmessage.type,
              chatID: value._id,
              participants: value.participants,
              invited: value.invited
            };
            lastMessages.push(lastmessage_chat);
            return;
          } else {
            let otherUser = null;
            if (lastmessage.fromUser.toString() === req.user.id) {
              otherUser = _.first(
                _.filter(value.messages, el => {
                  if (el.fromUser) {
                    el.fromUser.toString() !== req.user.id;
                  }
                })
              );
            }

            let lastmessage_chat = {
              id: lastmessage._id,
              text: lastmessage.text,
              fromUser: otherUser ? otherUser.fromUser : lastmessage.fromUser,
              createdAt: lastmessage.createdAt,
              type: lastmessage.type,
              chatID: value._id,
              participants: value.participants,
              invited: value.invited
            };

            lastMessages.push(lastmessage_chat);
          }
        } else {
          let otherMember = value.participants.filter(
            el => el.toString() !== req.user.profileID.toString()
          );

          let lastmessage_chat = {
            id: value._id,
            text: lastmessage ? lastmessage.text : "",
            fromProfile: otherMember[0],
            createdAt: value.createdAt,
            chatID: value._id,
            participants: value.participants,
            invited: value.invited,
            type: lastmessage ? lastmessage.type : "new"
          };
          lastMessages.push(lastmessage_chat);
        }
      })
    );

    return lastMessages;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function getFriends({ req, skip, limit, chatID, isEvent }) {
  try {
    let friendsList = [];

    let participantList = await Chat.find(
      {
        participants: req.user.profileID,
        active: true,
        eventID: { $exists: false }
      },
      { participants: 1 }
    );

    if (participantList.length === 0) {
      return [];
    }
    let chat = [];
    if (chatID && isEvent) {
      const Event = require("../../models/Event");
      chat = await Event.find({ _id: chatID }, { participants: 1 });

      chat = _.flatten(chat.map(el => el.participants));
    } else if (chatID) {
      chat = await Chat.find({ _id: chatID }, { participants: 1 });

      chat = _.flatten(chat.map(el => el.participants));
    }

    await Promise.all(
      _.map(participantList, async function(value) {
        if (value.participants.length !== 0) {
          let participants = await Profile.find(
            {
              _id: {
                $in: value.participants,
                $ne: req.user.profileID,
                $nin: chat
              },
              active: true
            },
            { id: 1, profilePic: 1, profileName: 1 }
          );
          friendsList.push(...participants);
        }
      })
    );

    friendsList = _.uniqBy(friendsList, friend => friend._id.toString());
    friendsList = friendsList.slice(skip, friendsList.length);
    friendsList = _.take(friendsList, limit);

    return friendsList;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function readChat({ chatID, req }) {
  try {
    await getMessages({ chatID, req });
    return chatID;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

module.exports = {
  sendMessage,
  getMessages,
  removeSelf,
  inviteProfile,
  removeProfiles,
  getByID,
  getInbox,
  getFriends,
  readChat
};
