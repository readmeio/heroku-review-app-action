const heroku = require('../../heroku');

class HerokuStackStep {
  constructor(params) {
    this.params = params;
    this.shouldRun = undefined;
    this.title = `Setting the Heroku stack to ${params.stack}`;
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
    this.shouldRun = app.stack.name !== this.params.stack;
  }

  async run() {
    const app = await heroku.getApp(this.params.appName);
    await heroku.setAppStack(app.id, this.params.stack);
  }
}

module.exports = HerokuStackStep;
