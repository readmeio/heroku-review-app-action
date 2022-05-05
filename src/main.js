const createController = require('@src/controllers/create');
const deleteController = require('@src/controllers/delete');
const core = require('@actions/core');
const git = require('@src/git');
const github = require('@actions/github');
const heroku = require('@src/heroku');
const netrc = require('@src/netrc');
const updateController = require('@src/controllers/update');

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

  let baseName;
  const reviewAppConfig = await heroku.getReviewAppConfig(pipelineId);
  if (reviewAppConfig) {
    baseName = reviewAppConfig.base_name;
  } else {
    baseName = pipelineName;
  }

  const prNumber = parseInt(github.context.payload.number, 10);
  if (!prNumber) {
    throw new Error(`"${prNumber}" is not a valid pull request number (must be an integer)`);
  }

  const appName = `${baseName}-pr-${prNumber}`;

  if (!git.repoExists()) {
    throw new Error(`Current working directory "${process.cwd()}" is not a Git repo`);
  }

  const refName = `refs/remotes/pull/${prNumber}/merge`;
  if (!git.refExists(refName)) {
    throw new Error(`Ref "${refName}" does not exist.`);
  }

  return { pipelineName, pipelineId, baseName, appName, refName };
}

/*
 * Loads parameters and invokes the correct controller based on how this action was triggered.
 */
async function main() {
  try {
    heroku.initializeCredentials();

    const params = await getParams();
    const { pipelineName, pipelineId, baseName, appName, refName } = params;

    core.info('Heroku Review App Action invoked with these parameters:');
    core.info(`  - Action: ${github.context.payload.action}`);
    core.info(`  - Git ref: ${refName}`);
    core.info(`  - Heroku pipeline name: ${pipelineName}`);
    core.info(`  - Heroku pipeline ID: ${pipelineId}`);
    core.info(`  - Review app base name: ${baseName}`);
    core.info(`  - Heroku app name: ${appName}`);

    switch (github.context.payload.action) {
      case 'opened':
      case 'reopened':
        await createController(params);
        break;
      case 'synchronize':
        await updateController(params);
        break;
      case 'closed':
        await deleteController(params);
        break;
      default:
        core.warning(`Unexpected PR action "${github.context.payload.action}", not pushing any changes to GitHub`);
        break;
    }
  } catch (error) {
    core.setFailed(error.message);
  } finally {
    // extra cleanup just to make sure we don't leave a .netrc file
    netrc.deleteNetrc();
  }
}

module.exports = main;
