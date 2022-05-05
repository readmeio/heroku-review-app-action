const comments = require('@src/comments');
const core = require('@actions/core');
const heroku = require('@src/heroku');

async function deleteController(params) {
  const { pipelineName, appName } = params;

  const exists = await heroku.appExists(appName);
  if (!exists) {
    core.info(`Nothing to do: There's no app in Heroku named "${appName}".`);
    return true;
  }

  if (pipelineName === 'readme') {
    core.info(`Deleting Cloudflare DNS entries for ${appName}.readme.ninja`);
    const app = await heroku.getApp(appName);
    await heroku.runAppCommand(app.id, 'node bin/removedomain.js');

    core.info(`Waiting 45 seconds for Cloudflare DNS entries to be deleted asynchronously...`);
    await new Promise(r => setTimeout(r, 45000)); // eslint-disable-line no-promise-executor-return
  }

  core.info(`Deleting Heroku app "${appName}"...`);
  await heroku.deleteApp(appName);
  core.info(`\nSuccessfully deleted Heroku app "${appName}"!`);
  await comments.postDeleteComment();
  return true;
}

module.exports = deleteController;
