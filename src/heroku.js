const core = require('@actions/core');
const fetch = require('node-fetch');

let HEROKU_EMAIL;
let HEROKU_API_KEY;

let appCache = {};
let appExistsCache = {};

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

/* Helper function to run fetch() on Heroku; handles authentication and adds the Accept header. */
async function herokuFetch(url, params) {
  const givenHeaders = params && params.headers ? params.headers : {};
  const allParams = {
    ...params,
    headers: {
      ...givenHeaders,
      Accept: 'application/vnd.heroku+json; version=3',
      Authorization: `Bearer ${HEROKU_API_KEY}`,
    },
  };
  const resp = await fetch(url, allParams);
  if (resp.status >= 400) {
    throw new HttpResponseError(resp);
  }
  return resp;
}

/* Helper function to read data from Heroku. */
async function herokuGet(url) {
  const resp = await herokuFetch(url, { method: 'GET' });
  return resp.json();
}

/* Clears the getApp() and appExists() caches. Probably only needed for unit tests. */
module.exports.clearCache = async function () {
  appCache = {};
  appExistsCache = {};
};

///
/// Heroku credentials functions
///

module.exports.initializeCredentials = function () {
  HEROKU_EMAIL = core.getInput('heroku_email', { required: true });
  if (!/^[a-z0-9-@.]+$/.test(HEROKU_EMAIL)) {
    throw new Error(`Invalid heroku_email value "${HEROKU_EMAIL}"`);
  }

  HEROKU_API_KEY = core.getInput('heroku_api_key', { required: true });
  if (!/^[a-f0-9-]+$/.test(HEROKU_API_KEY)) {
    throw new Error('Invalid heroku_api_key value (redacted)');
  }
  core.setSecret(HEROKU_API_KEY);
};

/*
 * Returns the Heroku credentials, used for pushing code to Heroku
 */
module.exports.getCredentials = function () {
  return { email: HEROKU_EMAIL, apiKey: HEROKU_API_KEY };
};

///
/// Heroku API read functions
///

/* Loads information about the given app; data is memoized to avoid repetitive lookups */
module.exports.getApp = async function (appName) {
  if (!appCache[appName]) {
    appCache[appName] = await herokuGet(`https://api.heroku.com/apps/${appName}`);
  }
  return appCache[appName];
};

/*
 * Returns a boolean indicating whether the given Heroku Labs feature is enabled.
 */
module.exports.getAppFeature = async function (appId, featureName) {
  return herokuGet(`https://api.heroku.com/apps/${appId}/features/${featureName}`);
};

/* Loads the dyno size used for the given app */
module.exports.getAppSize = async function (appName) {
  const resp = await herokuGet(`https://api.heroku.com/apps/${appName}/formation/web`);
  return resp.size;
};

/* Loads the UUID of the named pipeline from Heroku. */
module.exports.getPipelineId = async function (pipelineName) {
  try {
    const data = await herokuGet(`https://api.heroku.com/pipelines/${pipelineName}`);
    return data.id;
  } catch (err) {
    if (err instanceof HttpResponseError && err.status === 404) {
      return undefined;
    }
    throw err;
  }
};

/* Loads all of the config vars for the given pipeline's "Review Apps" stage. */
module.exports.getPipelineVars = async function (pipelineId) {
  return herokuGet(`https://api.heroku.com/pipelines/${pipelineId}/stage/review/config-vars`);
};

/*
 * Returns the IDs of all apps coupled to the given pipeline.
 */
module.exports.getPipelineApps = async function (pipelineId) {
  const resp = await herokuGet(`https://api.heroku.com/pipelines/${pipelineId}/pipeline-couplings`);
  return resp.map(coupling => coupling.app.id);
};

/*
 * Loads the review app configuration for the given pipeline. Returns
 * undefined if the pipeline does not have review apps configured.
 */
module.exports.getReviewAppConfig = async function (pipelineId) {
  try {
    const resp = await herokuGet(`https://api.heroku.com/pipelines/${pipelineId}/review-app-config`);
    return resp;
  } catch (err) {
    if (err instanceof HttpResponseError && err.status === 404) {
      return undefined;
    }
    throw err;
  }
};

/* Checks whether an app with the given name exists on Heroku. Data is memoized to avoid repetitive lookups. Returns bool. */
module.exports.appExists = async function (appName) {
  if (appExistsCache[appName] === undefined) {
    try {
      await module.exports.getApp(appName);
      appExistsCache[appName] = true;
    } catch (err) {
      if (err instanceof HttpResponseError && err.status === 404) {
        appExistsCache[appName] = false;
      } else {
        throw err;
      }
    }
  }
  return appExistsCache[appName];
};

///
/// Heroku API write functions
///

/* Creates a Heroku app with the given name. */
module.exports.createApp = async function (params) {
  const resp = await herokuFetch('https://api.heroku.com/teams/apps', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: params.appName,
      region: params.herokuRegion,
      team: params.herokuTeam,
    }),
  });
  const result = await resp.json();

  delete appCache[params.appName];
  delete appExistsCache[params.appName];
  return result;
};

/* Updates the app's "web" formation to set a specific instance size. */
module.exports.setAppSize = async function (params) {
  const resp = await herokuFetch(`https://api.heroku.com/apps/${params.appName}/formation/web`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quantity: 1,
      size: params.herokuSize,
    }),
  });
  return resp.json();
};

/* Deletes a Heroku app with the given name. */
module.exports.deleteApp = async function (name) {
  if (!/-pr-/.test(name)) {
    throw new Error('This function can only delete pull request review apps');
  }
  const resp = await herokuFetch(`https://api.heroku.com/apps/${name}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  delete appCache[name];
  delete appExistsCache[name];
  return resp.json();
};

/*
 * Attaches the given app to the given pipeline. Uses the "development" stage
 * because apps won't appear on the Heroku Dashboard if they're in "review"
 * stage and the pipeline isn't connected to GitHub.
 */
module.exports.coupleAppToPipeline = async function (appId, pipelineId) {
  const resp = await herokuFetch('https://api.heroku.com/pipeline-couplings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app: appId, pipeline: pipelineId, stage: 'development' }),
  });
  return resp.json();
};

/*
 * Enables or disables a given Heroku Labs feature.
 */
module.exports.setAppFeature = async function (appId, featureName, enabled) {
  const resp = await herokuFetch(`https://api.heroku.com/apps/${appId}/features/${featureName}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled }),
  });
  return resp.json();
};

/*
 * Updates the given Heroku app, setting all of the config vars in "vars".
 * "vars" should be an object mapping config var names to values, for example:
 * { "VAR1": "value1", "VAR2": "value2" }
 */
module.exports.setAppVars = async function (appId, vars) {
  const resp = await herokuFetch(`https://api.heroku.com/apps/${appId}/config-vars`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vars),
  });
  return resp.json();
};

/*
 * Returns a list of log drain URLs on the given app.
 */
module.exports.getDrains = async function (appId) {
  const resp = await herokuGet(`https://api.heroku.com/apps/${appId}/log-drains`);
  return resp.map(drain => drain.url);
};

/*
 * Adds a log drain to the given app
 */
module.exports.addDrain = async function (appId, url) {
  const resp = await herokuFetch(`https://api.heroku.com/apps/${appId}/log-drains`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  return resp.json();
};

/* Creates a new one-off dyno to run the given command in the background. */
module.exports.runAppCommand = async function (appId, command) {
  const resp = await herokuFetch(`https://api.heroku.com/apps/${appId}/dynos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, attach: false }),
  });
  return resp.json();
};
