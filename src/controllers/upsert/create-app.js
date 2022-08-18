const heroku = require('../../heroku');

class CreateAppStep {
  constructor(params) {
    this.params = params;
    this.shouldRun = undefined;
    this.title = `Creating Heroku app "${params.appName}"`;
  }

  async checkPrereqs() {
    this.shouldRun = !(await heroku.appExists(this.params.appName));
  }

  async run() {
    return heroku.createApp(this.params.appName);
  }
}

module.exports = CreateAppStep;
