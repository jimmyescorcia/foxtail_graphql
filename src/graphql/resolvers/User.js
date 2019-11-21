const _ = require("lodash");
const moment = require("moment");
import * as Sentry from "@sentry/node";
const validator = require("validator");
const { deleteFromS3 } = require("../../middlewares/uploadPicture");
const creditcardHandler = require("../../utils/creditcardHandler");
const {
  sendVerEMail,
  newPhoneAcct,
  sendPhoneReset,
  emailAccountOld,
  sendEmailToAdmin,
  sendBonusEmailToUser,
  sendBlkCancelToUser,
  sendPasswordReset,
  emailDeleted,
  sendWelcome
} = require("../../utils/email");
const { clearHash } = require("../../utils/cache");

const Profile = require("../../models/Profile");
const User = require("../../models/User");
const Filter = require("../../models/Filter");
const Chat = require("../../models/Chat");

async function login({ phone, password }) {
  const user = await User.findOne({ phone, active: true });
  try {
    if (!user || !user.active) {
      return new Error("Client: Phone number doesn`t exist in our system.");
    }

    if (user.password) {
      const passResult = await user.comparePassword(password);

      if (!passResult) {
        throw new Error("Client: Password is incorrect.");
      }
    } else if (password) {
      throw new Error("Client: Password is incorrect.");
    }

    if (user.flagIDs.length >= 3) {
      throw new Error(
        "Client: This account has been flagged for review. Please contact support at support@foxtailapp.com if this is a mistake."
      );
    }
    const newTokens = [
      { access: "auth", token: await user.generateAuthToken("auth") },
      { access: "refresh", token: await user.generateAuthToken("refresh") }
    ];

    return newTokens;
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    throw new Error(e.message);
  }
}

async function create(data) {
  try {
    const ProfileResolver = require("./Profile");
    const { email, phone, interestedIn, username } = data;
    let newTokens = [];
    if (!phone) {
      throw new Error("Client: You must verify your phone number.");
    }

    if (!email) {
      throw new Error("Client: You must provide an email.");
    }

    if (!username) {
      throw new Error("Client: You must provide a user name.");
    } else if (validator.isMobilePhone(username)) {
      throw new Error(
        "Client: Phone numbers are not allowed in your username."
      );
    } else if (validator.isEmail(username)) {
      throw new Error("Client: Emails are not allowed in your username.");
    } else if (validator.isURL(username)) {
      throw new Error("Client: Links are not allowed in your username.");
    }

    const existingUser = await User.findOne({
      phone,
      active: true
    });

    if (existingUser) {
      if (existingUser.flagIDs.length >= 3) {
        throw new Error(
          "Client: This account has been flagged for review. Please contact support at support@foxtailapp.com if this is a mistake."
        );
      }
      //NOTIFY OLD USER OF NEW ACCOUNT
      await newPhoneAcct({
        username: existingUser.username,
        email: existingUser.email,
        lang: existingUser.lang
      });

      await removeProfileFromSite(existingUser.profileID, existingUser._id);

      await deleteFilter(existingUser.filterID);

      //Returning user who has flags
      existingUser.active = true;
      existingUser.tokens = [];
      existingUser.verifications = { photo: false, std: false };
      existingUser.blackMember.active = false;
      existingUser.notificationRules = {
        newMsgNotify: true,
        vibrateNotify: false,
        emailNotify: true
      };
      existingUser.location = { city: "", country: "" };
      existingUser.isProfileOK = false;
      existingUser.isEmailOK = false;
      existingUser.sharedApp = false;
      existingUser.username = username;
      existingUser.notifications = [];
      existingUser.email = email;
      existingUser.tours = [];
      existingUser.verifications = {};
      existingUser.lang = data.lang || "en";
    }

    let user = existingUser ? existingUser : new User(data);

    const profile = await ProfileResolver.createProfile({
      user: user,
      interestedIn
    });

    const newFilter = new Filter({
      userID: user._id,
      profileID: profile._id
    });
    await newFilter.save();

    user.filterID = newFilter._id;
    user.profileID = profile._id;

    const oldNumUser = await User.findOne(
      {
        phone,
        active: false
      },
      { id: 1 }
    );

    if (!oldNumUser) {
      if (data.refer) {
        user.referredBy = data.refer;
        applyBonus({ id: data.refer, type: "User" });
      } else if (data.aff) {
        user.referredBy = data.aff;
      }
    }

    if (process.env.NODE_ENV === "development") {
      if (
        (user.email === "chat1@test.com" && user.phone === "3434455456") ||
        (user.email === "chat2@test.com" && user.phone === "54569009569")
      ) {
        user.blackMember.active = true;
        user.isEmailOK = true;
      }
    }

    user = await user.save();

    newTokens = [
      { access: "auth", token: await user.generateAuthToken("auth") },
      { access: "refresh", token: await user.generateAuthToken("refresh") }
    ];

    //SEND EMAIL CONFIRMATION

    if (process.env.NODE_ENV !== "development") {
      await sendWelcome({
        name: user.username,
        email: user.email,
        lang: user.lang
      });
      await sendVerEMail(email, user._id);
    }

    const notification = {
      toUserIDs: [user._id],
      type: "alert",
      body:
        "Please check your inbox to confirm your email before contacting members! *Check your spam, just in case",
      text: "Please Confirm Email to Chat"
    };

    await User.addNotification(notification);

    return newTokens;
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    throw new Error(e.message);
  }
}

async function applyBonus({ id, type }) {
  if (type === "User") {
    const user = await User.findById(id).cache({ key: id });
    if (user) {
      user.blackMember.active = true;
      const today = new Date();
      let renewal;
      if (
        user.blackMember.renewalDate &&
        user.blackMember.renewalDate > today
      ) {
        renewal = today.setDate(user.blackMember.renewalDate + 7).toString();
      } else {
        renewal = today.setDate(today.getDate() + 7).toString();
        user.blackMember.signUpDate = new Date();
      }
      user.blackMember.renewalDate = renewal;
      const formatedDate = moment()
        .add(1, "week")
        .format("LL")
        .toString();

      const notification = {
        toUserIDs: [user._id],
        type: "alert",
        body:
          "Congratulations! Someone has joined using your referal code. We've upgraded you to Black  Membership for 1 week (if you already have Black Membership, we've extended it by 1 week). We will add more weeks, the more you share Foxtail. Thanks for sharing :)",
        title: "Black Membership Referral Bonus Activated",
        text: "Black Membership Referral Bonus Activated"
      };

      await User.addNotification(notification);

      user.referrals += 1;

      clearHash(user._id);

      await user.save();

      if (user.notificationRules.emailNotify) {
        sendBonusEmailToUser({
          name: user.username,
          email: user.email,
          renewal: formatedDate,
          lang: user.lang
        });
      }
    }
  } else if (type === "Affiliate") {
    //TODO: finish affiliate process
    //const Admin
  }
}

//TODO:DELETE OR HIDE
async function testload(number, stock) {
  // if (
  //   process.env.NODE_ENV === "development" ||
  //   process.env.NODE_ENV === "staging"
  // ) {
  const shortid = require("shortid");
  var faker = require("faker");
  const ProfileResolver = await require("./Profile");
  const {
    desireOptions,
    biosOptions
  } = await require("../../config/listOptions");

  try {
    if (stock) {
      for (let i = 1; i <= 5; i++) {
        const data = {
          email: "cecilcjcarter@gmail.com",
          phone: i.toString(),
          interestedIn: ["M", "F"],
          username: "USER" + i,
          gender: "F",
          dob: "10/10/1987"
        };

        data.isEmailOK = true;
        data.isProfileOK = true;
        let user = new User(data);
        user.location = {
          city: "San Diego, California, US",
          country: "US",
          crds: {
            lat: 32.7581696,
            long: -117.1324928
          }
        };
        const profile = await ProfileResolver.createProfile({
          user: user,
          interestedIn: ["M", "F"]
        });

        profile.loc.loc.type = "Point";
        profile.loc.loc.coordinates = [-117.1324928, 32.7581696];
        profile.desires = ["cuddling"];
        profile.profilePic = "test.jpg";
        profile.about = "I'm a test user dont mind me";
        await profile.save();

        const newFilter = new Filter({
          userID: user._id,
          profileID: profile._id
        });
        await newFilter.save();

        user.filterID = newFilter._id;
        user.profileID = profile._id;
        user = await user.save();
      }
    } else {
      for (let i = 1; i <= number; i++) {
        const ProfileResolver = require("./Profile");
        const mths = [
          "01",
          "02",
          "03",
          "04",
          "05",
          "06",
          "07",
          "08",
          "09",
          "10",
          "11",
          "12"
        ];
        const years = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

        const data = {
          email: shortid.generate() + "@foxtail.com",
          phone: "000000000" + number,
          interestedIn: ["M", "F", "I", "MF", "MM", "FF"],
          username: await faker.name.firstName(1),
          gender: "F",
          dob:
            mths[Math.floor(Math.random() * mths.length)] +
            "/" +
            mths[Math.floor(Math.random() * mths.length)] +
            "/198" +
            years[Math.floor(Math.random() * years.length)]
        };
        const locsList = [
          {
            city: "New York",
            state: "New York",
            lat: "40.7127837",
            long: "-74.0059413"
          },
          {
            city: "Los Angeles",
            state: "California",
            lat: "34.0522342",
            long: "-118.2436849"
          },
          {
            city: "Chicago",
            state: "Illinois",
            lat: "41.8781136",
            long: "-87.6297982"
          },
          {
            city: "Houston",
            state: "Texas",
            lat: "29.7604267",
            long: "-95.3698028"
          },
          {
            city: "Philadelphia",
            state: "Pennsylvania",
            lat: "39.9525839",
            long: "-75.1652215"
          },
          {
            city: "Phoenix",
            state: "Arizona",
            lat: "33.4483771",
            long: "-112.0740373"
          },
          {
            city: "San Antonio",
            state: "Texas",
            lat: "29.4241219",
            long: "-98.4936282"
          },
          {
            city: "San Diego",
            state: "California",
            lat: "32.715738",
            long: "-117.1610838"
          },
          {
            city: "Dallas",
            state: "Texas",
            lat: "32.7766642",
            long: "-96.7969879"
          },
          {
            city: "San Jose",
            state: "California",
            lat: "37.3382082",
            long: "-121.8863286"
          }
        ];
        let selectedLoc =
          locsList[Math.floor(Math.random() * Math.floor(locsList.length))];
        data.isEmailOK = true;
        data.isProfileOK = true;

        let user = new User(data);
        selectedLoc.lat = (
          parseFloat(selectedLoc.lat) + parseFloat(Math.random().toFixed(3))
        ).toString();

        selectedLoc.long = (
          parseFloat(selectedLoc.long) + parseFloat(Math.random().toFixed(3))
        ).toString();

        user.location = {
          city: selectedLoc.city + ", " + selectedLoc.state + ", US",
          country: "US",
          crds: {
            lat: selectedLoc.lat,
            long: selectedLoc.long
          }
        };

        const profile = await ProfileResolver.createProfile({
          user: user,
          interestedIn: ["F", "M", "I", "MF", "FF", "MM", "II", "FI", "MI"]
        });

        profile.loc.loc.type = "Point";
        profile.loc.loc.coordinates = [selectedLoc.long, selectedLoc.lat];
        const d1 =
          desireOptions[Math.floor(Math.random() * desireOptions.length)];
        const d2 =
          desireOptions[Math.floor(Math.random() * desireOptions.length)];
        const d3 =
          desireOptions[Math.floor(Math.random() * desireOptions.length)];
        profile.desires = [d1, d2, d3];
        profile.profilePic = "pic (" + i + ").jpg";
        profile.publicPhotos = [{ url: "pic (" + i + ").jpg" }];
        const ab = biosOptions[Math.floor(Math.random() * biosOptions.length)];
        profile.about = ab;
        //profile.likeIDs = ["5d817ec6c4db9752385948aa"];

        await profile.save();

        const newFilter = new Filter({
          userID: user._id,
          profileID: profile._id
        });
        await newFilter.save();

        user.filterID = newFilter._id;
        user.profileID = profile._id;
        user = await user.save();
      }
    }
    return true;
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    throw new Error(e.message);
  }
  // }
}

async function removeUserFromChats(userId, profileID, profileName) {
  try {
    await Chat.deleteMany({
      $or: [
        {
          participants: {
            $in: [profileID],
            $size: 2
          }
        },
        {
          participants: {
            $in: [profileID],
            $size: 1
          }
        },
        { ownerProfileID: profileID }
      ]
    });

    await Chat.updateMany(
      {
        participants: {
          $in: [profileID]
        }
      },
      {
        $pull: {
          messages: { fromUser: userId }
        }
      }
    );

    await Chat.updateMany(
      {
        participants: {
          $in: [profileID]
        }
      },
      {
        $pull: {
          participants: {
            $in: [profileID]
          },
          invited: {
            $in: [profileID]
          }
        },
        $push: {
          messages: {
            fromUser: userId,
            type: "left",
            text: profileName
          }
        }
      }
    );

    return true;
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    throw new Error(e.message);
  }
}

async function removeProfileFromEvents(profileID) {
  const Event = require("../../models/Event");

  await Event.deleteMany({ ownerProfileID: profileID });

  await Event.updateMany(
    {
      $or: [
        {
          participants: {
            $in: [profileID]
          }
        },
        {
          invited: {
            $in: [profileID]
          }
        }
      ]
    },
    {
      $pull: {
        participants: {
          $in: [profileID]
        },
        invited: {
          $in: [profileID]
        }
      }
    }
  );

  return true;
}

async function updateUser({ username, email, phone, req }) {
  // Get fields
  const userFields = {
    username,
    email,
    phone
  };

  try {
    // Update
    const updatedUser = await User.findOneAndUpdate(
      {
        _id: req.user._id
      },
      {
        $set: userFields
      },
      {
        new: true
      }
    );
    clearHash(req.user._id);
    return updatedUser;
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    throw new Error(e.message);
  }
}

async function submitPhoto({ type, image, req }) {
  try {
    const user = req.user;
    if (user.verifications) {
      if (user.verifications.photoVer && user.verifications.photoVer.active) {
        throw new Error("Client: Photo verification already submitted.");
      } else if (
        user.verifications.stdVer &&
        user.verifications.stdVer.active
      ) {
        throw new Error("Client: STD verification already submitted.");
      } else if (
        user.verifications.acctVer &&
        user.verifications.acctVer.active
      ) {
        throw new Error("Client: Reconsideration already submitted.");
      }
    } else {
      user.verifications = {};
    }

    switch (type) {
      case "verify":
        user.verifications.photoVer.active = false;
        user.verifications.photoVer.image = image;
        break;
      case "std":
        user.verifications.stdVer.active = false;
        user.verifications.stdVer.image = image;
        break;
      case "acct":
        user.verifications.acctVer.active = false;
        user.verifications.acctVer.image = image;
        break;
      default:
        break;
    }

    await user.save();
    return true;
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    throw new Error(e.message);
  }
}

async function updateSettings(
  {
    distance,
    distanceMetric,
    ageRange,
    lang,
    interestedIn,
    city,
    country,
    lat,
    long,
    gender,
    username,
    email,
    phone,
    visible,
    newMsgNotify,
    emailNotify,
    showOnline,
    likedOnly,
    sexuality,
    vibrateNotify,
    about,
    desires,
    publicPhotoList,
    privatePhotoList,
    includeMsgs,
    profilePic,
    profileID
  },
  req
) {
  try {
    let myUser = req.user;

    if (
      !_.isUndefined(newMsgNotify) ||
      !_.isUndefined(vibrateNotify) ||
      !_.isUndefined(emailNotify) ||
      !_.isUndefined(city) ||
      !_.isUndefined(lang) ||
      !_.isUndefined(username) ||
      !_.isUndefined(gender) ||
      !_.isUndefined(email) ||
      !_.isUndefined(phone) ||
      !_.isUndefined(distanceMetric) ||
      !_.isUndefined(sexuality)
    ) {
      if (!_.isUndefined(city)) {
        if (myUser.blackMember.active || !myUser.location.lat) {
          myUser.location.city = city;
          myUser.location.country = country;

          if (!_.isUndefined(lat) && !_.isUndefined(long)) {
            myUser.location.crds = { lat, long };
          }
        } else {
          throw new Error("Client: Only Black Members can change locations.");
        }
      }

      if (!_.isUndefined(distanceMetric)) {
        myUser.distanceMetric = distanceMetric;
      }

      if (!_.isUndefined(lang)) {
        myUser.lang = lang;
      }
      if (!_.isUndefined(username)) {
        const lastDuration = moment.duration(
          moment(Date.now()).diff(moment(myUser.activity.nameChange))
        );
        const days = lastDuration.days();

        if (!myUser.activity.nameChange || days >= 30) {
          myUser.username = username;
          myUser.activity.nameChange = Date.now();
          await myUser.save();
          throw new Error("Client: Username has been updated.");
        } else {
          throw new Error(
            "Client: You can only change your username once every 30 days."
          );
        }
      }

      if (!_.isUndefined(sexuality)) {
        myUser.sexuality = sexuality;
      }

      if (!_.isUndefined(gender)) {
        if (!myUser.activity.genderChange) {
          myUser.gender = gender;
          myUser.activity.genderChange = true;
          await myUser.save();

          throw new Error("Client: Sex has been updated.");
        } else {
          throw new Error("Client: Can't change your sex more than once.");
        }
      }

      if (!_.isUndefined(email)) {
        myUser.email = email;
        myUser.isEmailOK = false;
        //SEND EMAIL CONFIRMATION
        sendVerEMail(email, myUser._id);
      }

      if (!_.isUndefined(phone)) {
        myUser.phone = phone;
      }

      if (!_.isUndefined(newMsgNotify)) {
        myUser.notificationRules.newMsgNotify = newMsgNotify;
      }

      if (!_.isUndefined(vibrateNotify)) {
        myUser.notificationRules.vibrateNotify = vibrateNotify;
      }

      if (!_.isUndefined(emailNotify)) {
        myUser.notificationRules.emailNotify = emailNotify;
      }

      myUser.isNew = false;
      await myUser.save();
      await clearHash(myUser._id);
    }

    if (
      !_.isUndefined(distance) ||
      !_.isUndefined(distanceMetric) ||
      !_.isUndefined(ageRange) ||
      !_.isUndefined(interestedIn)
    ) {
      let myFilter = await Filter.findById(myUser.filterID);

      if (!_.isUndefined(distance)) {
        myFilter.searchParams.distance = distance;
      }

      if (!_.isUndefined(distanceMetric)) {
        myFilter.searchParams.distanceMetric = distanceMetric;
      }

      if (!_.isUndefined(ageRange)) {
        myFilter.searchParams.ageRange = ageRange;
      }

      if (!_.isUndefined(interestedIn)) {
        myFilter.searchParams.interestedIn = interestedIn;
      }

      myFilter.isNew = false;
      await myFilter.save();
      await clearHash(myUser.filterID);
    }

    if (
      !_.isUndefined(visible) ||
      !_.isUndefined(likedOnly) ||
      !_.isUndefined(showOnline) ||
      !_.isUndefined(lat) ||
      !_.isUndefined(long) ||
      !_.isUndefined(desires) ||
      !_.isUndefined(about) ||
      !_.isUndefined(profilePic) ||
      !_.isUndefined(includeMsgs) ||
      !_.isUndefined(publicPhotoList) ||
      !_.isUndefined(privatePhotoList) ||
      !_.isUndefined(username)
    ) {
      let myProfileID = profileID || myUser.profileID;
      let myProfile = await Profile.findById(myProfileID);
      if (_.isUndefined(myProfile) || _.isNull(myProfile)) {
        throw new Error("Client: Profile no longer exists");
      }

      if (!_.isUndefined(lat) && !_.isUndefined(long)) {
        myProfile.loc.loc = {
          type: "Point",
          coordinates: [long, lat]
        };
      }

      if (!_.isUndefined(visible)) {
        myProfile.discoverySettings.visible = visible;
      }
      if (!_.isUndefined(username)) {
        myProfile.profileName = myProfile.profileName.replace(
          req.user.username,
          username
        );
      }
      if (!_.isUndefined(profilePic)) {
        myProfile.profilePic = profilePic;
      }
      if (!_.isUndefined(desires)) {
        myProfile.desires = desires;
      }
      if (!_.isUndefined(about)) {
        about.split(" ").forEach(word => {
          if (validator.isURL(word)) {
            throw new Error("Client: Links are not allowed in your bio.");
          } else if (validator.isMobilePhone(word)) {
            throw new Error(
              "Client: Phone numbers are not allowed in your bio."
            );
          } else if (validator.isEmail(word)) {
            throw new Error("Client: Emails are not allowed in your bio.");
          }
        });
        myProfile.about = about;
      }

      if (!_.isUndefined(includeMsgs)) {
        myProfile.cplLink.includeMsgs = includeMsgs;
      }

      if (!_.isUndefined(publicPhotoList)) {
        if (publicPhotoList.length > 4 && !myUser.blackMember.active) {
          throw new Error(
            "Client: Please upgrade to Black Membership to save unlimited photos."
          );
        }

        publicPhotoList = publicPhotoList.map(el => ({
          url: JSON.parse(el).key
        }));

        deleteRemovedFromS3({
          newPics: publicPhotoList.map(el => el.url),
          oldPics: myProfile.publicPhotos.map(el => el.url)
        });

        if (publicPhotoList.length === 0) {
          myProfile.publicPhotos = [];
        } else {
          myProfile.publicPhotos = publicPhotoList;
        }
      }

      if (!_.isUndefined(privatePhotoList)) {
        if (privatePhotoList.length > 4 && !myUser.blackMember.active) {
          throw new Error(
            "Client: Please upgrade to Black Membership to save unlimited photos."
          );
        }

        privatePhotoList = privatePhotoList.map(el => ({
          url: JSON.parse(el).key
        }));

        deleteRemovedFromS3({
          newPics: privatePhotoList.map(el => el.url),
          oldPics: myProfile.privatePhotos.map(el => el.url)
        });

        if (privatePhotoList.length === 0) {
          myProfile.privatePhotos = [];
        } else {
          myProfile.privatePhotos = privatePhotoList;
        }
      }

      if (myUser.blackMember.active) {
        if (!_.isUndefined(likedOnly)) {
          myProfile.discoverySettings.likedOnly = likedOnly;
        }
        if (!_.isUndefined(showOnline)) {
          myProfile.discoverySettings.showOnline = showOnline;
        }
      }

      if (
        myProfile.publicPhotos.length > 0 &&
        myProfile.publicPhotos[0].url !== "" &&
        myProfile.about !== "" &&
        myProfile.about !== null &&
        myProfile.about.length > 20 &&
        myProfile.desires.length > 0 &&
        myProfile.profilePic !== ""
      ) {
        if (!myUser.isProfileOK) {
          if (myUser.isCouple) {
            myProfile.userIDs.forEach(async id => {
              await User.findByIdAndUpdate(id, {
                $set: {
                  isProfileOK: true
                }
              });
              await clearHash(id);
            });
            myUser.isProfileOK = true;
          } else {
            await User.findByIdAndUpdate(myUser._id, {
              $set: {
                isProfileOK: true
              }
            });
            myUser.isProfileOK = true;
            await myUser.save();
            await clearHash(myUser._id);
          }
        }
      } else {
        if (myUser.isProfileOK) {
          if (myUser.isCouple) {
            myProfile.userIDs.forEach(async id => {
              await User.findByIdAndUpdate(id, {
                $set: {
                  isProfileOK: false
                }
              });
              await clearHash(id);
              myUser.isProfileOK = false;
            });
          } else {
            myUser.isProfileOK = false;
            await myUser.save();

            await clearHash(myUser._id);
          }
        }
      }

      myProfile.isNew = false;
      await myProfile.save();
      await clearHash(myUser.profileID);
    }
    //RETURNS PROFILEOK
    return myUser.isProfileOK;
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    throw new Error(e.message);
  }
}

function deleteRemovedFromS3({ newPics, oldPics }) {
  const removed = oldPics.filter(e => !newPics.includes(e));
  if (removed.length > 0) deleteFromS3(removed);
}

async function updateLocation({ lat, long, city, country, req }) {
  if (!_.isUndefined(lat) && !_.isUndefined(long) && !_.isUndefined(city)) {
    let myUser = req.user;
    if (req.user.blackMember.active || !myUser.location.lat) {
      await User.findByIdAndUpdate(req.user._id, {
        $set: {
          location: {
            city,
            country,
            crds: { lat, long }
          }
        }
      });

      await Profile.findByIdAndUpdate(req.user.profileID, {
        $set: {
          "loc.loc": {
            type: "Point",
            coordinates: [long, lat]
          }
        }
      });

      await clearHash(req.user._id);
      await clearHash(req.user.profileID);
    } else {
      throw new Error(
        "Client: You must be a Black Member to change your location."
      );
    }
    return true;
  } else {
    return false;
  }
}

async function getSettings(req) {
  try {
    const settings = {
      distance: 100,
      distanceMetric: "mi",
      ageRange: [18, 80],
      interestedIn: ["M", "F"],
      city: null,
      visible: true,
      newMsgNotify: true,
      lang: "en",
      emailNotify: true,
      showOnline: true,
      likedOnly: false,
      vibrateNotify: false,
      couplePartner: null,
      users: null,
      publicPhotos: [],
      privatePhotos: [],
      about: null,
      desires: [],
      includeMsgs: false,
      profilePic: "",
      sexuality: "",
      password: undefined,
      ccLast4: ""
    };

    let user = req.user;

    if (user) {
      settings.newMsgNotify = user.notificationRules.newMsgNotify;
      settings.vibrateNotify = user.notificationRules.vibrateNotify;
      settings.emailNotify = user.notificationRules.emailNotify;
      settings.city = user.location.city;
      settings.lang = user.lang;
      settings.lastActive = user.activity.lastActive;
      settings.sexuality = user.sexuality;
      settings.password = user.password ? "" : undefined;
      settings.ccLast4 = user.payment.ccLast4;
    }

    const filter = await Filter.findById({
      _id: user.filterID
    });

    if (filter) {
      settings.distance = filter.searchParams.distance;
      settings.distanceMetric = filter.searchParams.distanceMetric;
      settings.ageRange = filter.searchParams.ageRange;
      settings.interestedIn = filter.searchParams.interestedIn;
    }

    const profile = await Profile.findById(user.profileID).cache({
      key: user.profileID
    });

    if (profile) {
      settings.visible = profile.discoverySettings.visible;
      const partnerIDs = _.filter(
        profile.userIDs,
        userId => userId.toString() !== req.user.id
      );

      if (!_.isEmpty(partnerIDs)) {
        const partner = await User.findById(partnerIDs[0]).cache({
          key: partnerIDs[0]
        });
        settings.couplePartner = partner.username;
      }

      settings.users = profile.userIDs;
      settings.publicPhotos = profile.publicPhotos;
      settings.privatePhotos = profile.privatePhotos;
      settings.profilePic = profile.profilePic;
      settings.about = profile.about;
      settings.desires = profile.desires;
      settings.includeMsgs = profile.cplLink.includeMsgs;

      settings.likedOnly = profile.discoverySettings.likedOnly;
      settings.showOnline = profile.discoverySettings.showOnline;
    }

    return settings;
  } catch (e) {
    Sentry.captureException(e);

    console.error(e);
    throw new Error(e.message);
  }
}

async function getByID(id) {
  try {
    const user = await User.findById({
      _id: id
    }).cache({ key: id });

    if (!user) {
      throw new Error("Client: User not found");
    }

    return user;
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    throw new Error(e.message);
  }
}

async function deleteUser(req) {
  try {
    const user = req.user;

    if (!user) {
      throw new Error("Client: User not found");
    }

    await removeProfileFromSite(user.profileID, user._id);

    await deleteFilter(user.filterID);

    user.active = false;
    user.online = false;

    //Erase all data but keep info for mktg
    if (user.flagIDs.length === 0) {
      user.active = false;
      user.tokens = [];
      user.verifications = { photo: false, std: false };
      user.blackMember.active = false;
      user.notificationRules = {
        newMsgNotify: true,
        vibrateNotify: false,
        emailNotify: true
      };
      user.location = { city: "", country: "" };
      user.isProfileOK = false;
      user.isEmailOK = false;
      user.dob = Date.now();
      user.sharedApp = false;
      user.notifications = [];
      user.tours = [];
      user.gender = "M";
      user.verifications = {};
    }

    await user.save();
    clearHash(user._id);

    return true;
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    throw new Error(e.message);
  }
}

async function removeProfileFromSite(profileID, userID) {
  let profile = await Profile.findById(profileID);

  if (!profile) {
    throw new Error("Client: Profile not found");
  }

  await removeProfileFromEvents(profileID);

  await removeUserFromChats(userID, profileID, profile.profileName);

  if (profile.userIDs.length > 1) {
    const ProfileResolver = require("./Profile");
    if (await ProfileResolver.unlinkProfile({ profileID })) {
      profile = await Profile.findOne({
        userIDs: [userID],
        active: true
      });
    }
  }

  if (profile.flagIDs.length > 0) {
    profile.active = false;
    await profile.save();
  } else {
    await profile.remove();
  }

  clearHash(profileID);
}

async function deleteFilter(filterID) {
  await Filter.findByIdAndRemove(filterID);
  clearHash(filterID);
}

//TODO: Email when subscreated and when updated
async function createSubscription({ ccnum, exp, cvc, fname, lname, req }) {
  try {
    const user = req.user;
    if (!user) {
      throw new Error("User does not exist");
    }

    if (!user.payment.subscriptionId) {
      await creditcardHandler.createSubscription(
        {
          ccnum,
          exp,
          cvc,
          phone: user.phone,
          email: user.email,
          fname,
          lname
        },
        res => activateBlackMembership(res, user, ccnum.slice(-4))
      );
    } else {
      await creditcardHandler.updateCustomerPaymentProfile(
        {
          subscriptionId: user.payment.subscriptionId,
          ccnum,
          exp,
          cvc,
          phone: user.phone,
          email: user.email,
          fname,
          lname
        },
        () => updateBlackMembership(user, ccnum.slice(-4))
      );
    }

    return true;
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    throw new Error(e.message);
  }
}

async function activateBlackMembership(customer, user, ccLast4) {
  try {
    user.payment.customerID = customer.profile.customerProfileId;
    user.payment.subscriptionId = customer.subscriptionId;
    user.payment.ccLast4 = ccLast4;

    user.blackMember.active = true;
    const today = new Date();
    const renewal = today.setMonth(today.getMonth() + 1).toString();
    user.blackMember.renewalDate = renewal;
    user.blackMember.signUpDate = new Date();
    const formatedDate = moment()
      .add(1, "month")
      .format("LL")
      .toString();

    const notification = {
      toUserIDs: [user._id],
      type: "alert",
      body:
        "Thank you for upgrading to Black Membership. Your renewal date is ",
      event: formatedDate,
      title: "Black Membership Activated",
      text: "Black Membership Activated"
    };

    await User.addNotification(notification);
    clearHash(user._id);
    await user.save();

    if (user.isCouple) {
      const ourProfile = await Profile.findById(user.profileID);
      const theirUserID = ourProfile.userIDs.find(el => {
        return el !== user._id;
      });
      const theirUser = await User.findById(theirUserID).cache({
        key: theirUserID
      });
      if (theirUser.blackMember.active) {
        await Profile.findByIdAndUpdate(user.profileID, {
          $set: { isBlackMember: true }
        });
      } else {
        throw new Error(
          "Client: Your Black Membership is active, but your partner is not a Black member yet. You have access to all upgraded features but your profile can't be upgraded until they join also."
        );
      }
    } else {
      await Profile.findByIdAndUpdate(user.profileID, {
        $set: { isBlackMember: true }
      });
    }
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    throw new Error(e.message);
  }
}

async function updateBlackMembership(user, ccLast4) {
  try {
    if (user.payment.subscriptionId) {
      user.payment.ccLast4 = ccLast4;
      const notification = {
        toUserIDs: [user._id],
        type: "alert",
        body: "Credit card information has been updated.",
        title: "Credit Card Updated",
        text: "Credit Card Updated"
      };

      await User.addNotification(notification);
      clearHash(user._id);

      await user.save();
      return;
    }
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    throw new Error(e.message);
  }
}

async function cancelSubcription({ req }) {
  try {
    const user = req.user;
    if (!user) {
      throw new Error("User does not exist");
    }

    if (user.payment.subscriptionId) {
      await creditcardHandler.cancelSubscription(
        user.payment.subscriptionId,
        () => cancelBlackMembership(user)
      );
    }
    return true;
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    throw new Error(e.message);
  }
}

async function cancelBlackMembership(user) {
  try {
    if (user.payment.subscriptionId) {
      user.payment.customerID = "";
      user.payment.subscriptionId = "";
      user.payment.ccLast4 = "";
      const notification = {
        toUserIDs: [user._id],
        type: "alert",
        body:
          "Black Membership has been canceled and you will no longer be charged. You still have use of all Black features until the end of your billing cycle.",
        title: "Black Membership Canceled",
        text: "Black Membership Canceled"
      };

      await User.addNotification(notification);
      clearHash(user._id);
      await user.save();
      return;
    }
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    throw new Error(e.message);
  }
}

async function getNotifications({ limit, skip = 0, req }) {
  try {
    let notifications = [];

    const user = req.user;

    if (!user) {
      throw new Error("Client: User not found.");
    }

    if (user.notifications) {
      notifications.push(...user.notifications);
    }

    const profile = await Profile.findById(req.user.profileID).cache({
      key: req.user.profileID
    });

    if (!profile) {
      throw new Error("Client: Profile not found.");
    }
    if (profile.notifications) {
      notifications.push(...profile.notifications);
    }

    const total = notifications.length;

    if (total === 0) {
      return { notifications: [], total };
    }

    const sorted = _.chunk(
      _.sortBy(notifications, note => note.date).reverse(),
      limit
    );

    let finalNotices = sorted[skip / limit];

    if (finalNotices === null || finalNotices === undefined) {
      finalNotices = [];
    }

    updateNotifications({
      notificationIDs: finalNotices.map(notice => {
        if (notice) {
          return notice._id;
        }
      }),
      seen: true,
      req
    });

    return { notifications: finalNotices, total };
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    throw new Error(e.message);
  }
}

async function updateNotifications({ notificationIDs, read, seen, both, req }) {
  try {
    if (seen || both) {
      await notificationIDs.forEach(async noticeID => {
        await User.updateOne(
          { "notifications._id": noticeID },
          { $set: { "notifications.$.seen": true } }
        );

        await Profile.updateOne(
          {
            "notifications._id": noticeID
          },
          { $set: { "notifications.$.seen": true } }
        );
      });
    }
    if (read || both) {
      await notificationIDs.forEach(async noticeID => {
        await User.updateOne(
          { "notifications._id": noticeID },
          { $set: { "notifications.$.read": true } }
        );

        await Profile.updateOne(
          {
            "notifications._id": noticeID
          },
          { $set: { "notifications.$.read": true } }
        );
      });
    }

    clearHash(req.user._id);
    clearHash(req.user.profileID);
    return true;
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    throw new Error(e.message);
  }
}

async function getCounts({ req }) {
  try {
    let notifications = [];

    const user = req.user;
    let alert;

    if (!user) {
      throw new Error("Client: User not found.");
    }
    if (user.notifications) {
      notifications.push(...user.notifications);
    }

    alert = _.last(
      notifications.filter(note => note.type === "alert" && note.read === false)
    );
    if (alert) {
      updateNotifications({
        notificationIDs: [alert._id],
        both: true,
        req
      });
    }

    const profile = await Profile.findById(req.user.profileID);

    if (!profile) {
      throw new Error("Client: Profile not found.");
    }
    if (profile.notifications) {
      notifications.push(...profile.notifications);
    }
    if (!alert) {
      alert = _.last(
        notifications.filter(
          note => note.type === "alert" && note.read === false
        )
      );
      if (alert) {
        updateNotifications({
          notificationIDs: [alert._id],
          both: true,
          req
        });
      }
    }

    const noticesCount = await notifications.filter(
      notice => notice.seen === false
    ).length;

    const chats = await Chat.find(
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
      { messages: 1, lastSeen: 1, id: 1, participants: 1 }
    );

    let newMsg = false;
    const msgsCount = chats.reduce(function(result, chat) {
      let lastSeen = chat.lastSeen.find(
        el => el.userID.toString() === req.user._id.toString()
      );

      //They are the only one in the chat
      if (
        chat.participants[0].toString() === req.user.profileID.toString() &&
        chat.participants.length === 1
      ) {
        return result;
      }
      //They've never seen the entire chat
      if (lastSeen === undefined || lastSeen.length === 0) {
        newMsg = true;
        return result;
      }
      lastSeen = lastSeen.date;
      const unSeen = chat.messages.filter(message =>
        moment(message.createdAt).isAfter(lastSeen)
      );
      result += unSeen.length;

      return result;
    }, 0);

    return { msgsCount, noticesCount, alert, newMsg };
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    throw new Error(e.message);
  }
}

async function seenTour({ tour, req }) {
  try {
    if (tour === "reset") {
      await User.findByIdAndUpdate(req.user._id, {
        $set: {
          tours: []
        }
      });
      clearHash(req.user._id);

      return true;
    }

    await User.findByIdAndUpdate(req.user._id, {
      $push: {
        tours: tour
      }
    });

    clearHash(req.user._id);

    return true;
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    throw new Error(e.message);
  }
}

async function confirmEmail({ token }) {
  try {
    const jwt = require("jsonwebtoken");
    let jwtResp;
    try {
      jwtResp = jwt.verify(token, global.secrets.EMAIL_SECRET);
    } catch (e) {
      return false;
    }

    const { userID, email } = jwtResp;
    if (!userID) {
      return;
    }

    //Use email to deactive all the only activate the one
    await User.updateMany(
      { email, _id: { $ne: userID } },
      {
        $set: {
          isEmailOK: false
        }
      }
    );

    await User.updateOne(
      { _id: userID },
      {
        $set: {
          isEmailOK: true
        }
      }
    );
    return true;
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    throw new Error(e.message);
  }
}

async function confirmPhone({ phone, userID }) {
  try {
    const existingUser = await User.findOne({
      phone,
      _id: { $ne: userID },
      active: true
    });

    if (existingUser) {
      if (existingUser.flagIDs.length >= 3) {
        throw new Error(
          "Client: This account has been flagged for review. Please contact support at support@foxtailapp.com if this is a mistake."
        );
      }
      existingUser.active = false;
      await existingUser.save();
      //NOTIFY OLD USER OF PHONE USED
      await newPhoneAcct({
        username: existingUser.username,
        email: existingUser.email,
        lang: existingUser.lang
      });
    }

    return true;
  } catch (e) {
    console.error(e.message);
    Sentry.captureException(e);
    console.error(e);
    throw new Error(e.message);
  }
}

async function sendPhoneResetEmail({ phone }) {
  try {
    const user = await User.findOne({ phone });

    if (!user) {
      throw new Error(
        "Client: Email has been sent to the account associated with this phone number. If it exists."
      );
    }
    const now = moment(new Date()); //todays date
    const end = moment(user.activity.lastEmailReset); // another date
    const duration = moment.duration(now.diff(end));
    var lastDuration = duration._milliseconds;

    if (lastDuration > 300000) {
      //SEND EMAIL CONFIRMATION
      sendPhoneReset({
        email: user.email,
        id: user._id,
        username: user.username,
        lang: user.lang
      });
    } else {
      throw new Error(
        "Client: Reset email has been sent to you within the last 5 minutes. Please check your spam."
      );
    }
    throw new Error(
      "Client: Email has been sent to the account associated with this phone number. If it exists."
    );
    return true;
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    throw new Error(e.message);
  }
}

async function sendPasswordResetEmail({ phone, email }) {
  try {
    const user = await User.findOne({ phone, email });
    if (!user) {
      return new Error(
        "Client: Email has been sent to the account associated with this phone number. If it exists."
      );
    }
    const now = moment(new Date()); //todays date
    const end = moment(user.activity.lastEmailReset); // another date
    const duration = moment.duration(now.diff(end));
    var lastDuration = duration._milliseconds;

    if (lastDuration > 300000) {
      if (user) {
        //SEND EMAIL CONFIRMATION
        sendPasswordReset({
          email: user.email,
          id: user._id,
          username: user.username,
          lang: user.lang
        });
      }
    } else {
      return new Error(
        "Client: Reset email has been sent to you within the last 5 minutes. Please check your spam."
      );
    }
    return new Error(
      "Client: Email has been sent to the account associated with this phone number. If it exists."
    );
    return true;
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    throw new Error(e.message);
  }
}

async function canceledMemberships() {
  try {
    const end = moment()
      .subtract(1, "days")
      .endOf("day");

    const users = await User.find({
      "blackMember.renewalDate": { $lt: end },
      active: true
    });

    users.forEach(async user => {
      user.blackMember.active = false;
      user.isNew = false;
      await user.save();
      const profile = await Profile.findById(user.profileID);
      profile.isBlackMember = false;
      profile.publicPhotos = profile.publicPhotos.slice(0, 4);
      profile.privatePhotos = profile.privatePhotos.slice(0, 4);
      profile.discoverySettings.showOnline = true;
      profile.discoverySettings.likedOnly = false;
      await profile.save();
      if (user.notificationRules.emailNotify) {
        sendBlkCancelToUser({
          name: user.username,
          email: user.email
        });
      }
      const notification = {
        toUserIDs: [user._id],
        type: "alert",
        body:
          "Your Black Member profile has been reverted to a Free profile. Please note: Photos over the 4 photo limt have been removed.",
        text: "Profile changed to Free Profile"
      };

      await User.addNotification(notification);
    });

    return true;
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    throw new Error(e.message);
  }
}

async function removeOldAccounts() {
  try {
    const end = moment()
      .subtract(1, "years")
      .endOf("day");

    const toDelete = await User.find({
      "activity.lastActive": { $lt: end },
      active: true
    });

    toDelete.forEach(user => {
      emailDeleted({
        email: user.email,
        userName: user.username,
        lang: user.lang
      });
      deleteUser({
        user
      });
    });

    const almostend = moment()
      .subtract(1, "years")
      .add(1, "months")
      .endOf("day");

    const almostCancel = await User.find(
      {
        "activity.lastActive": { $lt: almostend },
        active: true
      },
      { email: 1, username: 1 }
    );

    almostCancel.forEach(user => {
      if (user.notificationRules.emailNotify) {
        emailAccountOld({
          email: user.email,
          userName: user.username,
          lang: user.lang
        });
      }
    });

    return true;
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    throw new Error(e.message);
  }
}

async function messageAdmin({ name, email, text, req }) {
  try {
    if (req.user) {
      await sendEmailToAdmin({
        name: req.user.username,
        email: req.user.email,
        text,
        user: true
      });
    } else {
      await sendEmailToAdmin({ name, email, text, user: false });
    }
    return true;
  } catch (e) {
    console.error(e.message);
  }
}

async function resendVerEMail({ req }) {
  try {
    return await sendVerEMail(req.user.email, req.user._id).then(resp => {
      if (resp) {
        return true;
      } else {
        return false;
      }
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    throw new Error(e.message);
  }
}

module.exports = {
  login,
  create,
  updateUser,
  messageAdmin,
  submitPhoto,
  updateSettings,
  getByID,
  deleteUser,
  getSettings,
  createSubscription,
  cancelSubcription,
  getNotifications,
  updateNotifications,
  getCounts,
  seenTour,
  confirmEmail,
  sendPhoneResetEmail,
  sendPasswordResetEmail,
  updateLocation,
  confirmPhone,
  testload,
  canceledMemberships,
  removeOldAccounts,
  resendVerEMail
};
