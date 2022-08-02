const core = require('@actions/core');
const deleteController = require('./controllers/delete');
const git = require('./git');
const github = require('@actions/github');
const heroku = require('./heroku');
const upsertController = require('./controllers/upsert');

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

  const logDrainUrl = core.getInput('log_drain_url', { required: false });

  const prNumber = parseInt(github.context.payload.number, 10);
  if (!prNumber) {
    throw new Error(`"${prNumber}" is not a valid pull request number (must be an integer)`);
  }

  let baseName;
  if (pipelineName === 'readme' && prNumber < 7100 && prNumber !== 7050) {
    // Our baseName changed from 'readme-stage' to just 'readme' at PR #7100.
    // We need to hardcode a workaround for PRs opened before that. However
    // we manually renamed Gabe's PR #7050 thinking that was a good solution,
    // so the workaround doesn't apply to #7050.
    baseName = 'readme-stage';
  } else {
    const reviewAppConfig = await heroku.getReviewAppConfig(pipelineId);
    if (reviewAppConfig) {
      baseName = reviewAppConfig.base_name;
    } else {
      baseName = pipelineName;
    }
  }

  const appName = `${baseName}-pr-${prNumber}`;

  if (!git.repoExists()) {
    throw new Error(`Current working directory "${process.cwd()}" is not a Git repo`);
  }

  const refName = `refs/remotes/pull/${prNumber}/merge`;

  return { pipelineName, pipelineId, logDrainUrl, baseName, appName, refName };
}

/*
 * Loads parameters and invokes the correct controller based on how this action was triggered.
 */
async function main() {
  try {
    heroku.initializeCredentials();

    const params = await getParams();
    const { pipelineName, pipelineId, logDrainUrl, baseName, appName, refName } = params;

    core.info('Heroku Review App Action invoked with these parameters:');
    core.info(`  - Action: ${github.context.payload.action}`);
    core.info(`  - Git ref: ${refName}`);
    core.info(`  - Heroku pipeline name: ${pipelineName}`);
    core.info(`  - Heroku pipeline ID: ${pipelineId}`);
    core.info(`  - Log drain URL: ${logDrainUrl || 'none'}`);
    core.info(`  - Review app base name: ${baseName}`);
    core.info(`  - Heroku app name: ${appName}`);

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
  } catch (error) {
    core.setFailed(error.message);
  }
}

module.exports = main;
