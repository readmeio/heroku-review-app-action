const comments = require('../comments');
const core = require('@actions/core');
const git = require('../git');
const heroku = require('../heroku');

async function updateController(params) {
  const { pipelineName, appName, refName } = params;

  // Additional validation specific to the "update" action
  const exists = await heroku.appExists(appName);
  if (!exists) {
    throw new Error(`Unable to update PR app: there is no app named "${appName}" on Heroku`);
  }
  if (!git.refExists(refName)) {
    throw new Error(`Ref "${refName}" does not exist.`);
  }
  const message = git.messageForRef(refName);

  let appUrl;
  if (pipelineName === 'readme') {
    appUrl = `http://${appName}.readme.ninja`;
  } else {
    const app = await heroku.getApp(appName);
    appUrl = app.web_url;
  }

  core.info(`Deploying to Heroku app "${appName}" -- this may take a few minutes...\n`);

  const credentials = heroku.getCredentials();
  const pushResult = git.push(credentials, appName, refName);
  if (pushResult.status !== 0) {
    throw new Error(`Ran into errors deploying the app "${appName}"`);
  }

  core.info(`\nSuccessfully deployed changes to Heroku app "${appName}"! Your app is available at:\n    ${appUrl}\n`);
  await comments.postUpdateComment(appName, appUrl, message);
  return true;
}

module.exports = updateController;
