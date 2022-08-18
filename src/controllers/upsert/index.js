const core = require('@actions/core');

const comments = require('../../comments');
const git = require('../../git');
const heroku = require('../../heroku');

const ConfigVarsStep = require('./config-vars');
const CreateAppStep = require('./create-app');
const DockerDeployStep = require('./docker-deploy');
const HerokuDeployStep = require('./heroku-deploy');
const HerokuLabsStep = require('./heroku-labs');
const HerokuStackStep = require('./heroku-stack');
const LogDrainStep = require('./log-drain');
const PipelineCouplingStep = require('./pipeline-coupling');
const SetDomainStep = require('./set-domain');

async function upsertController(params) {
  const sha = git.shaForRef(params.refName); // can't use github.context.sha because we want to exclude merge commits
  const message = git.messageForRef(params.refName);

  const steps = [
    new CreateAppStep(params),
    new PipelineCouplingStep(params),
    new HerokuLabsStep(params),
    new ConfigVarsStep(params),
    new LogDrainStep(params),
    new HerokuStackStep(params),
    new HerokuDeployStep(params), // mutually exclusive with DockerDeployStep
    new DockerDeployStep(params), // mutually exclusive with HerokuDeployStep
    new SetDomainStep(params),
  ];

  // Phase 1: check which steps are actually needed for this run, and add them to a queue
  const queue = [];
  for (let i = 0; i < steps.length; i += 1) {
    await steps[i].checkPrereqs(); // eslint-disable-line no-await-in-loop
    if (steps[i].shouldRun) {
      queue.push(steps[i]);
    }
  }

  // Phase 2: run everything in the queue
  const stepCount = queue.length + 1;
  for (let i = 0; i < queue.length; i += 1) {
    const number = i + 1;
    core.info(`[Step ${number}/${stepCount}] ${queue[i].title}...`);
    await queue[i].run(); // eslint-disable-line no-await-in-loop
  }

  let appUrl;
  if (params.pipelineName === 'readme') {
    appUrl = `http://${params.appName}.readme.ninja`;
  } else {
    const app = await heroku.getApp(params.appName);
    appUrl = app.web_url;
  }
  core.info(`\nSuccessfully deployed Heroku app "${params.appName}"! Your app is available at:\n    ${appUrl}\n`);
  await comments.postUpsertComment(params.appName, appUrl, sha, message);
  return true;
}

module.exports = upsertController;
