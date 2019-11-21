const _ = require("lodash");
const User = require("../../models/User");
const Admin = require("../../models/Admin");
const Flag = require("../../models/Flag");
const Profile = require("../../models/Profile");
const { clearHash } = require("../../utils/cache");
const moment = require("moment");

async function login({ phone }) {
  const admin = await Admin.findOne({ phone });
  try {
    if (!admin || !admin.active) {
      return new Error("Client: Phone number doesn`t exist in our system.");
    }

    const newTokens = [
      { access: "auth", token: await admin.generateAuthToken("auth") },
      { access: "refresh", token: await admin.generateAuthToken("refresh") }
    ];

    return newTokens;
  } catch (e) {
    throw new Error(e.message);
  }
}

async function create(data) {
  try {
    const { email, phone, name } = data;

    if (!phone) {
      throw new Error("Client: You must verify your phone number.");
    }

    if (!email) {
      throw new Error("Client: You must provide an email.");
    }

    if (!name) {
      throw new Error("Client: You must provide a user name.");
    }

    const existingAdmin = await Admin.findOne({
      phone
    });

    if (existingAdmin) {
      throw new Error("Client: This user already exisits.");
    }

    let admin = new Admin(data);

    const newTokens = [
      { access: "auth", token: await admin.generateAuthToken("auth") },
      { access: "refresh", token: await admin.generateAuthToken("refresh") }
    ];

    return newTokens;
  } catch (e) {
    throw new Error(e.message);
  }
}

//MARKETING
async function memberCounts({ country, req }) {
  try {
    //list of last 30 days
    //last 60
    //last 90
    const lastThirtyDays = [...new Array(30)].map((i, idx) =>
      moment()
        .startOf("day")
        .subtract(idx, "days")
        .toISOString(true)
    );

    const newSignups = await User.aggregate([
      {
        $match: {
          "location.country": country,
          createdAt: {
            $gte: new Date(moment().subtract(30, "days")),
            $lt: new Date()
          }
        }
      },
      {
        $group: {
          _id: { date: "$createdAt" },
          count: { $sum: 1 }
        }
      }
    ]);

    const newBlkSignups = await User.aggregate([
      {
        $match: {
          "location.country": country,
          "blackMember.active": true,
          createdAt: {
            $gte: new Date(moment().subtract(30, "days")),
            $lt: new Date()
          }
        }
      },
      {
        $group: {
          _id: { date: "$blackMember.signUpDate" },
          count: { $sum: 1 }
        }
      }
    ]);

    let signUpCounts = [];
    let blkSignUpCounts = [];
    let count;
    let blkcount;
    lastThirtyDays.forEach(day => {
      count = blkcount = 0;
      newSignups.forEach(el => {
        if (moment(day).isSame(el._id.date, "day")) {
          count = el.count;
          return;
        }
      });
      newBlkSignups.forEach(el => {
        if (moment(day).isSame(el._id.date, "day")) {
          blkcount = el.count;
          return;
        }
      });

      signUpCounts.push(count);
      blkSignUpCounts.push(blkcount);
    });
    return {
      days: lastThirtyDays.map(el => moment(el).format("MMM D")),
      signups: signUpCounts,
      blkSignups: blkSignUpCounts
    };
  } catch (e) {
    console.log(e.message);
    throw new Error(e.message);
  }
}

async function getPayments({ req }) {
  try {
    const admin = await Admin.findById(req.user._id);

    return admin.payInfo.lastPayments;
  } catch (e) {
    throw new Error(e.message);
  }
}

async function addPayment({ id, amount, type, acctNum, date }) {
  try {
    await Admin.findByIdAndUpdate(id, {
      $push: {
        "payInfo.lastPayments": {
          date,
          acctNum,
          type,
          amount
        }
      }
    });

    return true;
  } catch (e) {
    console.log(e.message);
    throw new Error(e.message);
  }
}

//MODERATOR
async function setVerification({ type, active, userID }) {
  try {
    const user = await User.findById(userID);
    let body;
    let name;
    switch (type) {
      case "photo":
        name = "Photo";
        if (active) {
          user.verifications.photoVer.active = true;
          body =
            "Your photo verification has been approved. Your account now has the Photo Verification flag. Thank You.";
        } else {
          user.verifications.photoVer = null;
          body =
            "Something was wrong with your photo verification. Please try again, in a well lite area and do the pose exactly like the photo using your devices camera.";
        }
        break;
      case "std":
        name = "STD Check";

        user.verifications.stdVer.active = active;
        if (active) {
          user.verifications.stdVer.active = true;
          body =
            "Your STD verification has been approved. Your account now has the STD Check Verification flag. Thank You.";
        } else {
          user.verifications.stdVer = null;
          body =
            "Something was wrong with your STD verification. Please try again, be sure to have your physician send a document to us at support@foxtailapp.com.";
        }
        break;
      case "acct":
        name = "Account";

        user.verifications.acctVer.active = active;
        if (active) {
          user.verifications.acctVer.active = true;
          body =
            "Your account review has been concluded. We are happy to welcome you back to Foxtail. Please abide by the rules from this point further to prevent permanent ban. Thank You.";
        } else {
          user.verifications.acctVer = null;
          body =
            "Your account review has been concluded. Unfortunately we aren't able to reactivate your account at this time.";
        }
        break;
      default:
        break;
    }

    const notification = {
      toUserIDs: [userID],
      type: "alert",
      body,
      title: "Verification"
    };

    await User.addNotification(notification);

    clearHash(userID);

    await user.save();
    return true;
  } catch (e) {
    throw new Error(e.message);
  }
}

async function getFlagsByType({ type, isAlert }) {
  try {
    let flags;
    if (type) {
      flags = await Flag.find({
        type,
        alert: isAlert
      });
    } else {
      flags = await Flag.find({ alert: isAlert });
    }

    if (!flags) {
      throw new Error("Client: None available.");
    }
    return flags;
  } catch (e) {
    throw new Error(e.message);
  }
}

async function toggleAlertFlag({ flagID }) {
  try {
    let flag = await Flag.findById(flagID);
    flag.alert = !flag.alert;
    flag.save();
    return true;
  } catch (e) {
    throw new Error(e.message);
  }
}

async function toggleActive({ userID }) {
  try {
    let user = await User.findById(userID);
    const setActive = !user.active;
    let profile = await Profile.findOne({
      userIDs: {
        $in: [userID]
      },
      active: true
    });
    profile.active = setActive;
    user.active = setActive;
    profile.save();
    user.save();
    clearHash(userID);
    clearHash(profile._id);
    return true;
  } catch (e) {
    throw new Error(e.message);
  }
}

async function toggleBlkActive({ userID }) {
  try {
    let user = await User.findById(userID);
    const setActive = !user.blackMember.active;
    let profile = await Profile.findOne({
      userIDs: {
        $in: [userID]
      },
      active: true
    });
    if (setActive) {
      profile.isBlackMember = setActive;
      user.blackMember.active = setActive;
      user.blackMember.signUpDate = Date.now();
    } else {
      profile.isBlackMember = setActive;
      user.blackMember.active = setActive;
      user.blackMember.signUpDate = null;
      user.blackMember.renewalDate = null;
      user.blackMember.cancelDate = Date.now();
    }

    profile.save();
    user.save();
    clearHash(userID);
    clearHash(profile._id);
    return true;
  } catch (e) {
    throw new Error(e.message);
  }
}

async function resolveFlag({ flagID, isValid }) {
  try {
    if (isValid) {
      await Flag.findByIdAndUpdate(flagID, {
        $set: {
          reviewed: true
        }
      });
    } else {
      await Flag.findByIdAndRemove(flagID);
    }
    return true;
  } catch (e) {
    throw new Error(e.message);
  }
}

async function admin_deleteEvent({ eventID, req }) {
  try {
    const event = await Event.findById({
      _id: eventID
    }).cache({ key: eventID });

    if (event) {
      if (event.ownerProfileID.toString() == req.user.profileID) {
        await Event.remove({
          _id: eventID
        });

        await Chat.findOneAndRemove({
          eventID
        });
      }

      clearHash(eventID);
      return true;
    }

    return false;
  } catch (e) {
    throw new Error(e.message);
  }
}

async function admin_deleteflag({ id }) {
  try {
    const flag = await Flag.findByIdAndRemove({
      _id: id
    });

    if (!flag) {
      return false;
    }

    return true;
  } catch (e) {
    throw new Error(e.message);
  }
}
module.exports = {
  login,
  create,
  memberCounts,
  setVerification,
  getFlagsByType,
  toggleAlertFlag,
  toggleActive,
  toggleBlkActive,
  getPayments,
  admin_deleteEvent,
  admin_deleteflag,
  addPayment
};
