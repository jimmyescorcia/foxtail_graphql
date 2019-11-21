const emailTranslate = function(term, lang) {
  lang = lang || "en";
  const jsonData = require("../locales/" + lang + "/emails.json");

  const result = "";
  if (!term) {
    return result;
  }

  for (let line in jsonData) {
    if (line === term) {
      return jsonData[line];
    }
  }
  return term;
};

module.exports = { emailTranslate };
