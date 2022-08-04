const core = require('@actions/core');
const github = require('@actions/github');

const owlbert = 'https://user-images.githubusercontent.com/313895/167224035-b34efcd6-854e-4cb4-92bd-10d717d2a6b1.png';
const sadOwlbert =
  'https://user-images.githubusercontent.com/313895/182944177-50af1d9c-8b6d-47b1-aa84-7b7019637bf9.png';

function getFormattedDate() {
  const options = { weekday: 'short', year: undefined, month: 'short', day: 'numeric', timeZone: 'America/New_York' };
  const dateString = new Date().toLocaleString('en-US', options);
  // toLocaleString() with those options returns "Wed, May 25" but I'm pedantic
  return dateString.replace(',', '');
}

/*
 * Generates a stub with empty implementations of the Octokit functions we use
 * here. This is helpful so that we don't have to have a lot of if-else logic
 * throughout this module.
 */
function getFakeOctokit() {
  return {
    rest: {
      issues: {
        createComment: () => {},
        updateComment: () => {},
        listComments: () => {},
      },
    },
  };
}

let memoizedOctokit;

/*
 * Returns an instance of Octokit, or a stub if there's no auth token present.
 */
function getOctokit() {
  if (!memoizedOctokit) {
    const token = core.getInput('github_token', { required: false });
    if (!token) {
      core.warning('GitHub API token not present, not commenting on this pull request');
      memoizedOctokit = getFakeOctokit();
    }
    memoizedOctokit = github.getOctokit(token);
  }
  return memoizedOctokit;
}

/*
 * Finds an existing comment from this GitHub Action on the current pull
 * request. We can find the right comment by looking for one posted by a
 * GitHub Action and with the Owlbert image in the body. If there is no
 * matching comment, returns undefined. If there is more than one, like if
 * the PR is closed and reopened, this the most recent.
 */
async function findExistingComment() {
  const octokit = getOctokit();
  const resp = await octokit.rest.issues.listComments({
    owner: github.context.payload.repository.owner.login,
    repo: github.context.payload.repository.name,
    issue_number: parseInt(github.context.payload.number, 10),
    per_page: 100,
  });
  if (resp.status > 400) {
    core.warning(`GitHub listComments API call returned HTTP status ${resp.status}`);
    return undefined;
  }
  const reviewAppComments = resp.data.filter(c => c.user.login === 'github-actions[bot]' && c.body.includes(owlbert));
  if (reviewAppComments.length > 0) {
    // the last comment in the array is the most recent
    return reviewAppComments[reviewAppComments.length - 1];
  }
  return undefined;
}

/*
 * Sends a new comment to GitHub.
 */
async function createComment(body) {
  const octokit = getOctokit();
  const resp = await octokit.rest.issues.createComment({
    owner: github.context.payload.repository.owner.login,
    repo: github.context.payload.repository.name,
    issue_number: parseInt(github.context.payload.number, 10),
    body,
  });
  if (resp.status > 400) {
    core.warning(`GitHub createComment API call returned HTTP status ${resp.status}`);
  }
  return resp;
}

/*
 * Modifies an existing comment on GitHub.
 */
async function updateComment(commentId, body) {
  const octokit = getOctokit();
  const resp = await octokit.rest.issues.updateComment({
    owner: github.context.payload.repository.owner.login,
    repo: github.context.payload.repository.name,
    comment_id: commentId,
    body,
  });
  if (resp.status > 400) {
    core.warning(`GitHub updateComment API call returned HTTP status ${resp.status}`);
  }
  return resp;
}

/*
 * Entrypoint to post a new PR comment when we open a new review app.
 */
async function postCreateComment(appName, appUrl) {
  const dashboardUrl = `https://dashboard.heroku.com/apps/${appName}`;
  const img = `<a href="${appUrl}"><img align="right" height="100" src="${owlbert}" /></a>`;
  const links = `:mag: **Inspect the app:** ${dashboardUrl}\n\n:compass: **Take it for a spin:** ${appUrl}`;

  const comment = `## A review app has been launched for this PR! ${img}\n\n${links}\n`;
  return createComment(comment);
}

/*
 * Entrypoint to update the existing PR comment, appending a bullet that we've
 * redeployed the review app. If this can't find an existing PR comment, it will
 * create a new comment instead.
 */
module.exports.postUpsertComment = async function (appName, appUrl, sha, message) {
  const comment = await findExistingComment();
  if (!comment) {
    return postCreateComment(appName, appUrl);
  }

  const owner = github.context.payload.repository.owner.login;
  const repo = github.context.payload.repository.name;
  const prNumber = parseInt(github.context.payload.number, 10);

  const date = getFormattedDate();
  const shortSha = sha.substring(0, 7);
  const commitLink = `https://github.com/${owner}/${repo}/pull/${prNumber}/commits/${sha}`;
  const body = `${comment.body}\n- **Redeployed on ${date}:** [\`${shortSha}\` ${message}](${commitLink})`;

  return updateComment(comment.id, body);
};

/*
 * Entrypoint to update the existing PR comment, appending a bullet that we've
 * shut down the review app. If this can't find an existing PR comment, it
 * doesn't do anything.
 */
module.exports.postDeleteComment = async function () {
  const comment = await findExistingComment();
  if (!comment) {
    return undefined;
  }

  const date = getFormattedDate();
  const body = `${comment.body}\n- **Shut down on ${date}:** Since this PR is closed, its review app has been cleaned up. :sponge:`;
  return updateComment(comment.id, body);
};

module.exports.postErrorComment = async function (params) {
  const owner = github.context.payload.repository.owner.login;
  const repo = github.context.payload.repository.name;
  const runId = github.context.runId;

  const actionUrl = `https://github.com/${owner}/${repo}/actions/runs/${runId}`;
  const dashboardUrl = `https://dashboard.heroku.com/apps/${params.appName}`;
  const runDescription = `${github.context.workflow} #${github.context.runNumber}`;

  const img = `<a href="${actionUrl}"><img align="right" height="100" src="${sadOwlbert}" /></a>`;
  const links = `:page_facing_up: **Review the GitHub Action logs:** ${actionUrl}\n\n:mag: **Inspect the app in Heroku:** ${dashboardUrl}`;

  const comment = `## :warning: There was a problem deploying this review app to Heroku. ${img}\n\n${runDescription} failed.\n\n${links}\n`;
  return createComment(comment);
};
