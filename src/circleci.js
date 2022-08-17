/* eslint-disable no-await-in-loop */
const core = require('@actions/core');
const fetch = require('node-fetch');

let CIRCLECI_API_TOKEN;

const BASE_URL = 'https://circleci.com/api/v2';
const POLLING_SLEEP_MS = process.env.NODE_ENV === 'test' ? 30 : 10 * 1000; // 10 seconds
const POLLING_TIMEOUT_MS = process.env.NODE_ENV === 'test' ? 300 : 60 * 30 * 1000; // 30 minutes

///
/// Helper Functions
///

class HttpResponseError extends Error {
  constructor(resp) {
    super(`HTTP Error ${resp.status}`);
    this.name = 'HttpResponseError';
    this.status = resp.status;
  }
}

/*
 * Helper function to run fetch() on CircleCI; handles authentication, JSON
 * decoding, etc.
 */
async function circleFetch(path, params) {
  const url = BASE_URL + path;
  const givenHeaders = params && params.headers ? params.headers : {};
  const allParams = {
    ...params,
    headers: {
      ...givenHeaders,
      'Content-Type': 'application/json',
      'Circle-Token': CIRCLECI_API_TOKEN,
    },
  };
  const resp = await fetch(url, allParams);
  if (resp.status >= 400) {
    throw new HttpResponseError(resp);
  }
  return resp.json();
}

///
/// CircleCI credentials functions
///

module.exports.initializeCredentials = function () {
  CIRCLECI_API_TOKEN = core.getInput('circleci_api_token', { required: false });
  if (!CIRCLECI_API_TOKEN || CIRCLECI_API_TOKEN.length === 0) {
    throw new Error('Missing circleci_api_token parameter; this is required for Docker builds');
  }
  if (!/^[0-9a-f]{40}/.test(CIRCLECI_API_TOKEN)) {
    throw new Error('Invalid circleci_api_token value (redacted)');
  }
};

///
/// CircleCI API functions
///

/*
 * Kicks off a CircleCI pipeline to build this branch's image and release it to
 * a single Heroku app. Returns the CircleCI pipeline response described here:
 * https://circleci.com/docs/api/v2/index.html#operation/triggerPipeline
 */
module.exports.startDockerBuild = async function (owner, repo, branch, appName, nodeEnv) {
  const parameters = {
    RUN_TEST: false,
    RUN_DOCKER: true,
    HEROKU_APPS_TO_PUSH: appName,
    HEROKU_APPS_TO_RELEASE: appName,
    ...(nodeEnv && { NODE_ENV: nodeEnv }),
  };
  return circleFetch(`/project/gh/${owner}/${repo}/pipeline`, {
    method: 'POST',
    body: JSON.stringify({ branch, parameters }),
  });
};

/*
 * Queries the CircleCI API and returns the most recent workflow for the given
 * pipeline. Returns undefined if the pipeline has no workflows. The response
 * matches the structure described here:
 * https://circleci.com/docs/api/v2/index.html#operation/listWorkflowsByPipelineId
 */
async function getPipelineWorkflow(pipelineId) {
  const resp = await circleFetch(`/pipeline/${pipelineId}/workflow`);
  if (resp.items.length === 0) {
    // No workflows have been enqueued for the pipeline (it's probably )
    // pipeline; we should poll again in a few seconds.
    return undefined;
  }
  if (resp.items.length > 1) {
    // items.length > 1 means that two or more workflows have been enqueued for
    // this pipeline. This is unlikely to happen during this GitHub Action but
    // could happen in situations like re-running the pipeline after an error.
    // We should make sure that items[0] contains the most recent run.
    resp.items.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  return resp.items[0];
}

/*
 * Polls CircleCI until the pipeline finishes. Times out with an error if the
 * pipeline doesn't finish within 30 minutes (PIPELINE_TIMEOUT_MS). Returns the
 * CircleCI workflows response described here:
 * https://circleci.com/docs/api/v2/index.html#operation/listWorkflowsByPipelineId
 */
module.exports.waitForPipelineFinish = async function (pipelineId) {
  const pollUntil = new Date().getTime() + POLLING_TIMEOUT_MS;
  while (new Date().getTime() < pollUntil) {
    // On each run of the loop, pause briefly, then check the status of the
    // pipeline. The loop will exit when the pipeline's workflow is no longer
    // running, or when we've exceeded our timeout.
    await new Promise(resolve => setTimeout(resolve, POLLING_SLEEP_MS)); // eslint-disable-line no-promise-executor-return
    const workflow = await getPipelineWorkflow(pipelineId);
    if (workflow && workflow.status !== 'running') {
      return workflow;
    }
  }
  throw new Error('Timed out waiting for CircleCI pipeline to finish.');
};
