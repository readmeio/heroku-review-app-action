const childProcess = require('child_process');
const core = require('@actions/core');
const fs = require('fs');
const path = require('path');

/*
 * Wrapper to run an arbitrary git command
 */
function git(command, args) {
  const result = childProcess.spawnSync('git', [command, ...args], { stdio: 'inherit' });
  if (result.status !== 0 && process.env.NODE_ENV !== 'test') {
    core.warning(`\nWarning: git ${command} exited with status code ${result.status}.`);
  }
  return result;
}

/* Checks whether the current directory contains a Git repo. Returns bool. */
module.exports.repoExists = () => {
  try {
    fs.statSync(path.join('.', '.git'));
    return true;
  } catch (err) {
    return false;
  }
};

/* Checks whether the given ref exists in the given repo. Returns bool. */
module.exports.refExists = ref => {
  const result = git('show-ref', ['--verify', '--quiet', ref]);
  return result.status === 0;
};

/*
 * Pushes code to Heroku's "master" branch, which deploys it to the given app.
 * Returns the result of child_process.spawn(); for documentation see
 * https://nodejs.org/api/child_process.html.
 */
module.exports.push = (credentials, appName, ref) => {
  const url = new URL(`https://git.heroku.com/${appName}.git`);
  url.username = credentials.email;
  url.password = credentials.apiKey;
  return git('push', ['--force', url.href, `${ref}:refs/heads/master`]);
};
