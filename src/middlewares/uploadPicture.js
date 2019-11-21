const uuid = require("uuid/v1");
const Sentry = require("@sentry/node");
if (
  process.env.NODE_ENV === "development" ||
  process.env.NODE_ENV === "staging"
) {
  require("dotenv").config();
}

const sanitize = require("sanitize-filename");

const AWS = require("aws-sdk");

const s3 = new AWS.S3();

const s3SignUrl = async ({ filename, filetype }) => {
  try {
    const key = `${uuid()}` + sanitize(filename);

    const signedRequest = await s3.getSignedUrl("putObject", {
      Bucket: global.secrets.AWS_PROFILE_IMAGE_BUCKET,
      ContentType: filetype,
      Key: "imgs/" + key,
      Expires: 60
    });

    return {
      signedRequest,
      key
    };
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
};

const getSignedUrl = async key => {
  try {
    const url = await s3.getSignedUrl("getObject", {
      Bucket: global.secrets.AWS_PROFILE_IMAGE_BUCKET,
      Key: "imgs/" + key,
      Expires: 3600
    });

    //for test without using aws
    //const url = "";

    return url;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
};

const deleteFromS3 = keys => {
  try {
    const keyObjs = Array.from(
      keys.map(key => {
        return {
          Key: key
        };
      })
    );

    s3.deleteObjects(
      {
        Bucket: global.secrets.AWS_PROFILE_IMAGE_BUCKET,
        Delete: {
          Objects: keyObjs,
          Quiet: false
        }
      },
      function(err, data) {
        if (err) console.log(err, err.stack);
      }
    );

    return true;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
};

module.exports = { s3SignUrl, getSignedUrl, deleteFromS3 };
