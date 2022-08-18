const heroku = require('../../heroku');
const Step = require('../step');

class HerokuStackStep extends Step {
  constructor(params) {
    super(`Setting the Heroku stack to ${params.herokuStack}`, params);
  }

  async checkPrereqs() {
    if (this.params.useDocker) {
      this.shouldRun = false;
      return;
    }

    const appExists = await heroku.appExists(this.params.appName);
    if (!appExists) {
      this.shouldRun = false;
      return;
    }

    const app = await heroku.getApp(this.params.appName);
    this.shouldRun = app.stack.name !== this.params.herokuStack;
  }

  async run() {
    return heroku.setAppStack(this.params.appName, this.params.herokuStack);
  }
}

module.exports = HerokuStackStep;
