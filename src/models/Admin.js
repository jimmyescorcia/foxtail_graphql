const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");
const jwt = require("jsonwebtoken");
const _ = require("lodash");
const { notifySchema } = require("./Generic");
const { ObjectId } = mongoose.Types;
ObjectId.prototype.valueOf = function() {
  return this.toString();
};

// Every admin has an email and password.  The password is not stored as
// plain text - see the authentication helpers below.
const AdminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  payInfo: {
    type: {
      type: String
    },
    acctNum: {
      type: String
    },
    lastPayments: {
      type: [
        {
          date: {
            type: Date
          },
          type: {
            type: String
          },
          acctNum: {
            type: String
          },
          amount: {
            type: String
          }
        }
      ]
    },
    currentEarnings: {
      type: Number
    }
  },
  active: {
    type: Boolean,
    default: true
  },
  territories: {
    type: [String]
  },
  lastActive: {
    type: Date,
    default: Date.now()
  },
  notifications: [notifySchema],
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
  ]
});

AdminSchema.methods.toJSON = function() {
  const admin = this;
  const adminObject = admin.toObject();

  return _.pick(adminObject, ["_id", "email"]);
};

AdminSchema.methods.generateAuthToken = function(tokenType) {
  const admin = this;
  const access = tokenType;
  let token = null;
  if (tokenType === "refresh") {
    token = jwt
      .sign(
        { _id: admin._id.toHexString(), access },
        globals.secrets.ADMIN_JWT_SECRET2,
        {
          expiresIn: globals.secrets.REFRESH_TOKEN_EXPIRATION
        }
      )
      .toString();
  } else {
    token = jwt
      .sign(
        { _id: admin._id.toHexString(), access },
        globals.secrets.ADMIN_JWT_SECRET,
        {
          expiresIn: globals.secrets.AUTH_TOKEN_EXPIRATION
        }
      )
      .toString();
  }
  admin.tokens = admin.tokens
    .filter(q => q.access !== access)
    .concat({ access, token });
  return admin.save().then(() => token);
};

AdminSchema.statics.addNotification = async function({
  toAdminIDs,
  type,
  text,
  pic,
  body,
  link,
  targetID
}) {
  const Admin = this;

  try {
    await toAdminIDs.forEach(async id => {
      await Admin.updateOne(
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
              targetID
            }
          }
        }
      );

      const admin = await Admin.findOne({ _id: id });
      clearHash(id);

      await sendGenericEmail({
        toEmail: admin.email,
        toAdminname: admin.adminname,
        subject: text,
        body
      });
    });
    return true;
  } catch (e) {
    console.error(e.message);
    throw new Error("Notification error:", e.message);
  }
};

AdminSchema.methods.removeToken = function(token) {
  const admin = this;
  return admin.updateOne({
    $pull: {
      tokens: { token }
    }
  });
};

AdminSchema.statics.findByToken = async function(reqtoken) {
  const Admin = this;

  let token = reqtoken;
  try {
    await jwt.verify(token, globals.secrets.ADMIN_JWT_SECRET);
  } catch (e) {
    if (~e.message.indexOf("expired")) {
      const admin = await Admin.findOne({
        "tokens.token": token,
        "tokens.access": "auth"
      });
      const refreshToken = admin.tokens.find(tkn => tkn.access === "refresh");
      const newtokens = await tokenRefresh(refreshToken.token);

      return await Admin.findOne({
        "tokens.token": newtokens.token,
        "tokens.access": "auth"
      });
    } else {
      throw new Error("Token error:", e.message);
    }
  }

  return await Admin.findOne({
    "tokens.token": token,
    "tokens.access": "auth"
  });
};

AdminSchema.statics.refreshToken = async function(refreshtoken) {
  let decoded;

  try {
    decoded = jwt.verify(refreshtoken, globals.secrets.ADMIN_JWT_SECRET2);
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
    const admin = await Admin.findOne({
      "tokens.token": refreshToken
    });

    if (!admin) {
      return {};
    }

    try {
      token = jwt
        .sign(
          { _id: admin._id.toHexString(), access: "auth" },
          globals.secrets.ADMIN_JWT_SECRET,
          {
            expiresIn: globals.secrets.AUTH_TOKEN_EXPIRATION
          }
        )
        .toString();
    } catch (e) {
      return {};
    }

    let pos = admin.tokens.findIndex(q => q.access === "auth");

    if (pos > -1) {
      admin.tokens[pos].token = token;
    } else {
      return {};
    }

    try {
      refresh = jwt
        .sign(
          { _id: admin._id.toHexString(), access: "refresh" },
          globals.secrets.ADMIN_JWT_SECRET2,
          {
            expiresIn: globals.secrets.REFRESH_TOKEN_EXPIRATION
          }
        )
        .toString();
    } catch (e) {
      return {};
    }

    pos = admin.tokens.findIndex(q => q.access === "refresh");

    if (pos > -1) {
      admin.tokens[pos].token = refresh;
    } else {
      return {};
    }
    admin.isNew = false;
    await admin.save();

    return { token, refresh };
  } catch (e) {
    console.error(e.message);
    throw new Error("Token Refresh error:", e.message);
  }
};

AdminSchema.plugin(timestamps);

const Admin = mongoose.model("admin", AdminSchema);

module.exports = Admin;
