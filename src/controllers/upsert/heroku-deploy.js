const git = require('../../git');
const heroku = require('../../heroku');

class HerokuDeployStep {
  constructor(params) {
    this.params = params;
    this.shouldRun = undefined;
    this.title = 'Deploying the app to Heroku -- this may take a few minutes';
  }

  async checkPrereqs() {
    this.shouldRun = !this.params.useDocker;
  }

  async run() {
    const credentials = heroku.getCredentials();
    const pushResult = git.push(credentials, this.params.appName, this.params.refName);
    if (pushResult.status !== 0) {
      throw new Error(`Ran into errors when deploying Heroku app "${this.params.appName}".`);
    }
  }
}

module.exports = HerokuDeployStep;
