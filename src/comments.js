const core = require('@actions/core');
const github = require('@actions/github');

const owlberts = {
  create: 'https://user-images.githubusercontent.com/313895/167224035-b34efcd6-854e-4cb4-92bd-10d717d2a6b1.png',
  update: 'https://user-images.githubusercontent.com/313895/167228091-63ba7dff-c41f-4359-bd59-10e7ed3972aa.png',
  delete: 'https://user-images.githubusercontent.com/313895/167224468-051b838c-19fd-4133-97a5-7e73ce9dc366.png',
};

async function postComment(body) {
  const token = core.getInput('github_token', { required: false });
  if (!token) {
    core.info('GitHub API token not present, not commenting on this pull request');
    return undefined;
  }

  return github.getOctokit(token).rest.issues.createComment({
    owner: github.context.payload.repository.owner.login,
    repo: github.context.payload.repository.name,
    issue_number: parseInt(github.context.payload.number, 10),
    body,
  });
}

function formatComment(options) {
  let img = '';
  if (options.image) {
    if (options.imageLink) {
      img += `<a href="${options.imageLink}">`;
    }
    img += `<img align="right" height="100" src="${options.image}" />`;
    if (options.imageLink) {
      img += `</a>`;
    }
  }

  let result = options.headline ? `## ${options.headline} ${img}` : img;
  if (options.body) {
    result += `\n\n${options.body}`;
  }

  return result;
}

function buildLinks(appName, appUrl, sha, message) {
  const links = [];

  if (sha && message) {
    const owner = github.context.payload.repository.owner.login;
    const repo = github.context.payload.repository.name;
    const prNumber = parseInt(github.context.payload.number, 10);
    const commitLink = `https://github.com/${owner}/${repo}/pull/${prNumber}/commits/${sha}`;
    links.push(`:rocket: **Deployed commit:** [\`${sha.substring(0, 8)}\` ${message}](${commitLink})`);
  }

  const dashboardUrl = `https://dashboard.heroku.com/apps/${appName}`;
  links.push(`:mag: **Inspect the app:** ${dashboardUrl}`);

  links.push(`:compass: **Take it for a spin:** ${appUrl}`);

  return links;
}

module.exports.postCreateComment = async function (appName, appUrl, sha, message) {
  const comment = formatComment({
    image: owlberts.create,
    imageLink: appUrl,
    headline: 'A review app has been launched for this PR!',
    body: buildLinks(appName, appUrl, sha, message).join('\n\n'),
  });
  return postComment(comment);
};

module.exports.postUpdateComment = async function (appName, appUrl, sha, message) {
  const comment = formatComment({
    image: owlberts.update,
    imageLink: appUrl,
    headline: 'This PR’s review app has been redeployed!',
    body: buildLinks(appName, appUrl, sha, message).join('\n\n'),
  });
  return postComment(comment);
};

module.exports.postDeleteComment = async function () {
  const comment = formatComment({
    image: owlberts.delete,
    headline: 'This PR’s review app has been shut down.',
    body: `:sponge: Since this PR is closed, its review app has been cleaned up.`,
  });
  return postComment(comment);
};
