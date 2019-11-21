/**
 * Application Entry point
 * @type {createApplication}
 */
const secretsUtil = require("./utils/secrets");
secretsUtil
  .getSecrets()
  .then(() => {
    require("./app");
  })
  .catch(err => console.error(err));
