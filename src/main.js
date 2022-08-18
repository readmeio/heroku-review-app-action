const core = require('@actions/core');
const github = require('@actions/github');

const comments = require('./comments');
const deleteController = require('./controllers/delete');
const upsertController = require('./controllers/upsert');
const git = require('./git');
const heroku = require('./heroku');

/*
 * Loads common parameters used by all the controllers.
 */
async function getParams() {
  const pipelineName = core.getInput('pipeline_name', { required: true });
  if (!/^[a-z0-9_-]+$/.test(pipelineName)) {
    throw new Error(`"${pipelineName}" is not a valid Heroku pipeline name`);
  }
  const pipelineId = await heroku.getPipelineId(pipelineName);
  if (!pipelineId) {
    throw new Error(`The pipeline "${pipelineName}" does not exist on Heroku`);
  }

  const prNumber = parseInt(github.context.payload.number, 10);
  if (!prNumber) {
    throw new Error(`"${prNumber}" is not a valid pull request number (must be an integer)`);
  }

  let baseName;
  if (pipelineName === 'readme' && prNumber < 7100) {
    // Our baseName changed from 'readme-stage' to just 'readme' at PR #7100.
    // We need to hardcode a workaround for PRs opened before that.
    // @todo remove this once all PRs below #7100 have been closed.
    baseName = 'readme-stage';
  } else {
    baseName = pipelineName;
  }

  const appName = `${baseName}-pr-${prNumber}`;

  // The git repo checkout and refName parameter aren't strictly necessary for
  // Docker builds, but they're both used by upsertController to write the pull
  // request comment, so we'll check the repo and set refName even for Docker.

  if (!git.repoExists()) {
    throw new Error(`Current working directory "${process.cwd()}" is not a Git repo`);
  }

  const refName = `refs/remotes/pull/${prNumber}/merge`;

  let useDocker = false;
  const dockerParam = core.getInput('docker', { required: false });
  if (dockerParam && dockerParam.length > 0) {
    if (dockerParam === 'true') {
      useDocker = true;
    } else if (dockerParam !== 'false') {
      throw new Error(`docker = "${dockerParam}" is not valid (must be "true" or "false")`);
    }
  }

  return { pipelineName, appName, refName, useDocker };
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
    core.info(`  - Build type: ${params.useDocker ? 'Docker (via CircleCI)' : 'Heroku'}`);
    core.info(`  - Heroku pipeline: ${params.pipelineName}`);
    core.info(`  - Heroku app name: ${params.appName}`);

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
