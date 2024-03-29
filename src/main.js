const core = require('@actions/core');
const github = require('@actions/github');

const comments = require('./comments');
const deleteController = require('./controllers/delete');
const upsertController = require('./controllers/upsert');
const git = require('./git');
const heroku = require('./heroku');

/*
 * Loads common parameters used by multiple controllers.
 */
async function getParams() {
  const params = {};

  params.pipelineName = core.getInput('pipeline_name', { required: true });
  if (!/^[a-z0-9_-]+$/.test(params.pipelineName)) {
    throw new Error(`"${params.pipelineName}" is not a valid Heroku pipeline name`);
  }
  const pipelineId = await heroku.getPipelineId(params.pipelineName);
  if (!pipelineId) {
    throw new Error(`The pipeline "${params.pipelineName}" does not exist on Heroku`);
  }

  const prNumber = parseInt(github.context.payload.number, 10);
  if (!prNumber) {
    throw new Error(`"${prNumber}" is not a valid pull request number (must be an integer)`);
  }

  params.appName = `${params.pipelineName}-pr-${prNumber}`;

  params.logDrainUrl = core.getInput('log_drain_url', { required: false });

  // The git repo checkout and refName parameter aren't strictly necessary for
  // Docker builds, but they're both used by upsertController to write the pull
  // request comment, so we'll check the repo and set refName even for Docker.

  if (!git.repoExists()) {
    throw new Error(`Current working directory "${process.cwd()}" is not a Git repo`);
  }

  params.refName = `refs/remotes/pull/${prNumber}/merge`;

  params.herokuRegion = core.getInput('heroku_region', { required: true });
  params.herokuSize = core.getInput('heroku_size', { required: true });
  params.herokuTeam = core.getInput('heroku_team', { required: true });
  params.nodeEnv = core.getInput('node_env', { required: false });

  params.owner = github.context.payload.repository.owner.login;
  params.repo = github.context.payload.repository.name;
  params.branch = github.context.payload.pull_request.head.ref;
  params.sha = github.context.payload.pull_request.head.sha;

  return params;
}

/*
 * Loads parameters and invokes the correct controller based on how this action was triggered.
 */
async function main() {
  try {
    heroku.initializeCredentials();

    const params = await getParams();

    core.info('Heroku Review App Action invoked with these parameters:');
    core.info(`  - Action: ${github.context.payload.action}`);
    core.info(`  - Heroku team name: ${params.herokuTeam}`);
    core.info(`  - App name: ${params.appName}`);
    core.info(`  - Pipeline: ${params.pipelineName}`);
    core.info(`  - Region: ${params.herokuRegion}`);
    core.info(`  - Dyno size: ${params.herokuSize}`);
    core.info(`  - Log drain URL: ${params.logDrainUrl || 'none'}`);
    core.info(`  - NODE_ENV: ${params.nodeEnv}`);
    core.info('');

    try {
      switch (github.context.payload.action) {
        case 'opened':
        case 'reopened':
        case 'synchronize':
          await upsertController(params);
          break;
        case 'closed':
          await deleteController(params);
          break;
        default:
          core.warning(`Unexpected PR action "${github.context.payload.action}", not pushing any changes to Heroku`);
          break;
      }
    } catch (err) {
      await comments.postErrorComment(params);
      throw err;
    }
  } catch (err) {
    core.setFailed(err.message);
    throw err;
  }
}

module.exports = main;
