const Sentry = require("@sentry/node");
const User = require("../models/User");
const { emailTranslate } = require("./translate");
const _ = require("lodash");
const moment = require("moment");
const { clearHash } = require("../utils/cache");
const AWS = require("aws-sdk");
const jwt = require("jsonwebtoken");

const SES = new AWS.SES();
const skipDev = true;
async function sendNewMsgEMail({
  fromProfileName,
  toProfileName,
  toEmail,
  lang
}) {
  if (process.env.NODE_ENV === "development" && skipDev) {
    return;
  }
  try {
    const body =
      emailTranslate("You have a new message from", lang) +
      " " +
      fromProfileName +
      ". " +
      emailTranslate("Please login to your Foxtail account to respond.", lang) +
      " " +
      "Foxtail.";

    const htmlBody =
      "<html>\r\n  <head>\r\n    <title>" +
      emailTranslate("New Message on Foxtail", lang) +
      "</title>\r\n  </head>\r\n  <body>\r\n" +
      emailTranslate("Hello", lang) +
      " " +
      toProfileName +
      ", \r\n<br/><p>" +
      emailTranslate("You have a new message from", lang) +
      " " +
      fromProfileName +
      "! \r\n<br/>" +
      emailTranslate("Please login to your Foxtail account to respond.", lang) +
      "</p>" +
      "\r\n<p>" +
      "Foxtail." +
      "</p>" +
      "</body>\r\n</html>";

    const subject = emailTranslate("You have a New Message on Foxtail!", lang);

    let params = {
      Destination: {
        ToAddresses: [toEmail]
      },
      Source: "Foxtail <noreply@foxtailapp.com>",
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: htmlBody
          },
          Text: {
            Charset: "UTF-8",
            Data: body
          }
        },
        Subject: {
          Charset: "UTF-8",
          Data: subject
        }
      }
    };

    SES.sendEmail(params, (err, data) => {
      if (err) {
        console.error("Error sending email", err);
      }
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
  }
}

async function sendNewEventInvitation({
  fromProfileName,
  toProfileName,
  toEmail,
  eventName,
  lang
}) {
  try {
    if (process.env.NODE_ENV === "development" && skipDev) {
      return;
    }
    const body = emailTranslate("You have been invited to the event");
    " " +
      eventName +
      ", " +
      emailTranslate("by", lang) +
      " " +
      fromProfileName +
      ". " +
      emailTranslate("Please login to your Foxtail account to respond.", lang) +
      " " +
      "Foxtail.";

    const htmlBody =
      "<html>\r\n  <head>\r\n    <title>" +
      emailTranslate("New event invitation on Foxtail", lang) +
      "</title>\r\n  </head>\r\n  <body>\r\n" +
      emailTranslate("Hello", lang) +
      " " +
      toProfileName +
      ", \r\n<br/><p>" +
      emailTranslate("You have been invited to the event") +
      " " +
      eventName +
      ", " +
      emailTranslate("by", lang) +
      " " +
      fromProfileName +
      "! \r\n<br/>" +
      emailTranslate("Please login to your Foxtail account to respond.", lang) +
      "</p>" +
      "\r\n<p>" +
      "Foxtail." +
      "</p>" +
      "</body>\r\n</html>";

    const subject = emailTranslate(
      "You have been invited to an event on Foxtail!",
      lang
    );

    let params = {
      Destination: {
        ToAddresses: [toEmail]
      },
      Source: "Foxtail <noreply@foxtailapp.com>",
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: htmlBody
          },
          Text: {
            Charset: "UTF-8",
            Data: body
          }
        },
        Subject: {
          Charset: "UTF-8",
          Data: subject
        }
      }
    };

    SES.sendEmail(params, (err, data) => {
      if (err) {
        console.error("Error sending email", err);
      }
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
  }
}

async function sendNewChatInvitation({
  fromProfileName,
  toProfileName,
  toEmail,
  lang
}) {
  try {
    if (process.env.NODE_ENV === "development" && skipDev) {
      return;
    }
    const body =
      emailTranslate("You have been invited to a group chat by") +
      ", " +
      fromProfileName +
      ". " +
      emailTranslate("Please login to your Foxtail account to respond.", lang) +
      " " +
      "Foxtail.";

    const htmlBody =
      "<html>\r\n  <head>\r\n    <title>" +
      emailTranslate("New chat invitation on Foxtail", lang) +
      "</title>\r\n  </head>\r\n  <body>\r\n" +
      emailTranslate("Hello", lang) +
      " " +
      toProfileName +
      ", \r\n<br/><p>" +
      emailTranslate("You have been invited to a group chat by") +
      ", " +
      fromProfileName +
      "! \r\n<br/>" +
      emailTranslate("Please login to your Foxtail account to respond.", lang) +
      "</p>" +
      "\r\n<p>" +
      "Foxtail." +
      "</p>" +
      "</body>\r\n</html>";

    const subject = emailTranslate(
      "You have been invited to a group chat on Foxtail!",
      lang
    );

    let params = {
      Destination: {
        ToAddresses: [toEmail]
      },
      Source: "Foxtail <noreply@foxtailapp.com>",
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: htmlBody
          },
          Text: {
            Charset: "UTF-8",
            Data: body
          }
        },
        Subject: {
          Charset: "UTF-8",
          Data: subject
        }
      }
    };

    SES.sendEmail(params, (err, data) => {
      if (err) {
        console.error("Error sending email", err);
      }
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
  }
}

async function sendEmailToProfile({
  profile,
  fromUsername,
  fromUserID,
  eventName,
  isChatInvite
}) {
  try {
    if (process.env.NODE_ENV === "development" && skipDev) {
      return;
    }
    const toProfile = profile;
    toProfile.userIDs.forEach(async userID => {
      if (_.isEqual(userID, fromUserID)) {
        return;
      }
      const user = await User.findById(userID);
      if (user.notificationRules.emailNotify) {
        const now = moment(new Date()); //todays date
        const end = moment(user.activity.lastEmail); // another date
        const duration = moment.duration(now.diff(end));
        var lastDuration = duration._milliseconds;
        if (!user.online && lastDuration > 300000) {
          if (isChatInvite) {
            await sendNewChatInvitation({
              fromProfileName: fromUsername,
              toProfileName: toProfile.profileName,
              toEmail: user.email,
              lang: user.lang
            });
          } else if (eventName) {
            await sendNewEventInvitation({
              fromProfileName: fromUsername,
              toProfileName: toProfile.profileName,
              toEmail: user.email,
              lang: user.lang,
              eventName
            });
          } else {
            await sendNewMsgEMail({
              fromProfileName: fromUsername,
              toProfileName: toProfile.profileName,
              toEmail: user.email,
              lang: user.lang
            });
          }
          user.activity.lastEmail = now;
          user.isNew = false;
          await user.save();
        }
      }
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
  }
}

async function sendVerEMail(toEmail, id) {
  try {
    if (process.env.NODE_ENV === "development" && skipDev) {
      return;
    }
    const user = await User.findById(id, {
      lang: 1,
      username: 1,
      "activity.lastEmail": 1
    }).cache({ key: id });
    const now = moment(new Date()); //todays date
    const end = moment(user.activity.lastEmail); // another date
    const duration = moment.duration(now.diff(end));
    var lastDuration = duration._milliseconds;

    if (lastDuration >= 300000 || _.isUndefined(user.activity.lastEmail)) {
      const lang = user.lang;
      jwt.sign(
        {
          userID: id,
          email: toEmail
        },
        global.secrets.EMAIL_SECRET,
        {
          expiresIn: global.secrets.RESET_SECRET_EXPIRATION
        },
        (err, emailVer) => {
          const body =
            emailTranslate("Hello", lang) +
            " " +
            user.username +
            ", " +
            emailTranslate(
              "It’s time to confirm your email address, just go to this link:",
              lang
            ) +
            " https://foxtailapp.com/confirmation?token=" +
            emailVer +
            " " +
            emailTranslate(
              "*Please Note: Confirming your email will deactivate this email for any other account using it on Foxtail.",
              lang
            ) +
            " " +
            emailTranslate(
              "If you don’t know why you got this email, please tell us straight away so we can fix this for you.",
              lang
            ) +
            " " +
            emailTranslate("Thanks", lang) +
            ", " +
            emailTranslate("Foxtail Security Team", lang) +
            " " +
            "support@foxtailapp.com";

          const htmlBody =
            "<html>\r\n  <head>\r\n    <title>" +
            emailTranslate("Please Verify your Email on Foxtail", lang) +
            "</title>\r\n  </head>\r\n  <body>\r\n" +
            emailTranslate("Hello", lang) +
            " " +
            user.username +
            ", \r\n<br/><p>" +
            emailTranslate(
              "It’s time to confirm your email address, just go to this link:",
              lang
            ) +
            '</p><a href="https://foxtailapp.com/confirmation?token=' +
            emailVer +
            '">https://foxtailapp.com/confirmation?token=' +
            emailVer +
            "</a><br/><p>" +
            emailTranslate(
              "*Please Note: Confirming your email will deactivate this email for any other account using it on Foxtail.",
              lang
            ) +
            "</p>" +
            emailTranslate(
              "If you don’t know why you got this email, please tell us straight away so we can fix this for you.",
              lang
            ) +
            "<p>" +
            emailTranslate("Thanks", lang) +
            "<br/>" +
            emailTranslate("Foxtail Security Team", lang) +
            "<br/>" +
            "support@foxtailapp.com" +
            "</p>" +
            "</body>\r\n</html>";

          const subject = emailTranslate(
            "Please Verify your Email on Foxtail",
            lang
          );

          const params = {
            Destination: {
              ToAddresses: [toEmail]
            },
            Source: "Foxtail <noreply@foxtailapp.com>",
            Message: {
              Body: {
                Html: {
                  Charset: "UTF-8",
                  Data: htmlBody
                },
                Text: {
                  Charset: "UTF-8",
                  Data: body
                }
              },
              Subject: {
                Charset: "UTF-8",
                Data: subject
              }
            }
          };
          SES.sendEmail(params, (err, data) => {
            if (err) {
              console.error("Error sending email", err);
              user.activity.lastEmail = now;
              user.isNew = false;
              user.save();
              clearHash(id);
            } else {
              user.activity.lastEmail = now;
              user.isNew = false;
              user.save();
              clearHash(id);
            }
          });
        }
      );
      return true;
    } else {
      return false;
    }
  } catch (e) {
    console.error(e);
    throw new Error(e);
  }
}

async function newPhoneAcct({ username, email, lang }) {
  try {
    if (process.env.NODE_ENV === "development" && skipDev) {
      return;
    }
    const body =
      emailTranslate("Hello") +
      " " +
      username +
      ", " +
      emailTranslate(
        "The phone number associated with your profile has been used to register a new profile. Therefore, your current account has been deactivated and will be deleted soon.",
        lang
      ) +
      " " +
      emailTranslate(
        "If you don’t know why you got this email, please tell us straight away so we can fix this for you.",
        lang
      ) +
      " " +
      emailTranslate("Thanks", lang) +
      ", " +
      emailTranslate("Foxtail Security Team", lang) +
      " " +
      "support@foxtailapp.com";
    const htmlBody =
      "<html>\r\n  <head>\r\n    <title>" +
      emailTranslate("Old Account Deactivated", lang) +
      "</title>\r\n  </head>\r\n  <body>\r\n" +
      emailTranslate("Hello", lang) +
      " " +
      username +
      ", \r\n<br/><p>" +
      emailTranslate(
        "The phone number associated with your profile has been used to register a new profile. Therefore, your current account has been deactivated and will be deleted soon.",
        lang
      ) +
      "</p>" +
      emailTranslate(
        "If you don’t know why you got this email, please tell us straight away so we can fix this for you.",
        lang
      ) +
      "<p>" +
      emailTranslate("Thanks", lang) +
      "<br/>" +
      emailTranslate("Foxtail Security Team", lang) +
      "<br/>" +
      "support@foxtailapp.com" +
      "</body>\r\n</html>";

    const subject = emailTranslate("Old Account Deactivated", lang);

    let params = {
      Destination: {
        ToAddresses: [email]
      },
      Source: "Foxtail <noreply@foxtailapp.com>",
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: htmlBody
          },
          Text: {
            Charset: "UTF-8",
            Data: body
          }
        },
        Subject: {
          Charset: "UTF-8",
          Data: subject
        }
      }
    };

    SES.sendEmail(params, (err, data) => {
      if (err) {
        console.log("Error sending email", err);
      }
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
  }
}

async function sendPhoneReset({ email, id, username, lang }) {
  let sent = false;
  try {
    if (process.env.NODE_ENV === "development" && skipDev) {
      return;
    }
    sent = await new Promise(res =>
      jwt.sign(
        {
          userID: id
        },
        global.secrets.EMAIL_SECRET,
        {
          expiresIn: global.secrets.RESET_SECRET_EXPIRATION
        },
        async (err, emailVer) => {
          const body =
            emailTranslate("Hello", lang) +
            " " +
            username +
            ", " +
            emailTranslate(
              "We've received a phone login reset for your account. If you're trying to change the phone login to your Foxtail account, just go to this link and click 'Reset Phone' on the popup:",
              lang
            ) +
            " https://foxtailapp.com/phonereset?token=" +
            emailVer +
            " " +
            emailTranslate(
              "If you don’t know why you got this email, please tell us straight away so we can fix this for you.",
              lang
            ) +
            " " +
            emailTranslate("Thanks", lang) +
            ", " +
            emailTranslate("Foxtail Security Team", lang) +
            " " +
            "support@foxtailapp.com";

          const htmlBody =
            "<html>\r\n  <head>\r\n    <title>" +
            emailTranslate("Phone Login Reset Request", lang) +
            "</title>\r\n  </head>\r\n  <body>\r\n" +
            emailTranslate("Hello", lang) +
            " " +
            username +
            ", \r\n<br/><p>" +
            emailTranslate(
              "We've recieved a phone login reset for your account. If you're trying to change the phone login to your Foxtail account, just go to this link and click 'Reset Phone' on the popup:",
              lang
            ) +
            "<br/><br/>" +
            "https://foxtailapp.com/phonereset?token=" +
            emailVer +
            "</p>" +
            emailTranslate(
              "If you don’t know why you got this email, please tell us straight away so we can fix this for you.",
              lang
            ) +
            "<p>" +
            emailTranslate("Thanks", lang) +
            "<br/>" +
            emailTranslate("Foxtail Security Team", lang) +
            "<br/>" +
            "support@foxtailapp.com" +
            "</body>\r\n</html>";

          const subject = emailTranslate("Phone Login Reset Request", lang);

          let params = {
            Destination: {
              ToAddresses: [email]
            },
            Source: "Foxtail <noreply@foxtailapp.com>",
            Message: {
              Body: {
                Html: {
                  Charset: "UTF-8",
                  Data: htmlBody
                },
                Text: {
                  Charset: "UTF-8",
                  Data: body
                }
              },
              Subject: {
                Charset: "UTF-8",
                Data: subject
              }
            }
          };

          SES.sendEmail(params, (err, data) => {
            if (err) {
              console.log("Error sending email", err);
              res(false);
            } else {
              res(true);
            }
          });
        }
      )
    );

    return sent;
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
  }
}

//TODO: BE sure to translate
async function sendPasswordReset({ email, id, username, lang }) {
  let sent = false;
  try {
    //TODO: uncomment
    // if (process.env.NODE_ENV === "development" && skipDev) {
    //   return;
    // }
    sent = await new Promise(res =>
      jwt.sign(
        {
          userID: id
        },
        global.secrets.PASS_SECRET,
        {
          expiresIn: global.secrets.RESET_SECRET_EXPIRATION
        },
        async (err, emailVer) => {
          const body =
            emailTranslate("Hello", lang) +
            " " +
            username +
            ", " +
            emailTranslate(
              "We've received a password reset for your account. If you're trying to change the password to your Foxtail account, just go to this link:",
              lang
            ) +
            " https://foxtailapp.com/passReset?token=" +
            emailVer +
            " " +
            emailTranslate(
              "If you don’t know why you got this email, please tell us straight away so we can fix this for you.",
              lang
            ) +
            " " +
            emailTranslate("Thanks", lang) +
            ", " +
            emailTranslate("Foxtail Security Team", lang) +
            " " +
            "support@foxtailapp.com";

          const htmlBody =
            "<html>\r\n  <head>\r\n    <title>" +
            emailTranslate("Phone Login Reset Request", lang) +
            "</title>\r\n  </head>\r\n  <body>\r\n" +
            emailTranslate("Hello", lang) +
            " " +
            username +
            ", \r\n<br/><p>" +
            emailTranslate(
              "We've received a password reset for your account. If you're trying to change the password to your Foxtail account, just go to this link:",
              lang
            ) +
            "<br/><br/>" +
            "https://foxtailapp.com/passReset?token=" +
            emailVer +
            "</p>" +
            emailTranslate(
              "If you don’t know why you got this email, please tell us straight away so we can fix this for you.",
              lang
            ) +
            "<p>" +
            emailTranslate("Thanks", lang) +
            "<br/>" +
            emailTranslate("Foxtail Security Team", lang) +
            "<br/>" +
            "support@foxtailapp.com" +
            "</body>\r\n</html>";

          const subject = emailTranslate("Password Reset Request", lang);

          let params = {
            Destination: {
              ToAddresses: [email]
            },
            Source: "Foxtail <noreply@foxtailapp.com>",
            Message: {
              Body: {
                Html: {
                  Charset: "UTF-8",
                  Data: htmlBody
                },
                Text: {
                  Charset: "UTF-8",
                  Data: body
                }
              },
              Subject: {
                Charset: "UTF-8",
                Data: subject
              }
            }
          };

          SES.sendEmail(params, (err, data) => {
            if (err) {
              console.log("Error sending email", err);
              res(false);
            } else {
              res(true);
            }
          });
        }
      )
    );

    return sent;
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
  }
}

async function emailEventReminders({ users, eventName, eventDate, eventID }) {
  try {
    if (process.env.NODE_ENV === "development" && skipDev) {
      return;
    }
    const usersByLang = _.groupBy(users, "lang");

    Object.keys(usersByLang).forEach(lang => {
      let users = usersByLang[lang];
      let emails = users.map(user => user.email);

      const body =
        emailTranslate("Hello", lang) +
        ", " +
        emailTranslate(
          "An event you're planning to attend is happening tomorrow at:",
          lang
        ) +
        eventDate +
        "." +
        emailTranslate(
          "Please take a look at the event page to for location and updates:",
          lang
        ) +
        " " +
        "https://www.foxtailapp.com/event/" +
        eventID +
        " " +
        emailTranslate(
          "If your plans have changed please update your attendance on the event.",
          lang
        ) +
        " " +
        emailTranslate("Thanks", lang) +
        ", " +
        emailTranslate("Foxtail Security Team", lang) +
        " " +
        "support@foxtailapp.com";

      const htmlBody =
        "<html>\r\n  <head>\r\n    <title>" +
        emailTranslate("Upcoming Event Reminder:", lang) +
        " " +
        eventName +
        "</title>\r\n  </head>\r\n  <body>\r\n" +
        emailTranslate("Hello", lang) +
        ", \r\n<br/><p>" +
        eventName +
        " " +
        emailTranslate("is happening tomorrow,", lang) +
        " " +
        eventDate +
        ".<br/><br/>" +
        emailTranslate(
          "Please take a look at the event page to for location and updates:",
          lang
        ) +
        "<br/>" +
        "https://www.foxtailapp.com/event/" +
        eventID +
        "<br/><br/>" +
        emailTranslate(
          "If your plans have changed please update your attendance on the event.",
          lang
        ) +
        "</p>" +
        "Foxtail." +
        "</body>\r\n</html>";

      const subject =
        emailTranslate("Upcoming Event Reminder:", lang) + " " + eventName;

      let params = {
        Destination: {
          BccAddresses: emails
        },
        Source: "Foxtail <noreply@foxtailapp.com>",
        Message: {
          Body: {
            Html: {
              Charset: "UTF-8",
              Data: htmlBody
            },
            Text: {
              Charset: "UTF-8",
              Data: body
            }
          },
          Subject: {
            Charset: "UTF-8",
            Data: subject
          }
        }
      };

      SES.sendEmail(params, (err, data) => {
        if (err) {
          console.log("Error sending email", err);
        }
      });
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
  }
}

async function emailEventCancellations({ users, eventName, eventDate }) {
  try {
    if (process.env.NODE_ENV === "development" && skipDev) {
      return;
    }
    const usersByLang = _.groupBy(users, "lang");
    Object.keys(usersByLang).forEach(lang => {
      let users = usersByLang[lang];
      let emails = users.map(user => user.email);

      const body =
        emailTranslate("Hello", lang) +
        ", " +
        eventName +
        emailTranslate("was happening tomorrow at", lang) +
        eventDate +
        ", " +
        emailTranslate("but has been cancelled by its creator.", lang) +
        " " +
        emailTranslate("Thanks", lang) +
        ", " +
        emailTranslate("Foxtail Security Team", lang) +
        " " +
        "support@foxtailapp.com";

      const htmlBody =
        "<html>\r\n  <head>\r\n    <title>" +
        emailTranslate("Event Cancelled:", lang) +
        " " +
        eventName +
        "</title>\r\n  </head>\r\n  <body>\r\n" +
        emailTranslate("Hello", lang) +
        ", \r\n<br/><p>" +
        eventName +
        " " +
        emailTranslate("was happening tomorrow at", lang) +
        " " +
        eventDate +
        ", " +
        emailTranslate("but has been cancelled by its creator.", lang) +
        "</p>" +
        "Foxtail." +
        "</body>\r\n</html>";

      const subject =
        emailTranslate("Event Cancelled:", lang) + " " + eventName;

      let params = {
        Destination: {
          BccAddresses: emails
        },
        Source: "Foxtail <noreply@foxtailapp.com>",
        Message: {
          Body: {
            Html: {
              Charset: "UTF-8",
              Data: htmlBody
            },
            Text: {
              Charset: "UTF-8",
              Data: body
            }
          },
          Subject: {
            Charset: "UTF-8",
            Data: subject
          }
        }
      };

      SES.sendEmail(params, err => {
        if (err) {
          console.log("Error sending email", err);
        }
      });
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
  }
}

async function emailDailyUpdates({ email, likesCount, userName, lang }) {
  try {
    if (process.env.NODE_ENV === "development" && skipDev) {
      return;
    }
    const body =
      emailTranslate("Hello", lang) +
      " " +
      userName +
      ", " +
      emailTranslate("Your profile has been liked by", lang) +
      " " +
      likesCount +
      " " +
      emailTranslate("members today. Don't leave them waiting.", lang);

    const htmlBody =
      "<html>\r\n  <head>\r\n    <title>" +
      userName +
      " " +
      emailTranslate("you got new likes today!", lang) +
      "</title>\r\n  </head>\r\n  <body>\r\n" +
      emailTranslate("Hello", lang) +
      " " +
      userName +
      ",<br/><p>" +
      emailTranslate("Your profile has been liked by", lang) +
      " " +
      likesCount +
      " " +
      emailTranslate("members today. Don't leave them waiting.", lang) +
      "</p>" +
      "Foxtail." +
      "</body>\r\n</html>";

    const subject =
      userName + " " + emailTranslate("you got new likes today!", lang);

    let params = {
      Destination: {
        ToAddresses: [email]
      },
      Source: "Foxtail <noreply@foxtailapp.com>",
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: htmlBody
          },
          Text: {
            Charset: "UTF-8",
            Data: body
          }
        },
        Subject: {
          Charset: "UTF-8",
          Data: subject
        }
      }
    };

    SES.sendEmail(params, (err, data) => {
      if (err) {
        console.log("Error sending email", err);
      }
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
  }
}

async function emailAccountOld({ email, userName, lang }) {
  try {
    if (process.env.NODE_ENV === "development" && skipDev) {
      return;
    }
    const body =
      emailTranslate("Hello", lang) +
      " " +
      userName +
      +emailTranslate(
        "Your account is due to be erased soon. Login now, to show us you're still with us. ",
        lang
      ) +
      " ";
    "https://www.foxtailapp.com/", +" " + "- Fotail.";

    const htmlBody =
      "<html>\r\n  <head>\r\n    <title>" +
      emailTranslate("Foxtail Account will be Erased Soon.", lang) +
      "</title>\r\n  </head>\r\n  <body>\r\n" +
      emailTranslate("Hello", lang) +
      " " +
      userName +
      ",<br/><p>" +
      emailTranslate(
        "Your account is due to be erased soon. Login now, to show us you're still with us.",
        lang
      ) +
      "<br/> " +
      "https://www.foxtailapp.com/" +
      "</p>" +
      "Foxtail." +
      "</body>\r\n</html>";

    const subject =
      userName +
      ", " +
      emailTranslate(
        "where have you been? Your account is due to be erased soon.",
        lang
      );

    let params = {
      Destination: {
        ToAddresses: [email]
      },
      Source: "Foxtail <noreply@foxtailapp.com>",
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: htmlBody
          },
          Text: {
            Charset: "UTF-8",
            Data: body
          }
        },
        Subject: {
          Charset: "UTF-8",
          Data: subject
        }
      }
    };

    SES.sendEmail(params, (err, data) => {
      if (err) {
        console.log("Error sending email", err);
      }
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
  }
}

async function emailDeleted({ email, userName, lang }) {
  try {
    if (process.env.NODE_ENV === "development" && skipDev) {
      return;
    }
    const body =
      emailTranslate("Hello", lang) +
      " " +
      userName +
      +emailTranslate(
        "Your account has been deleted from Foxtail. If you have a moment, please let us know if there is anything we can do to improve at support@foxtailapp.com.",
        lang
      ) +
      "- Fotail.";

    const htmlBody =
      "<html>\r\n  <head>\r\n    <title>" +
      emailTranslate("Foxtail Account has been Deleted.", lang) +
      "</title>\r\n  </head>\r\n  <body>\r\n" +
      emailTranslate("Hello", lang) +
      " " +
      userName +
      ",<br/><p>" +
      emailTranslate(
        "Your account has been deleted from Foxtail. If you have a moment, please let us know if there is anything we can do to improve at support@foxtailapp.com.",
        lang
      ) +
      "</p>" +
      "Foxtail." +
      "</body>\r\n</html>";

    const subject =
      userName +
      ", " +
      emailTranslate("Your Foxtail Account has been Deleted.", lang);

    let params = {
      Destination: {
        ToAddresses: [email]
      },
      Source: "Foxtail <noreply@foxtailapp.com>",
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: htmlBody
          },
          Text: {
            Charset: "UTF-8",
            Data: body
          }
        },
        Subject: {
          Charset: "UTF-8",
          Data: subject
        }
      }
    };

    SES.sendEmail(params, (err, data) => {
      if (err) {
        console.log("Error sending email", err);
      }
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
  }
}

async function sendEmailToAdmin({ name, email, text, user }) {
  try {
    if (process.env.NODE_ENV === "development" && skipDev) {
      return;
    }
    const subject = user ? "User Mail" : "Guest Mail";
    const body =
      "Name: " + name + "<br/> Email: " + email + "<br/>Details: " + text;
    let params = {
      Destination: {
        ToAddresses: ["hello@foxtailapp.com"]
      },
      Source: "Foxtail <noreply@foxtailapp.com>",
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: body
          },
          Text: {
            Charset: "UTF-8",
            Data: body
          }
        },
        Subject: {
          Charset: "UTF-8",
          Data: subject
        }
      }
    };

    SES.sendEmail(params, (err, data) => {
      if (err) {
        console.log("Error sending email", err);
      }
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
  }
}

async function sendBonusEmailToUser({ name, email, renewal, lang }) {
  try {
    if (process.env.NODE_ENV === "development" && skipDev) {
      return;
    }
    const body =
      emailTranslate("Congratulations", lang) +
      " " +
      name +
      ". " +
      emailTranslate("Someone has joined using your referral code.", lang) +
      " " +
      emailTranslate(
        "We've upgraded you to Black Membership for 1 week (if you already have Black Membership, we've extended it by 1 week).",
        lang
      ) +
      " " +
      emailTranslate("Your new renewal/ending date is:", lang) +
      " " +
      renewal +
      ". " +
      emailTranslate(
        "We will add more weeks the more you share Foxtail. Thanks for sharing :)",
        lang
      );

    const htmlBody =
      "<html>\r\n  <head>\r\n    <title>" +
      emailTranslate("Congratulations", lang) +
      " " +
      name +
      "</title>\r\n  </head>\r\n  <body>\r\n" +
      emailTranslate("Congratulations", lang) +
      " " +
      name +
      "! <p>" +
      emailTranslate(
        "Someone has joined Foxtail using your referral code.",
        lang
      ) +
      " <br/>" +
      emailTranslate(
        "We've upgraded you to Black Membership for 1 week (if you already have Black Membership, we've extended it by 1 week).",
        lang
      ) +
      "<br/>" +
      emailTranslate("Your new renewal/ending date is:", lang) +
      " " +
      renewal +
      ". <br/><br/>" +
      emailTranslate(
        "We will add more weeks the more you share Foxtail. Thanks for sharing :)",
        lang
      ) +
      "</p>" +
      "Foxtail." +
      "</body>\r\n</html>";

    const subject = emailTranslate(
      "Black Membership Referral Bonus Activated",
      lang
    );

    let params = {
      Destination: {
        ToAddresses: [email]
      },
      Source: "Foxtail <noreply@foxtailapp.com>",
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: htmlBody
          },
          Text: {
            Charset: "UTF-8",
            Data: body
          }
        },
        Subject: {
          Charset: "UTF-8",
          Data: subject
        }
      }
    };

    SES.sendEmail(params, (err, data) => {
      if (err) {
        console.log("Error sending email", err);
      }
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
  }
}

async function sendBlkCancelToUser({ name, email, lang }) {
  try {
    if (process.env.NODE_ENV === "development" && skipDev) {
      return;
    }
    const body =
      emailTranslate("Hello", lang) +
      " " +
      name +
      ", " +
      emailTranslate(
        "Your Black Membership has been successfully canceled; you won't be charged any further.",
        lang
      ) +
      " " +
      emailTranslate(
        "Please note: The photo limit on free accounts is 4, we've removed any photos over this limit.",
        lang
      ) +
      " " +
      emailTranslate(
        "If you have any suggestions to improve Foxtail or Black Membership, please let us know at hello@foxtailapp.com.",
        lang
      ) +
      " " +
      emailTranslate("Thanks for being the best part of Foxtail :)", lang) +
      " " +
      "- Foxtail.";

    const htmlBody =
      "<html>\r\n  <head>\r\n    <title>" +
      emailTranslate("Black Membership Cancelled Successfully", lang) +
      " " +
      name +
      "</title>\r\n  </head>\r\n  <body>\r\n" +
      emailTranslate("Hello", lang) +
      " " +
      name +
      " <p>" +
      emailTranslate(
        "Your Black Membership has been successfully canceled; you won't be charged any further.",
        lang
      ) +
      "<br/>" +
      emailTranslate(
        "Please note: The photo limit on free accounts is 4, we've removed any photos over this limit.",
        lang
      ) +
      "<br/><br/>" +
      emailTranslate(
        "If you have any suggestions to improve Foxtail or Black Membership, please let us know at hello@foxtailapp.com.",
        lang
      ) +
      "<br/>" +
      emailTranslate("Thanks for being the best part of Foxtail :)", lang) +
      "</p>" +
      "Foxtail." +
      "</body>\r\n</html>";

    const subject = emailTranslate(
      "Black Membership Cancelled Successfully",
      lang
    );

    let params = {
      Destination: {
        ToAddresses: [email]
      },
      Source: "Foxtail <noreply@foxtailapp.com>",
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: htmlBody
          },
          Text: {
            Charset: "UTF-8",
            Data: body
          }
        },
        Subject: {
          Charset: "UTF-8",
          Data: subject
        }
      }
    };

    SES.sendEmail(params, (err, data) => {
      if (err) {
        console.log("Error sending email", err);
      }
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
  }
}

async function sendCoupleLink({ name, email, lang, theirName }) {
  try {
    if (process.env.NODE_ENV === "development" && skipDev) {
      return;
    }
    const body =
      emailTranslate("Hello", lang) +
      " " +
      name +
      ", " +
      emailTranslate("Congratulations! Your Couple's Profile with", lang) +
      " " +
      theirName +
      " " +
      emailTranslate(
        "has been created. Please complete your new profile together.",
        lang
      ) +
      " " +
      emailTranslate("Thanks for being the best part of Foxtail :)", lang) +
      " " +
      "- Foxtail.";

    const htmlBody =
      "<html>\r\n  <head>\r\n    <title>" +
      emailTranslate("Couple's Profile Created Successfully", lang) +
      " " +
      name +
      "</title>\r\n  </head>\r\n  <body>\r\n" +
      emailTranslate("Hello", lang) +
      " " +
      name +
      " <p>" +
      emailTranslate("Congratulations! Your Couple's Profile' with", lang) +
      " " +
      theirName +
      " " +
      emailTranslate(
        "has been created. Please complete your new profile together.",
        lang
      ) +
      "<br/><br/>" +
      emailTranslate("Thanks for being the best part of Foxtail :)", lang) +
      "</p>" +
      "Foxtail." +
      "</body>\r\n</html>";

    const subject = emailTranslate("Couple's Profile Created", lang);

    let params = {
      Destination: {
        ToAddresses: [email]
      },
      Source: "Foxtail <noreply@foxtailapp.com>",
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: htmlBody
          },
          Text: {
            Charset: "UTF-8",
            Data: body
          }
        },
        Subject: {
          Charset: "UTF-8",
          Data: subject
        }
      }
    };

    SES.sendEmail(params, (err, data) => {
      if (err) {
        console.log("Error sending email", err);
      }
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
  }
}

async function sendCoupleUnLink({ name, email, lang }) {
  try {
    if (process.env.NODE_ENV === "development" && skipDev) {
      return;
    }
    const body =
      emailTranslate("Hello", lang) +
      " " +
      name +
      ", " +
      emailTranslate(
        "Your Couple's Profile has been removed. Please update your original profile on the settings page.",
        lang
      ) +
      " " +
      emailTranslate("Thanks for being the best part of Foxtail :)", lang) +
      " " +
      "- Foxtail.";

    const htmlBody =
      "<html>\r\n  <head>\r\n    <title>" +
      emailTranslate("Couple's Profile Removed Successfully", lang) +
      " " +
      name +
      "</title>\r\n  </head>\r\n  <body>\r\n" +
      emailTranslate("Hello", lang) +
      " " +
      name +
      " <p>" +
      emailTranslate(
        "Your Couple's Profile has been removed. Please update your original profile on the settings page.",
        lang
      ) +
      "<br/><br/>" +
      emailTranslate("Thanks for being the best part of Foxtail :)", lang) +
      "</p>" +
      "Foxtail." +
      "</body>\r\n</html>";

    const subject = emailTranslate("Couple's Profile Removed", lang);

    let params = {
      Destination: {
        ToAddresses: [email]
      },
      Source: "Foxtail <noreply@foxtailapp.com>",
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: htmlBody
          },
          Text: {
            Charset: "UTF-8",
            Data: body
          }
        },
        Subject: {
          Charset: "UTF-8",
          Data: subject
        }
      }
    };

    SES.sendEmail(params, (err, data) => {
      if (err) {
        console.log("Error sending email", err);
      }
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
  }
}

async function sendWelcome({ name, email, lang }) {
  try {
    if (process.env.NODE_ENV === "development" && skipDev) {
      return;
    }
    const body =
      emailTranslate("Welcome to Foxtail", lang) +
      " " +
      name +
      ", " +
      emailTranslate(
        "Your profile has been created but it’s not finished yet, please login to fill it out.",
        lang
      ) +
      " " +
      emailTranslate(
        "When filling out your profile keep in mind “Honesty is Sexy.” Foxtail is a non-judgmental social network for the likeminded and curious to find each other, there’s no reason to be shy.",
        lang
      ) +
      " " +
      emailTranslate(
        "If you’re a couple, you’ll find the “Create Couple’s Profile” to the left of the My Account page. Copy the code displayed then send it to your partner. Once they create an account, they will be able to use this code to create a new Couple’s Profile which will be fully accessible to you both.",
        lang
      ) +
      " " +
      emailTranslate(
        "Feel free to invite any curious friends or acquaintances who might be interested in joining our community. You will receive a free week of our Premium Black membership for EACH friend you refer. To get credit, use links within the app (sharing your profile, others, or the site itself).",
        lang
      ) +
      " " +
      emailTranslate(
        "Lastly, please take a moment to read our rules found at https://www.foxtailapp.com/tos",
        lang
      ) +
      " " +
      emailTranslate("Enjoy!", lang) +
      " " +
      "Foxtail." +
      " " +
      emailTranslate("-Stray Together-", lang);

    const htmlBody =
      "<html>\r\n  <head>\r\n    <title>" +
      emailTranslate("Welcome to Foxtail", lang) +
      " " +
      name +
      "</title>\r\n  </head>\r\n  <body>\r\n" +
      emailTranslate("Welcome to Foxtail", lang) +
      " " +
      name +
      ", <p>" +
      emailTranslate(
        "Your profile has been created but it’s not finished yet, please login to fill it out. ",
        lang
      ) +
      " " +
      emailTranslate(
        "When filling out your profile keep in mind “Honesty is Sexy.” Foxtail is a non-judgmental social network for the likeminded and curious to find each other, there’s no reason to be shy.",
        lang
      ) +
      "<br/><br/>" +
      emailTranslate(
        "If you’re a couple, you’ll find the “Create Couple’s Profile” to the left of the My Account page. Copy the code displayed then send it to your partner. Once they create an account, they will be able to use this code to create a new Couple’s Profile which will be fully accessible to you both.",
        lang
      ) +
      "<br/><br/>" +
      emailTranslate(
        "Feel free to invite any curious friends or acquaintances who might be interested in joining our community. You will receive a free week of our Premium Black membership for EACH friend you refer. To get credit, use links within the app (sharing your profile, others, or the site itself).",
        lang
      ) +
      "<br/><br/>" +
      emailTranslate(
        "Lastly, please take a moment to read our rules found at https://www.foxtailapp.com/tos",
        lang
      ) +
      "<br/><br/>" +
      emailTranslate("Enjoy!", lang) +
      "</p>" +
      "Foxtail." +
      "<br/><br/>" +
      emailTranslate("-Stray Together-", lang) +
      "</body>\r\n</html>";

    const subject = emailTranslate("Welcome to Foxtail", lang);

    let params = {
      Destination: {
        ToAddresses: [email]
      },
      Source: "Foxtail <noreply@foxtailapp.com>",
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: htmlBody
          },
          Text: {
            Charset: "UTF-8",
            Data: body
          }
        },
        Subject: {
          Charset: "UTF-8",
          Data: subject
        }
      }
    };

    SES.sendEmail(params, (err, data) => {
      if (err) {
        console.log("Error sending email", err);
      }
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
  }
}

module.exports = {
  sendEmailToProfile,
  sendVerEMail,
  newPhoneAcct,
  sendPhoneReset,
  emailEventReminders,
  emailDailyUpdates,
  emailAccountOld,
  sendEmailToAdmin,
  sendBonusEmailToUser,
  sendBlkCancelToUser,
  sendCoupleUnLink,
  sendCoupleLink,
  sendPasswordReset,
  emailEventCancellations,
  emailDeleted,
  sendWelcome
};
