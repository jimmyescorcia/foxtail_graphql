exports.isAuthenticated = context => {
  if (context.user) {
    if (context.user.active) {
      return true;
    } else if (context.user.captchaReq) {
      throw new Error("Client: Please complete captcha");
    } else {
      throw new Error("User is not active.");
    }
  }
  throw new Error("User is not logged in (or authenticated).");
};
