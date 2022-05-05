const comments = require('@src/comments');
const core = require('@actions/core');
const git = require('@src/git');
const heroku = require('@src/heroku');
const netrc = require('@src/netrc');

async function updateController(params) {
  const { pipelineName, appName, refName } = params;

  const exists = await heroku.appExists(appName);
  if (!exists) {
    throw new Error(`Unable to update PR app: there is no app named "${appName}" on Heroku`);
  }

  let appUrl;
  if (pipelineName === 'readme') {
    appUrl = `http://${appName}.readme.ninja`;
  } else {
    const app = await heroku.getApp(appName);
    appUrl = app.web_url;
  }

  core.info(`Deploying to Heroku app "${appName}" -- this may take a few minutes...\n`);

  const credentials = heroku.getCredentials();
  netrc.createNetrc(credentials);
  const pushResult = git.push(appName, refName);
  netrc.deleteNetrc();
  if (pushResult.status !== 0) {
    throw new Error(`Ran into errors deploying the app "${appName}"`);
  }

  core.info(`\nSuccessfully deployed changes to Heroku app "${appName}"! Your app is available at:\n    ${appUrl}\n`);
  await comments.postUpdateComment(appName, appUrl);
  return true;
}

module.exports = updateController;
