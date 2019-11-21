const axios = require("axios");
import * as Sentry from "@sentry/node";
const jwt = require("jsonwebtoken");
const { login, getByID, confirmPhone, create } = require("./User");
const validator = require("validator");
const User = require("../../models/User");
// @route   POST api/profile
// @desc    Create or edit user profile
// @access  Private
async function getPhone({ csrf, code }) {
  try {
    // CSRF check
    if (csrf === global.secrets.CSRF) {
      const response = await axios.post(global.secrets.TOKEN_EXCHANGE_URL, {
        idToken: code
      });
      return response.data.users[0].phoneNumber;
    } else {
      // login failed
      throw new Error(
        "Client: Phone verification failed, please check your number and try again."
      );
    }
  } catch (e) {
    console.error(e.message);
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function fbResolve({ csrf, code, createData, isCreate, password }) {
  try {
    const phone = await getPhone({ csrf, code });

    if (
      !validator.isIn(phone, ["1", "2", "3", "4", "5"]) &&
      !validator.isMobilePhone(phone)
    ) {
      throw new Error("Client: Invalid mobile number!");
    }

    if (isCreate) {
      createData.phone = phone;
      createData.password = password;
      return create(createData);
    }

    return login({ phone, password });
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function fbResetPhone({ csrf, code, token }, req) {
  try {
    const phone = await getPhone({ csrf, code });

    let user;
    if (token) {
      const jwt = require("jsonwebtoken");

      const { userID } = jwt.verify(token, global.secrets.EMAIL_SECRET);

      if (!userID) {
        return;
      }

      user = await getByID(userID);
    } else {
      user = req.user;
    }

    if (!user || !user.active) {
      return new Error("Client: User doesn`t exist in our system.");
    }
    if (user.flagIDs.length >= 3) {
      throw new Error(
        "Client: This account has been flagged for review. Please contact support at support@foxtailapp.com if this is a mistake."
      );
    }

    //PHONE RECONCILE
    if (!(await confirmPhone({ phone, userID: user.id }))) {
      return false;
    }

    user.phone = phone;
    user.isNew = false;
    await user.save();

    return true;
  } catch (e) {
    console.error(e.message);
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function resetPassword({ token, password, user }) {
  try {
    if (token) {
      const { userID } = jwt.verify(token, global.secrets.PASS_SECRET);

      if (!userID) {
        return;
      }

      user = await getByID(userID);
    }

    if (!user || !user.active) {
      return new Error("Client: User doesn`t exist in our system.");
    }
    if (user.flagIDs.length >= 3) {
      throw new Error(
        "Client: This account has been flagged for review. Please contact support at support@foxtailapp.com if this is a mistake."
      );
    }

    if (password !== "") {
      user.password = password;
      //TODO: FIGURE OUT WHY CAUSE VERSION ISSUES
      user.isNew = false;
      await user.save();
      return true;
    } else {
      await User.findByIdAndUpdate(user._id, {
        $unset: {
          password: 1
        }
      });
      return false;
    }
  } catch (e) {
    console.error(e.message);
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

module.exports = {
  fbResolve,
  fbResetPhone,
  resetPassword
};
