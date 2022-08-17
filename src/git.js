const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

const core = require('@actions/core');

/*
 * Wrapper to run an arbitrary git command
 */
function git(command, args, captureOutput = false) {
  const options = { stdio: captureOutput ? 'pipe' : 'inherit' };
  const result = childProcess.spawnSync('git', [command, ...args], options);
  if (result.status !== 0 && process.env.NODE_ENV !== 'test') {
    core.warning(`\nWarning: git ${command} exited with status code ${result.status}.`);
  }
  return result;
}

/*
 * Returns the short commit message the latest commit in the given ref. This is
 * usually only the first line of the message, but can occasionally be more than
 * one line, for example in merge commits.
 */
function gitLog(ref, format) {
  const result = git('log', [`--pretty=format:${format}`, '--no-merges', '--quiet', `${ref}~1..${ref}`], true);
  if (result.status !== 0) {
    return undefined;
  }
  // convert the buffer to a string, then return just the first line
  return result.stdout.toString().trim().split('\n')[0];
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
 * Returns the SHA hash of the latest commit in the given ref.
 */
module.exports.shaForRef = ref => {
  return gitLog(ref, '%H');
};

/*
 * Returns the short commit message of the latest commit in the given ref. This
 * is usually only the first line of the message, but can occasionally be more
 * than one line, for example in merge commits.
 */
module.exports.messageForRef = ref => {
  return gitLog(ref, '%s');
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
