const comments = require('../comments');
const core = require('@actions/core');
const git = require('../git');
const heroku = require('../heroku');

async function upsertController(params) {
  const { pipelineName, pipelineId, logDrainUrl, appName, refName } = params;

  if (!git.refExists(refName)) {
    throw new Error(`Ref "${refName}" does not exist.`);
  }
  const message = git.messageForRef(refName);
  const configVars = await heroku.getPipelineVars(pipelineId);

  let stepCount = 4;
  if (Object.keys(configVars).length > 0) {
    stepCount += 1;
  }
  if (logDrainUrl) {
    stepCount += 1;
  }
  if (pipelineName === 'readme') {
    stepCount += 1;
  }

  let currentStep = 1;
  core.info(`\n[Step ${currentStep}/${stepCount}] Creating Heroku app "${appName}" if it doesn't already exist...`);
  const appExists = await heroku.appExists(appName);
  let app;
  if (appExists) {
    core.info('  - The app already exists, skipping this step.');
    app = await heroku.getApp(appName);
  } else {
    app = await heroku.createApp(appName, pipelineId);
  }
  let appUrl = app.web_url;

  currentStep += 1;
  core.info(`[Step ${currentStep}/${stepCount}] Associating app with Heroku pipeline "${pipelineName}"...`);
  const pipelineApps = await heroku.getPipelineApps(pipelineId);
  if (pipelineApps.includes(app.id)) {
    core.info('  - The app is already associated with the correct pipeline, skipping this step.');
  } else {
    await heroku.coupleAppToPipeline(app.id, pipelineId);
  }

  currentStep += 1;
  core.info(`[Step ${currentStep}/${stepCount}] Enabling Heroku Labs features...`);
  await heroku.setAppFeature(app.id, 'nodejs-language-metrics', true);
  await heroku.setAppFeature(app.id, 'runtime-dyno-metadata', true);
  await heroku.setAppFeature(app.id, 'runtime-heroku-metrics', true);

  if (Object.keys(configVars).length > 0) {
    currentStep += 1;
    core.info(`[Step ${currentStep}/${stepCount}] Setting default config vars...`);
    if (appExists) {
      core.info('  - Note: This will reset any config vars that you have changed on this app.');
    }
    await heroku.setAppVars(app.id, configVars);
  }

  if (logDrainUrl) {
    currentStep += 1;
    core.info(`[Step ${currentStep}/${stepCount}] Configuring app to send logs to Logstash...`);
    const existingDrains = await heroku.getDrains(app.id);
    if (existingDrains.includes(logDrainUrl)) {
      core.info('  - The app is already configured to send logs, skipping this step.');
    } else {
      await heroku.addDrain(app.id, logDrainUrl);
    }
  }

  currentStep += 1;
  core.info(`[Step ${currentStep}/${stepCount}] Deploying the app to Heroku -- this may take a few minutes...\n`);
  const credentials = heroku.getCredentials();
  const pushResult = git.push(credentials, appName, refName);
  if (pushResult.status !== 0) {
    throw new Error(`Created Heroku app "${appName}" but ran into errors deploying.`);
  }

  if (pipelineName === 'readme') {
    currentStep += 1;
    core.info(`\n[Step ${currentStep}/${stepCount}] Configuring custom domains in Cloudflare...`);
    await heroku.runAppCommand(app.id, 'node bin/setdomain.js');
    appUrl = `http://${appName}.readme.ninja`;
  }

  core.info(`\nSuccessfully created Heroku app "${appName}"! Your app is available at:\n    ${appUrl}\n`);
  await comments.postCreateComment(appName, appUrl, message);
  return true;
}

module.exports = upsertController;
