const core = require('@actions/core');
const fs = require('fs');
const path = require('path');

module.exports.getNetrcPath = function () {
  return path.join(process.env.HOME, '.netrc');
};

module.exports.createNetrc = function (credentials) {
  const filename = module.exports.getNetrcPath();
  if (fs.existsSync(filename)) {
    throw new Error(`Credentials file ${filename} already exists`); // NOCOMMIT?
  }
  fs.writeFileSync(
    filename,
    `machine git.heroku.com\n  login ${credentials.email}\n  password ${credentials.apiKey}\n`
  );
  if (process.env.NODE_ENV !== 'test') {
    core.info(`Saved Heroku login credentials to ${filename}`);
  }
};

module.exports.deleteNetrc = function () {
  const filename = module.exports.getNetrcPath();
  if (!fs.existsSync(filename)) {
    return;
  }
  fs.unlinkSync(filename);
  if (process.env.NODE_ENV !== 'test') {
    core.info(`Deleted Heroku login credentials from ${filename}`);
  }
};
