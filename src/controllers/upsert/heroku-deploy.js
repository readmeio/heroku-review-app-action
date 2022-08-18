const git = require('../../git');
const heroku = require('../../heroku');
const Step = require('../step');

class HerokuDeployStep extends Step {
  constructor(params) {
    super('Deploying the app to Heroku -- this may take a few minutes', params);
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
