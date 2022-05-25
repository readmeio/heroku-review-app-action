const core = require('@actions/core');
const github = require('@actions/github');

const owlbert = 'https://user-images.githubusercontent.com/313895/167224035-b34efcd6-854e-4cb4-92bd-10d717d2a6b1.png';

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

let octokit;

/*
 * Returns an instance of Octokit, or a stub if there's no auth token present.
 */
function getOctokit() {
  if (!octokit) {
    const token = core.getInput('github_token', { required: false });
    if (!token) {
      core.warning('GitHub API token not present, not commenting on this pull request');
      octokit = getFakeOctokit();
    }
    octokit = github.getOctokit(token);
  }
  return octokit;
}

/*
 * Finds an existing comment from this GitHub Action on the current pull
 * request. We can find the right comment by looking for one posted by a
 * GitHub Action and with the Owlbert image in the body. If there is no
 * matching comment, returns undefined. If there is more than one, like if
 * the PR is closed and reopened, this the most recent.
 */
async function findExistingComment() {
  core.info('calling octokit.rest.issues.listComments with these params:');
  core.info(`    owner: ${github.context.payload.repository.owner.login}`);
  core.info(`    repo: ${github.context.payload.repository.name}`);
  core.info(`    issue_number: ${parseInt(github.context.payload.number, 10)}`);
  core.info('    per_page: 100');

  const octokit = getOctokit();
  const resp = await octokit.rest.issues.listComments({
    owner: github.context.payload.repository.owner.login,
    repo: github.context.payload.repository.name,
    issue_number: parseInt(github.context.payload.number, 10),
    per_page: 100,
  });
  // TODO validate resp
  core.info(`GitHub API returned status ${resp.status} and ${resp.data.length} comments`);
  const reviewAppComments = resp.data.filter(c => c.user.login === 'github-actions[bot]' && c.body.includes(owlbert));
  core.info(`With filter, there are ${reviewAppComments.length} matching comments`);
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
  core.info('calling octokit.rest.issues.createComment with these params:');
  core.info(`    owner: ${github.context.payload.repository.owner.login}`);
  core.info(`    repo: ${github.context.payload.repository.name}`);
  core.info(`    issue_number: ${parseInt(github.context.payload.number, 10)}`);
  core.info(`    body: ${body.length} characters`);

  const octokit = getOctokit();
  const resp = octokit.rest.issues.createComment({
    owner: github.context.payload.repository.owner.login,
    repo: github.context.payload.repository.name,
    issue_number: parseInt(github.context.payload.number, 10),
    body,
  });
  // TODO validate resp
  core.info(`GitHub API returned status ${resp.status}`);
  return resp;
}

/*
 * Modifies an existing comment on GitHub.
 */
async function updateComment(commentId, body) {
  core.info('calling octokit.rest.issues.updateComment with these params:');
  core.info(`    owner: ${github.context.payload.repository.owner.login}`);
  core.info(`    repo: ${github.context.payload.repository.name}`);
  core.info(`    comment_id: ${commentId}`);
  core.info(`    body: ${body.length} characters`);

  const octokit = getOctokit();
  const resp = octokit.rest.issues.updateComment({
    owner: github.context.payload.repository.owner.login,
    repo: github.context.payload.repository.name,
    comment_id: commentId,
    body,
  });
  // TODO validate resp
  core.info(`GitHub API returned status ${resp.status}`);
  return resp;
}

/*
 * Entrypoint to post a new PR comment when we open a new review app.
 */
module.exports.postCreateComment = async function (appName, appUrl) {
  core.info('running postCreateComment with these params:');
  core.info(`    appName: ${appName}`);
  core.info(`    appUrl: ${appUrl}`);

  const dashboardUrl = `https://dashboard.heroku.com/apps/${appName}`;
  const img = `<a href="${appUrl}"><img align="right" height="100" src="${owlbert}" /></a>`;
  const links = `:mag: **Inspect the app:** ${dashboardUrl}\n\n:compass: **Take it for a spin:** ${appUrl}`;

  const comment = `## A review app has been launched for this PR! ${img}\n\n${links}\n`;
  const resp = await createComment(comment);

  core.info('Finished running postCreateComment\n');
  return resp;
};

/*
 * Entrypoint to update the existing PR comment when we open a new review app.
 * If this can't find an existing PR comment, it can just create a new one.
 */
module.exports.postUpdateComment = async function (appName, appUrl, sha, message) {
  core.info('running postUpdateComment with these params:');
  core.info(`    appName: ${appName}`);
  core.info(`    appUrl: ${appUrl}`);
  core.info(`    sha: ${sha}`);
  core.info(`    message: ${message}`);

  const comment = await findExistingComment();
  if (!comment) {
    return module.exports.postCreateComment(appName, appUrl);
  }

  const date = getFormattedDate();
  const shortSha = sha.substring(0, 7);
  const body = `${comment.body}\n- **Redeployed on ${date}:** ${shortSha} ${message}`;

  const resp = await updateComment(comment.id, body);

  core.info('Finished running postUpdateComment\n');
  return resp;
};

/*
 * Entrypoint to update the existing PR comment when we close a review app.
 * If this can't find an existing PR comment, it doesn't do anything.
 */
module.exports.postDeleteComment = async function () {
  core.info('running postDeleteComment with no params:');
  const comment = await findExistingComment();
  if (!comment) {
    return undefined;
  }

  const date = getFormattedDate();
  const body = `${comment.body}\n- **Shut down on ${date}:** Since this PR is closed, its review app has been cleaned up. :sponge:`;
  const resp = await updateComment(comment.id, body);

  core.info('Finished running postDeleteComment\n');
  return resp;
};
