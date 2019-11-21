const mongoose = require("mongoose");

const URLSchema = new mongoose.Schema({
  fullUrl: String,
  shortenedUrl: String,
  lastUsed: {
    type: Date,
    default: Date.now()
  }
});

const URL = mongoose.model("URL", URLSchema);
module.exports = URL;
