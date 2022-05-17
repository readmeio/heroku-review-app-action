const comments = require('../comments');
const core = require('@actions/core');
const git = require('../git');
const heroku = require('../heroku');

async function createController(params) {
  const { pipelineName, pipelineId, templateApp, appName, refName } = params;

  // Additional validation specific to the "create" action
  const exists = await heroku.appExists(appName);
  if (exists) {
    throw new Error(`Unable to create new PR app: an app named "${appName}" app already exists on Heroku`);
  }
  if (!git.refExists(refName)) {
    throw new Error(`Ref "${refName}" does not exist.`);
  }
  const message = git.messageForRef(refName);

  const configVars = templateApp ? await heroku.getAppVars(templateApp) : await heroku.getPipelineVars(pipelineId);

  let stepCount = 4;
  if (Object.keys(configVars).length > 0) {
    stepCount += 1;
  }
  if (pipelineName === 'readme') {
    stepCount += 2;
  }

  let currentStep = 1;
  core.info(`\n[Step ${currentStep}/${stepCount}] Creating Heroku app "${appName}..."`);
  const app = await heroku.createApp(appName, pipelineId);
  let appUrl = app.web_url;

  currentStep += 1;
  core.info(`[Step ${currentStep}/${stepCount}] Associating app with Heroku pipeline "${pipelineName}"...`);
  await heroku.coupleAppToPipeline(app.id, pipelineId);

  currentStep += 1;
  core.info(`[Step ${currentStep}/${stepCount}] Enabling Heroku Labs features...`);
  await heroku.setAppFeature(app.id, 'nodejs-language-metrics', true);
  await heroku.setAppFeature(app.id, 'runtime-dyno-metadata', true);
  await heroku.setAppFeature(app.id, 'runtime-heroku-metrics', true);

  if (Object.keys(configVars).length > 0) {
    currentStep += 1;
    core.info(`[Step ${currentStep}/${stepCount}] Setting default config vars...`);
    await heroku.setAppVars(app.id, configVars);
  }

  currentStep += 1;
  core.info(
    `[Step ${currentStep}/${stepCount}] Deploying the app to Heroku for the first time -- this may take a few minutes...\n`
  );
  const credentials = heroku.getCredentials();
  const pushResult = git.push(credentials, appName, refName);
  if (pushResult.status !== 0) {
    throw new Error(`Created Heroku app "${appName}" but ran into errors deploying for the first time.`);
  }

  if (pipelineName === 'readme') {
    currentStep += 1;
    core.info(`\n[Step ${currentStep}/${stepCount}] Configuring custom domains in Cloudflare...`);
    await heroku.runAppCommand(app.id, 'node bin/setdomain.js');
    appUrl = `http://${appName}.readme.ninja`;

    currentStep += 1;
    core.info(`[Step ${currentStep}/${stepCount}] Triggering RainforestQA testing for the new PR app...`);
    await heroku.runAppCommand(app.id, 'node bin/subscribe-rainforest.js');
  }

  core.info(`\nSuccessfully created Heroku app "${appName}"! Your app is available at:\n    ${appUrl}\n`);
  await comments.postCreateComment(appName, appUrl, message);
  return true;
}

module.exports = createController;
