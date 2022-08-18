const heroku = require('../../heroku');

class HerokuStackStep {
  constructor(params) {
    this.params = params;
    this.shouldRun = undefined;
    this.title = `Setting the Heroku stack to ${params.herokuStack}`;
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
