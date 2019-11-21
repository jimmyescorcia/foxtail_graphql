const GraphQL = require("graphql");
const validator = require("validator");
const { ObjectID } = require("mongodb");

const auth = require("../../config/auth");
const {
  sexOptions,
  desireOptions,
  genderOptions,
  sexualityOptions,
  langOptions
} = require("../../config/listOptions");
const FBResolver = require("../resolvers/FB");

const {
  GraphQLNonNull,
  GraphQLString,
  GraphQLInt,
  GraphQLList,
  GraphQLBoolean,
  GraphQLFloat
} = GraphQL;

// lets import our user type
const { tokenType } = require("../types/Generic");

// lets import our user resolver
const UserResolver = require("../resolvers/User");

module.exports = {
  testload: {
    type: GraphQLBoolean,
    args: {
      number: {
        type: new GraphQLNonNull(GraphQLInt)
      },
      stock: {
        type: GraphQLBoolean
      }
    },
    resolve(parentValue, { number, stock }, req) {
      return UserResolver.testload(number, stock);
    }
  },

  login: {
    type: new GraphQLList(tokenType),
    description: "Login User",
    args: {
      phone: {
        type: new GraphQLNonNull(GraphQLString),
        description: "Phone number login"
      },
      password: {
        type: GraphQLString
      }
    },
    resolve(parentValue, args, req) {
      //TODO: Diable pre launch
      // if (
      //   process.env.NODE_ENV === "development" ||
      //   process.env.NODE_ENV === "staging"
      // ) {
      if (!validator.isIn(args.phone, ["1", "2", "3", "4", "5"])) {
        throw new TypeError("Client: Phone number is invalid.");
      }
      if (args.password) {
        if (
          !validator.isAlphanumeric(validator.blacklist(args.password, " "))
        ) {
          throw new Error(
            "Client: Password may only contain letters and numbers."
          );
        }
      }
      return UserResolver.login(args);
      //}
    }
  },

  create: {
    type: new GraphQLList(tokenType),
    description: "Add new User",
    args: {
      email: {
        type: new GraphQLNonNull(GraphQLString),
        description: "Enter email"
      },
      password: {
        type: GraphQLString
      },
      username: {
        type: new GraphQLNonNull(GraphQLString),
        description: "Enter your name, Cannot be left empty"
      },
      phone: {
        type: new GraphQLNonNull(GraphQLString),
        description: "Enter mobile number"
      },
      lang: {
        type: GraphQLString
      },
      dob: {
        type: new GraphQLNonNull(GraphQLString)
      },
      gender: {
        type: new GraphQLNonNull(GraphQLString)
      },
      interestedIn: {
        type: new GraphQLList(GraphQLString)
      }
    },
    resolve(parentValue, args, req) {
      if (
        !validator.isIn(args.phone, ["1", "2", "3", "4", "5"]) &&
        !validator.isMobilePhone(args.phone)
      ) {
        throw new Error("Client: Invalid phone number.");
      }

      args.interestedIn.forEach(element => {
        if (!validator.isIn(element, sexOptions)) {
          throw new Error("Client: Invalid interested in selection.");
        }
      });

      if (!validator.isEmail(args.email)) {
        throw new Error("Client: Invalid phone number.");
      }
      if (args.lang && !validator.isIn(args.lang, langOptions)) {
        throw new TypeError("Client: Language selection is invalid.");
      }
      if (
        !validator.isLength(args.username, {
          min: 3,
          max: 120
        })
      ) {
        throw new Error(
          "Client: Username should be bewteen 3 and 30 characters."
        );
      }

      if (!validator.isAlphanumeric(validator.blacklist(args.username, " "))) {
        throw new Error(
          "Client: Username may only contain letters and numbers."
        );
      }
      if (args.password) {
        if (
          !validator.isAlphanumeric(validator.blacklist(args.password, " "))
        ) {
          throw new Error(
            "Client: Password may only contain letters and numbers."
          );
        }
      }

      let date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setFullYear(date.getFullYear() - 18);

      if (validator.isAfter(args.dob, date.toDateString())) {
        throw new Error("Client: You must be at least 18 years old to join.");
      }
      if (!validator.isIn(args.gender, genderOptions)) {
        throw new TypeError("Client: Sex is invalid.");
      }

      return UserResolver.create(args);
    }
  },

  fbResolve: {
    type: new GraphQLList(tokenType),
    args: {
      csrf: {
        type: new GraphQLNonNull(GraphQLString)
      },
      code: {
        type: new GraphQLNonNull(GraphQLString)
      },
      isCreate: {
        type: new GraphQLNonNull(GraphQLBoolean)
      },
      email: {
        type: GraphQLString,
        description: "Enter email"
      },
      password: {
        type: GraphQLString
      },
      username: {
        type: GraphQLString,
        description: "Enter your name, Cannot be left empty"
      },
      lang: {
        type: GraphQLString
      },
      dob: {
        type: GraphQLString
      },
      gender: {
        type: GraphQLString
      },
      interestedIn: {
        type: new GraphQLList(GraphQLString)
      },
      refer: {
        type: GraphQLString
      },
      aff: {
        type: GraphQLString
      }
    },
    resolve(
      parentValue,
      {
        csrf,
        code,
        isCreate,
        email,
        password,
        username,
        lang,
        dob,
        gender,
        interestedIn,
        refer,
        aff
      },
      req
    ) {
      const createData = {
        email,
        password,
        username,
        lang,
        dob,
        gender,
        interestedIn,
        refer,
        aff
      };
      if (isCreate && createData) {
        if (!validator.isEmail(createData.email)) {
          throw new Error("Client: Invalid email.");
        }

        if (!validator.isIn(lang, langOptions)) {
          throw new TypeError("Client: Language selection is invalid.");
        }
        interestedIn.forEach(element => {
          if (!validator.isIn(element, sexOptions)) {
            throw new Error("Client: Invalid interested in selection.");
          }
        });
        if (!validator.isIn(gender, genderOptions)) {
          throw new TypeError("Client: Sex is invalid.");
        }
        if (
          !validator.isLength(createData.username, {
            min: 3,
            max: 120
          })
        ) {
          throw new Error(
            "Client: Event description should be between 3 and 120 characters."
          );
        }

        if (
          !validator.isAlphanumeric(
            validator.blacklist(createData.username, " ")
          )
        ) {
          throw new Error(
            "Client: Username may only contain letters and numbers."
          );
        }

        if (createData.password) {
          if (
            !validator.isAlphanumeric(
              validator.blacklist(createData.password, " ")
            )
          ) {
            throw new Error(
              "Client: Password may only contain letters and numbers."
            );
          }
        }

        let date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setFullYear(date.getFullYear() - 18);
        if (validator.isAfter(createData.dob, date.toDateString())) {
          throw new Error("Client: You must be at least 18 years old to join.");
        }
        if (!validator.isIn(createData.gender, genderOptions)) {
          throw new TypeError("Client: Sex is invalid.");
        }

        return FBResolver.fbResolve({
          csrf,
          code,
          createData,
          isCreate,
          password
        });
      }
      return FBResolver.fbResolve({ csrf, code, password });
    }
  },

  updateSettings: {
    type: GraphQLBoolean,
    args: {
      distance: {
        type: GraphQLInt
      },
      distanceMetric: {
        type: GraphQLString
      },
      ageRange: {
        type: new GraphQLList(GraphQLInt)
      },
      interestedIn: {
        type: new GraphQLList(GraphQLString)
      },
      city: {
        type: GraphQLString
      },
      country: {
        type: GraphQLString
      },
      lang: {
        type: GraphQLString
      },
      username: {
        type: GraphQLString
      },
      gender: {
        type: GraphQLString
      },
      email: {
        type: GraphQLString
      },
      phone: {
        type: GraphQLString
      },
      long: {
        type: GraphQLFloat
      },
      lat: {
        type: GraphQLFloat
      },
      visible: {
        type: GraphQLBoolean
      },
      newMsgNotify: {
        type: GraphQLBoolean
      },
      emailNotify: {
        type: GraphQLBoolean
      },
      showOnline: {
        type: GraphQLBoolean
      },
      likedOnly: {
        type: GraphQLBoolean
      },
      vibrateNotify: {
        type: GraphQLBoolean
      },
      about: {
        type: GraphQLString
      },
      profilePic: {
        type: GraphQLString
      },
      sexuality: {
        type: GraphQLString
      },
      desires: {
        type: new GraphQLList(GraphQLString)
      },
      publicPhotoList: {
        type: new GraphQLList(GraphQLString)
      },
      privatePhotoList: {
        type: new GraphQLList(GraphQLString)
      },
      includeMsgs: {
        type: GraphQLBoolean
      },
      profileID: {
        type: GraphQLString
      }
    },
    resolve(parentValue, args, req) {
      if (auth.isAuthenticated(req)) {
        const {
          ageRange,
          lang,
          username,
          email,
          gender,
          phone,
          interestedIn,
          about,
          desires,
          sexuality,
          profileID
        } = args;
        if (profileID && !ObjectID.isValid(profileID)) {
          throw new Error("Client: ID Invalid.");
        }

        if (
          username &&
          !validator.isLength(username, {
            min: 3,
            max: 30
          })
        ) {
          throw new Error(
            "Client: Username should be bewteen 3 and 30 characters."
          );
        }
        if (
          about &&
          !validator.isLength(about, {
            max: 500
          })
        ) {
          throw new Error("Client: Bio should be a maximum of 500 characters.");
        }
        if (phone && !validator.isMobilePhone(phone)) {
          throw new Error("Client: Phone Number invalid.");
        }
        if (email && !validator.isEmail(email)) {
          throw new Error("Client: Email Invalid.");
        }

        if (
          about &&
          !validator.isLength(about, {
            min: 3,
            max: 500
          })
        ) {
          throw new Error("Client: Bio should be a maximum of 500 characters.");
        }
        if (gender && !validator.isIn(gender, genderOptions)) {
          throw new TypeError("Client: Sex is invalid.");
        }
        if (interestedIn) {
          interestedIn.forEach(element => {
            if (!validator.isIn(element, sexOptions)) {
              throw new Error("Client: Invalid interested in selection.");
            }
          });
        }

        if (lang && !validator.isIn(lang, langOptions)) {
          throw new TypeError("Client: Language selection is invalid.");
        }

        if (sexuality && !validator.isIn(sexuality, sexualityOptions)) {
          throw new TypeError("Client: Sexuality selection is invalid.");
        }

        if (desires) {
          desires.forEach(element => {
            if (!validator.isIn(element, desireOptions)) {
              throw new Error("Client: Invalid desire in selection.");
            }
          });
        }

        if (
          ageRange &&
          (ageRange[0] < 18 || ageRange[1] > 80 || ageRange[0] > ageRange[1])
        ) {
          throw new Error("Client: Invalid age range selection.");
        }

        return UserResolver.updateSettings(args, req);
      }
    }
  },

  submitPhoto: {
    type: GraphQLBoolean,
    args: {
      image: {
        type: new GraphQLNonNull(GraphQLString)
      },
      type: {
        type: new GraphQLNonNull(GraphQLString)
      }
    },
    resolve(parentValue, { type, image }, req) {
      if (auth.isAuthenticated(req)) {
        return UserResolver.submitPhoto({
          type,
          image,
          req
        });
      }
    }
  },

  deleteUser: {
    type: GraphQLBoolean,
    resolve(parentValue, {}, req) {
      if (auth.isAuthenticated(req)) {
        return UserResolver.deleteUser(req);
      }
    }
  },

  fbResetPhone: {
    type: GraphQLBoolean,
    args: {
      csrf: {
        type: new GraphQLNonNull(GraphQLString)
      },
      code: {
        type: new GraphQLNonNull(GraphQLString)
      },
      token: {
        type: GraphQLString
      }
    },
    resolve(parentValue, args, req) {
      return FBResolver.fbResetPhone(args, req);
    }
  },

  resetPassword: {
    type: GraphQLBoolean,
    args: {
      password: {
        type: new GraphQLNonNull(GraphQLString)
      },
      token: {
        type: GraphQLString
      }
    },
    resolve(parentValue, args, req) {
      const { password, token } = args;
      if (password) {
        if (!validator.isAlphanumeric(validator.blacklist(password, " "))) {
          throw new Error(
            "Client: Password may only contain letters and numbers."
          );
        }
      }

      if (!token) {
        if (auth.isAuthenticated(req)) {
          args.user = req.user;
        }
      }
      return FBResolver.resetPassword(args, req);
    }
  },

  //TODO: validate
  createSubcription: {
    type: GraphQLBoolean,
    args: {
      ccnum: {
        type: new GraphQLNonNull(GraphQLString)
      },
      exp: {
        type: new GraphQLNonNull(GraphQLString)
      },
      cvc: {
        type: new GraphQLNonNull(GraphQLString)
      },
      fname: {
        type: new GraphQLNonNull(GraphQLString)
      },
      lname: {
        type: new GraphQLNonNull(GraphQLString)
      }
    },
    async resolve(parentValue, { ccnum, exp, cvc, fname, lname }, req) {
      if (auth.isAuthenticated(req)) {
        return await UserResolver.createSubscription({
          ccnum,
          exp,
          cvc,
          fname,
          lname,
          req
        });
      }
    }
  },

  cancelSubcription: {
    type: GraphQLBoolean,
    async resolve(parentValue, {}, req) {
      if (auth.isAuthenticated(req)) {
        return await UserResolver.cancelSubcription({ req });
      }
    }
  },

  updateNotifications: {
    type: GraphQLBoolean,
    args: {
      notificationIDs: {
        type: new GraphQLNonNull(new GraphQLList(GraphQLString))
      },
      read: {
        type: GraphQLBoolean
      },
      seen: {
        type: GraphQLBoolean
      }
    },
    resolve(parentValue, { notificationIDs, read, seen }, req) {
      if (auth.isAuthenticated(req)) {
        return UserResolver.updateNotifications({
          notificationIDs,
          read,
          seen,
          req
        });
      }
    }
  },

  updateLocation: {
    type: GraphQLBoolean,
    args: {
      lat: {
        type: new GraphQLNonNull(GraphQLFloat)
      },
      long: {
        type: new GraphQLNonNull(GraphQLFloat)
      },
      city: {
        type: new GraphQLNonNull(GraphQLString)
      },
      country: {
        type: GraphQLString
      }
    },
    resolve(parentValue, { lat, long, city, country }, req) {
      if (auth.isAuthenticated(req)) {
        return UserResolver.updateLocation({
          lat,
          long,
          city,
          country,
          req
        });
      }
    }
  },

  seenTour: {
    type: GraphQLBoolean,
    args: {
      tour: {
        type: new GraphQLNonNull(GraphQLString)
      }
    },
    resolve(parentValue, { tour }, req) {
      if (auth.isAuthenticated(req)) {
        return UserResolver.seenTour({
          tour,
          req
        });
      }
    }
  },

  sendPhoneResetEmail: {
    type: GraphQLBoolean,
    args: {
      phone: {
        type: new GraphQLNonNull(GraphQLString)
      }
    },
    resolve(parentValue, args) {
      return UserResolver.sendPhoneResetEmail(args);
    }
  },

  sendPasswordResetEmail: {
    type: GraphQLBoolean,
    args: {
      phone: {
        type: new GraphQLNonNull(GraphQLString)
      },
      email: {
        type: new GraphQLNonNull(GraphQLString)
      }
    },
    resolve(parentValue, args) {
      return UserResolver.sendPasswordResetEmail(args);
    }
  },

  messageAdmin: {
    type: GraphQLBoolean,
    args: {
      name: {
        type: GraphQLString
      },
      email: {
        type: GraphQLString
      },
      text: {
        type: new GraphQLNonNull(GraphQLString)
      }
    },
    resolve(parentValue, { name, email, text }, req) {
      if (email && !validator.isEmail(email)) {
        throw new Error("Client: Invalid email.");
      }

      if (
        name &&
        !validator.isLength(name, {
          min: 1,
          max: 120
        })
      ) {
        throw new Error(
          "Client: Please keep name between 1 and 120 characters."
        );
      }

      if (name && !validator.isAlpha(validator.blacklist(name, " "))) {
        throw new Error("Client: Name may only contain letters.");
      }
      return UserResolver.messageAdmin({
        name,
        email,
        text,
        req
      });
    }
  },

  resendVerEMail: {
    type: GraphQLBoolean,
    args: {},
    resolve(parentValue, {}, req) {
      if (auth.isAuthenticated(req)) {
        return UserResolver.resendVerEMail({
          req
        });
      }
    }
  }

  // canceledMemberships: {
  //   type: GraphQLBoolean,
  //   args: {},
  //   resolve(parentValue, {}, req) {
  //     return UserResolver.canceledMemberships();
  //   }
  // },

  // removeOldAccounts: {
  //   type: GraphQLBoolean,
  //   args: {},
  //   resolve(parentValue, {}, req) {
  //     return UserResolver.removeOldAccounts();
  //   }
  // }
};
