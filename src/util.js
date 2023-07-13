const core = require('@actions/core');
const github = require('@actions/github');

const FAKE_GITHUB_TOKEN = 'ghp_thisisafaketokenwhichdoesnotwork';

let memoizedOctokit;

/*
 * Returns an instance of Octokit, or a stub if there's no auth token present.
 */
module.exports.getOctokit = () => {
  if (!memoizedOctokit) {
    const token = process.env.JEST_WORKER_ID ? FAKE_GITHUB_TOKEN : core.getInput('github_token', { required: true });
    memoizedOctokit = github.getOctokit(token);
  }
  return memoizedOctokit;
};
