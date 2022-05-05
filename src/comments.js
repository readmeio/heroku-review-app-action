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
  let result = '';
  if (options.image) {
    if (options.imageLink) {
      result += `<a href="${options.imageLink}">`;
    }
    result += `<img align="right" height="100" src="${options.image}" />`;
    if (options.imageLink) {
      result += `</a>`;
    }
  }

  if (options.headline) {
    result += `\n\n## ${options.headline}`;
  }

  if (options.body) {
    result += `\n\n${options.body}`;
  }
  return result;
}

module.exports.postCreateComment = async function (appName, appUrl) {
  const dashboardUrl = `https://dashboard.heroku.com/apps/${appName}`;
  const comment = formatComment({
    image: owlberts.create,
    imageLink: appUrl,
    headline: 'A review app has been launched for this PR!',
    body: `:mag: **Inspect the app:** ${dashboardUrl}\n\n:compass: **Take it for a spin:** ${appUrl}`,
  });
  return postComment(comment);
};

module.exports.postUpdateComment = async function (appName, appUrl) {
  const dashboardUrl = `https://dashboard.heroku.com/apps/${appName}`;
  const comment = formatComment({
    image: owlberts.update,
    imageLink: appUrl,
    headline: 'This PR‘s review app has been redeployed!',
    body: `:mag: **Inspect the app:** ${dashboardUrl}\n\n:compass: **Take it for a spin:** ${appUrl}`,
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
