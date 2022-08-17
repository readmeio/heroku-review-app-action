const core = require('@actions/core');
const github = require('@actions/github');

const circleci = require('../circleci');
const comments = require('../comments');
const git = require('../git');
const heroku = require('../heroku');

async function deployDocker(appName, nodeEnv) {
  const owner = github.context.payload.repository.owner.login;
  const repo = github.context.payload.repository.name;
  const branch = github.context.payload.pull_request.head.ref;
  const pipeline = await circleci.startDockerBuild(owner, repo, branch, appName, nodeEnv);

  core.info(`  - Kicked off CircleCI pipeline #${pipeline.number}. Waiting for pipeline to finish;`);
  core.info('    this may take some time. Watch the build progress here:');
  core.info(`    https://app.circleci.com/pipelines/github/${owner}/${repo}/${pipeline.number}`);

  const result = await circleci.waitForPipelineFinish(pipeline.id);
  if (result.status === 'success') {
    core.info('    Build and deploy pipeline finished successfully!');
  } else {
    throw new Error(`CircleCI pipeline #${pipeline.number} finished with status "${result.status}".`);
  }
}

async function deployHeroku(appName, refName) {
  const credentials = heroku.getCredentials();
  const pushResult = git.push(credentials, appName, refName);
  if (pushResult.status !== 0) {
    throw new Error(`Created Heroku app "${appName}" but ran into errors deploying.`);
  }
}

async function upsertController(params) {
  const { pipelineName, pipelineId, logDrainUrl, appName, refName, useDocker } = params;

  const sha = git.shaForRef(refName); // can't use github.context.sha because we want to exclude merge commits
  const message = git.messageForRef(refName);
  const configVars = await heroku.getPipelineVars(pipelineId);

  let stepCount = 4;
  if (Object.keys(configVars).length > 0) {
    stepCount += 1; // for setAppVars
  }
  if (logDrainUrl) {
    stepCount += 1; // for addDrain
  }
  if (pipelineName === 'readme') {
    stepCount += 1; // for configuring custom domains
  }
  if (!useDocker) {
    stepCount += 1; // for setAppStack
  }

  let currentStep = 1;
  core.info(`\n[Step ${currentStep}/${stepCount}] Creating Heroku app "${appName}" if it doesn't already exist...`);
  const appAlreadyExists = await heroku.appExists(appName);
  let app;
  if (appAlreadyExists) {
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
    if (appAlreadyExists) {
      core.info('  - This will reset any config vars that you have changed on this app.');
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
  if (useDocker) {
    core.info(`[Step ${currentStep}/${stepCount}] Building Docker image and deploying the image to Heroku...`);
    await deployDocker(appName, configVars.NODE_ENV);
  } else {
    const stack = core.getInput('heroku_stack', { required: true });
    core.info(`[Step ${currentStep}/${stepCount}] Setting the Herkou stack to ${stack}...`);
    if (app.stack.name !== stack) {
      await heroku.setAppStack(app.id, stack);
    } else {
      core.info('  - The app is already configured to use this stack, skipping this step.');
    }

    currentStep += 1;
    core.info(`[Step ${currentStep}/${stepCount}] Deploying the app to Heroku -- this may take a few minutes...\n`);
    await deployHeroku(appName, refName);
  }

  if (pipelineName === 'readme') {
    currentStep += 1;
    core.info(`\n[Step ${currentStep}/${stepCount}] Configuring custom domains in Cloudflare...`);
    await heroku.runAppCommand(app.id, 'node bin/setdomain.js');
    appUrl = `http://${appName}.readme.ninja`;
  }

  core.info(`\nSuccessfully deployed Heroku app "${appName}"! Your app is available at:\n    ${appUrl}\n`);
  await comments.postUpsertComment(appName, appUrl, sha, message);
  return true;
}

module.exports = upsertController;
