if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}
const Sentry = require("@sentry/node");

const AWS = require("aws-sdk");

const awsParams =
  process.env.NODE_ENV === "production"
    ? {
        signatureVersion: "v4",
        region: process.env.AWS_REGION
      }
    : {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_KEY,
        signatureVersion: "v4",
        region: process.env.AWS_REGION
      };

AWS.config.update(awsParams);
// Create a Secrets Manager client
var SM = new AWS.SecretsManager({
  region: process.env.AWS_REGION
});

async function getSecrets() {
  try {
    if (process.env.NODE_ENV !== "production") {
      let keys;
      if (process.env.NODE_ENV === "staging") {
        keys = await require("../devkeys");
      } else if (process.env.NODE_ENV === "development") {
        keys = await require("../localkeys");
      }

      global.secrets = keys;
      return;
    }
    const data = await SM.getSecretValue({
      SecretId: "foxtail/prod/apikeys"
    }).promise();
    let secretVal;
    // Decrypts secret using the associated KMS CMK.
    // Depending on whether the secret is a string or binary, one of these fields will be populated.
    if ("SecretString" in data) {
      secret = data.SecretString;
    } else {
      let buff = new Buffer(data.SecretBinary, "base64");
      decodedBinarySecret = buff.toString("ascii");
    }

    secretVal = secret || buff;
    global.secrets = JSON.parse(secretVal);

    return;
  } catch (err) {
    console.error(err);
    Sentry.captureException(err);
    if (err.code === "DecryptionFailureException")
      // Secrets Manager can't decrypt the protected secret text using the provided KMS key.
      // Deal with the exception here, and/or rethrow at your discretion.
      throw err;
    else if (err.code === "InternalServiceErrorException")
      // An error occurred on the server side.
      // Deal with the exception here, and/or rethrow at your discretion.
      throw err;
    else if (err.code === "InvalidParameterException")
      // You provided an invalid value for a parameter.
      // Deal with the exception here, and/or rethrow at your discretion.
      throw err;
    else if (err.code === "InvalidRequestException")
      // You provided a parameter value that is not valid for the current state of the resource.
      // Deal with the exception here, and/or rethrow at your discretion.
      throw err;
    else if (err.code === "ResourceNotFoundException")
      // We can't find the resource that you asked for.
      // Deal with the exception here, and/or rethrow at your discretion.
      throw err;
  }
}

module.exports = {
  getSecrets
};
