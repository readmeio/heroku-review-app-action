const core = require('@actions/core');

const heroku = require('../../heroku');

class ConfigVarsStep {
  constructor(params) {
    this.params = params;
    this.shouldRun = undefined;
    this.title = 'Setting default config vars';
  }

  async checkPrereqs() {
    this.appExists = await heroku.appExists(this.params.appName);
    this.configVars = await heroku.getPipelineVars(this.params.pipelineId);
    this.shouldRun = Object.keys(this.configVars).length > 0;
  }

  async run() {
    if (this.appExists) {
      core.info('  - This will reset any config vars that you have changed on this app.');
    }
    const app = await heroku.getApp(this.params.appName);
    await heroku.setAppVars(app.id, this.configVars);
  }
}

module.exports = ConfigVarsStep;
