const core = require('@actions/core');

const { getOctokit } = require('./util');

const WORKFLOW_NAME = 'Deploy';

const START_INTERVAL_MS = process.env.NODE_ENV === 'test' ? 30 : 1 * 1000; // 1 second
const START_TIMEOUT_MS = process.env.NODE_ENV === 'test' ? 300 : 60 * 1000; // 1 minute

const FINISH_INTERVAL_MS = process.env.NODE_ENV === 'test' ? 30 : 10 * 1000; // 10 seconds
const FINISH_TIMEOUT_MS = process.env.NODE_ENV === 'test' ? 300 : 60 * 30 * 1000; // 30 minutes

function checkResp(resp) {
  if (resp.status < 200 || resp.status >= 400) {
    core.error(resp);
    throw new Error(`GitHub API call returned HTTP status code ${resp.status}`);
  }
}

/**
 * Local helper function to return the numeric ID matching the workflow with
 * the given name. Memoizes API responses in the workflowIds map defined above.
 */
async function getWorkflowId(params, workflowName) {
  const octokit = getOctokit();
  const resp = await octokit.rest.actions.listRepoWorkflows({ owner: params.owner, repo: params.repo });
  checkResp(resp);
  const candidates = resp.data.workflows.filter(w => w.name === workflowName);
  if (candidates.length === 0) {
    throw new Error(`Cannot find workflow named "${workflowName}" in GitHub repo ${params.owner}/${params.repo}`);
  }
  return candidates[0].id;
}

/*
 * Kicks off a GitHub workflow run to build this branch's image and release it
 * to a single Heroku app. Returns the GitHub API response described here:
 * https://docs.github.com/en/rest/actions/workflow-runs?apiVersion=2022-11-28#get-a-workflow-run
 */
module.exports.startDeploy = async function (params) {
  const startDate = new Date();
  const workflowId = await getWorkflowId(params, WORKFLOW_NAME);

  const octokit = getOctokit();
  const resp = await octokit.rest.actions.createWorkflowDispatch({
    owner: params.owner,
    repo: params.repo,
    workflow_id: workflowId,
    ref: params.branch,
    inputs: {
      heroku_apps_to_push: params.appName,
      heroku_apps_to_release: params.appName,
      node_env: params.nodeEnv,
    },
  });
  checkResp(resp);

  const pollUntil = new Date().getTime() + START_TIMEOUT_MS;
  while (new Date().getTime() < pollUntil) {
    // On each run of the loop, pause briefly, then check to see if a workflow
    // run has been started. The loop will exit when a matching run is found, or
    // when we've exceeded our timeout.
    // eslint-disable-next-line no-promise-executor-return, no-await-in-loop
    await new Promise(resolve => setTimeout(resolve, START_INTERVAL_MS));

    // eslint-disable-next-line no-await-in-loop
    const runs = await octokit.rest.actions.listWorkflowRuns({
      owner: params.owner,
      repo: params.repo,
      workflow_id: workflowId,
      branch: params.branch,
      head_sha: params.sha,
    });
    checkResp(runs);

    if (runs.data && runs.data.workflow_runs && runs.data.workflow_runs.length > 0) {
      // listWorkflowRuns() only returns one page of runs but it's sorted by
      // created_at. We can return the first element in the array since it's always
      // the most recent run with the given filters.
      const candidates = runs.data.workflow_runs.filter(run => new Date(run.created_at) >= startDate);
      if (candidates.length > 0) {
        return candidates[0];
      }
    }
  }

  throw new Error('Timed out waiting for GitHub workflow run to start.');
};

/*
 * Polls GitHub Actions API until the workflow run finishes. Times out with an
 * error if the pipeline doesn't finish within 30 minutes (FINISH_TIMEOUT_MS).
 * Returns the GitHub API response described here:
 * https://docs.github.com/en/rest/actions/workflow-runs?apiVersion=2022-11-28#get-a-workflow-run
 */
module.exports.waitForCompletion = async function (params, runId) {
  const octokit = getOctokit();

  const pollUntil = new Date().getTime() + FINISH_TIMEOUT_MS;
  while (new Date().getTime() < pollUntil) {
    // On each run of the loop, pause briefly, then check the status of the
    // pipeline. The loop will exit when the pipeline's workflow is no longer
    // running, or when we've exceeded our timeout.
    // eslint-disable-next-line no-promise-executor-return, no-await-in-loop
    await new Promise(resolve => setTimeout(resolve, FINISH_INTERVAL_MS));

    // eslint-disable-next-line no-await-in-loop
    const resp = await octokit.rest.actions.getWorkflowRun({
      owner: params.owner,
      repo: params.repo,
      run_id: runId,
    });
    checkResp(resp);

    if (resp.data.status === 'completed') {
      return resp.data;
    }
  }

  throw new Error('Timed out waiting for GitHub workflow run to finish.');
};
