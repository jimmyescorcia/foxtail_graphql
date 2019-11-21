const mongoose = require("mongoose");
const bcrypt = require("bcrypt-nodejs");
const timestamps = require("mongoose-timestamp");
const jwt = require("jsonwebtoken");
import * as Sentry from "@sentry/node";
const _ = require("lodash");
const { clearHash } = require("../utils/cache");
const { notifySchema } = require("./Generic");
const { ObjectId } = mongoose.Types;
ObjectId.prototype.valueOf = function() {
  return this.toString();
};

// Every user has an email and password.  The password is not stored as
// plain text - see the authentication helpers below.
const UserSchema = new mongoose.Schema({
  profileID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Profile"
  },
  username: {
    type: String,
    required: true,
    minlength: 2
  },
  payment: {
    customerID: {
      type: String,
      default: ""
    },
    subscriptionId: {
      type: String,
      default: ""
    },
    ccLast4: {
      type: String,
      default: ""
    }
  },
  email: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  sharedApp: {
    type: Boolean,
    default: false
  },
  active: {
    type: Boolean,
    required: true,
    default: true
  },
  flagIDs: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "Flag",
    default: []
  },
  filterID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Filter"
  },
  dob: {
    type: Date,
    required: true
  },
  gender: {
    type: String,
    required: true
  },
  lang: {
    type: String,
    default: "en"
  },
  lastAnnounceDate: {
    type: Date,
    default: Date.now()
  },
  blackMember: {
    active: {
      type: Boolean,
      default: false,
      required: true
    },
    renewalDate: {
      type: Date
    },
    signUpDate: {
      type: Date
    },
    cancelDate: {
      type: Date
    }
  },
  appVersion: {
    type: String
  },
  tours: {
    type: [String],
    default: []
  },
  notificationRules: {
    newMsgNotify: {
      type: Boolean,
      default: true,
      required: true
    },
    vibrateNotify: {
      type: Boolean,
      default: false,
      required: true
    },
    emailNotify: {
      type: Boolean,
      default: true,
      required: true
    }
  },
  activity: {
    genderChange: {
      type: Boolean,
      default: false
    },
    nameChange: {
      type: Date,
      default: null
    },
    lastActive: {
      type: Date,
      default: Date.now()
    },
    lastEmail: {
      type: Date
    },
    lastEmailReset: {
      type: Date,
      default: Date.now()
    },
    linksSent: {
      count: {
        type: Number,
        default: 0
      },
      today: {
        type: Date,
        default: Date.now()
      },
      ignoreDate: {
        type: Date,
        default: null
      }
    },
    likesSent: {
      count: {
        type: Number,
        default: 0
      },
      date: {
        type: Date,
        default: Date.now()
      }
    },
    msgsSent: {
      count: {
        type: Number,
        default: 0
      },
      date: {
        type: Date,
        default: Date.now()
      }
    }
  },
  isProfileOK: {
    type: Boolean,
    default: false,
    required: true
  },
  isEmailOK: {
    type: Boolean,
    default: false,
    required: true
  },
  isCouple: {
    type: Boolean,
    default: false,
    required: true
  },
  referredBy: {
    type: String
  },
  referrals: {
    type: Number,
    default: 0
  },
  verifications: {
    photoVer: {
      image: {
        type: String
      },
      active: {
        type: Boolean,
        default: false
      }
    },
    stdVer: {
      image: {
        type: String
      },
      active: {
        type: Boolean,
        default: false
      }
    },
    acctVer: {
      image: {
        type: String
      },
      active: {
        type: Boolean,
        default: false
      }
    }
  },
  location: {
    city: { type: String, default: "" },
    country: { type: String, default: "" },
    crds: {
      lat: { type: Number, default: 0 },
      long: { type: Number, default: 0 }
    }
  },
  distanceMetric: {
    type: String,
    default: "mi",
    required: true
  },
  online: { type: Boolean, default: false, required: true },
  notifications: [notifySchema],
  sexuality: {
    type: String
  },
  tokens: [
    {
      access: {
        type: String,
        required: true
      },
      token: {
        type: String,
        required: true
      }
    }
  ],
  captchaReq: {
    type: Boolean,
    default: false
  },
  ip: {
    type: String,
    default: ""
  }
});

// The user's password is never saved in plain text.  Prior to saving the
// user model, we 'salt' and 'hash' the users password.  This is a one way
// procedure that modifies the password - the plain text password cannot be
// derived from the salted + hashed version. See 'comparePassword' to understand
// how this is used.
UserSchema.pre("save", function save(next) {
  const user = this;
  if (!user.isModified("password")) {
    return next();
  }
  bcrypt.genSalt(10, (err, salt) => {
    if (err) {
      return next(err);
    }

    bcrypt.hash(user.password, salt, null, (err, hash) => {
      if (err) {
        return next(err);
      }
      user.password = hash;
      next();
    });
  });
});

// We need to compare the plain text password (submitted whenever logging in)
// with the salted + hashed version that is sitting in the database.
// 'bcrypt.compare' takes the plain text password and hashes it, then compares
// that hashed password to the one stored in the DB.  Remember that hashing is
// a one way process - the passwords are never compared in plain text form.
UserSchema.methods.comparePassword = function comparePassword(
  candidatePassword
) {
  try {
    const match = bcrypt.compareSync(candidatePassword, this.password);
    return match;
  } catch (e) {
    throw new Error(e.message);
  }
};

UserSchema.methods.toJSON = function() {
  const user = this;
  const userObject = user.toObject();

  return _.pick(userObject, ["_id", "email"]);
};

UserSchema.methods.generateAuthToken = function(tokenType) {
  const user = this;
  if (!user) {
    return {};
  }
  const access = tokenType;
  let token = null;
  if (tokenType === "refresh") {
    token = jwt
      .sign(
        { _id: user._id.toHexString(), access },
        global.secrets.JWT_SECRET2,
        {
          expiresIn: global.secrets.REFRESH_TOKEN_EXPIRATION
        }
      )
      .toString();
  } else {
    token = jwt
      .sign(
        { _id: user._id.toHexString(), access },
        global.secrets.JWT_SECRET,
        {
          expiresIn: global.secrets.AUTH_TOKEN_EXPIRATION
        }
      )
      .toString();
  }
  user.tokens = user.tokens
    .filter(q => q.access !== access)
    .concat({ access, token });
  return user.save().then(() => token);
};

UserSchema.statics.addNotification = async function({
  toUserIDs,
  type,
  text,
  pic,
  body,
  link,
  targetID,
  name,
  event
}) {
  const User = this;

  try {
    await toUserIDs.forEach(async id => {
      await User.updateOne(
        { _id: id },
        {
          $push: {
            notifications: {
              toMemberID: id,
              type,
              text,
              body,
              link,
              pic,
              targetID,
              name,
              event
            }
          }
        }
      );

      clearHash(id);
    });
    return true;
  } catch (e) {
    console.error(e.message);
    throw new Error("Notification error:", e.message);
  }
};

UserSchema.methods.removeToken = function(token) {
  const user = this;
  return user.updateOne({
    $pull: {
      tokens: { token }
    }
  });
};

UserSchema.statics.setCapLock = async function({ id, ip }) {
  try {
    await User.findByIdAndUpdate(id, {
      $set: {
        ip,
        captchaReq: true
      }
    });
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
};

UserSchema.statics.resolveCapLock = async function({ capToken, ip }) {
  try {
    const axios = require("axios");

    const response = await axios.post(
      "https://www.google.com/recaptcha/api/siteverify?secret=" +
        global.secrets.GOOGLE_RECAPTCHA_SECRET_KEY +
        "&response=" +
        capToken
    );

    if (response.data.success) {
      await User.findOneAndUpdate(
        {
          ip
        },
        {
          $set: {
            ip: "",
            captchaReq: false,
            "activity.linksSent.ignoreDate": Date.now()
          }
        }
      );

      return true;
    } else {
      return false;
    }
  } catch (e) {
    console.error(e);
    return false;
  }
};

UserSchema.methods.setLocation = async function({ long, lat }) {
  try {
    const user = this;
    if (user.location.city === "") {
      clearHash(user.id);
      return user.updateOne({
        $set: {
          "location.crds": {
            lat,
            long
          }
        }
      });
    }
  } catch (e) {
    console.error(e.message);
    throw new Error("Remove Notification error:", e.message);
  }
};

UserSchema.statics.findByToken = async function(reqtoken) {
  const User = this;

  if (!User) {
    return {};
  }

  let token = reqtoken;

  try {
    await jwt.verify(token, global.secrets.JWT_SECRET);
  } catch (e) {
    if (~e.message.indexOf("expired")) {
      const user = await User.findOne({
        "tokens.token": token,
        "tokens.access": "auth"
      });
      const refreshToken = user.tokens.find(tkn => tkn.access === "refresh");
      const newtokens = await tokenRefresh(refreshToken.token);

      return await User.findOne({
        "tokens.token": newtokens.token,
        "tokens.access": "auth"
      });
    } else {
      Sentry.captureException(e);
      return;
    }
  }

  return await User.findOne({
    "tokens.token": token,
    "tokens.access": "auth"
  });
};

UserSchema.statics.refreshToken = async function(refreshtoken) {
  let decoded;

  try {
    decoded = jwt.verify(refreshtoken, global.secrets.JWT_SECRET2);
  } catch (e) {
    return {};
  }

  if (!decoded._id) {
    return {};
  }

  const newtokens = await tokenRefresh(refreshtoken);

  return newtokens;
};
const tokenRefresh = async refreshToken => {
  try {
    let token = null;
    let refresh = null;
    const user = await User.findOne({
      "tokens.token": refreshToken
    });

    if (!user) {
      return {};
    }

    try {
      token = jwt
        .sign(
          { _id: user._id.toHexString(), access: "auth" },
          global.secrets.JWT_SECRET,
          {
            expiresIn: global.secrets.AUTH_TOKEN_EXPIRATION
          }
        )
        .toString();
    } catch (e) {
      return {};
    }

    let pos = user.tokens.findIndex(q => q.access === "auth");

    if (pos > -1) {
      user.tokens[pos].token = token;
    } else {
      return {};
    }

    try {
      refresh = jwt
        .sign(
          { _id: user._id.toHexString(), access: "refresh" },
          global.secrets.JWT_SECRET2,
          {
            expiresIn: global.secrets.REFRESH_TOKEN_EXPIRATION
          }
        )
        .toString();
    } catch (e) {
      Sentry.captureException(e);
      return {};
    }

    pos = user.tokens.findIndex(q => q.access === "refresh");

    if (pos > -1) {
      user.tokens[pos].token = refresh;
    } else {
      return {};
    }
    user.isNew = false;
    await user.save();

    return { token, refresh };
  } catch (e) {
    Sentry.captureException(e);
    throw new Error("Token Refresh error:", e.message);
  }
};

UserSchema.plugin(timestamps);
const User = mongoose.model("user", UserSchema);

module.exports = User;
