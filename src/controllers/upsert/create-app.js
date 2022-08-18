const heroku = require('../../heroku');
const Step = require('../step');

class CreateAppStep extends Step {
  constructor(params) {
    super(`Creating Heroku app "${params.appName}"`, params);
  }

  async checkPrereqs() {
    this.shouldRun = !(await heroku.appExists(this.params.appName));
  }

  async run() {
    return heroku.createApp(this.params);
  }
}

module.exports = CreateAppStep;
