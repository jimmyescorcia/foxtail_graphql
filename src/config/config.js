const config = {
  appVersion: "0.3.42",
  mobileNumberLocale: "en-IN",
  minPasswordLength: 6,
  devicePlatforms: {
    ANDROID: "android",
    IOS: "ios"
  },
  user: {
    status: {
      ACTIVE: "active",
      DISABLED: "disabled"
    }
  },
  flagTypes: {
    Profile: "Profile",
    Chat: "Chat",
    Event: "Event",
    User: "User"
  },
  generateOtp: () => {
    return Math.floor(1000 + Math.random() * 9000);
  }
};
module.exports = config;
