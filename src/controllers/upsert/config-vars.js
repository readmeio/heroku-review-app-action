const core = require('@actions/core');

const heroku = require('../../heroku');

class ConfigVarsStep {
  constructor(params) {
    this.params = params;
    this.shouldRun = undefined;
    this.title = 'Setting default config vars';
  }

  async checkPrereqs() {
    this.pipelineId = await heroku.getPipelineId(this.params.pipelineName);
    if (!this.pipelineId) {
      throw new Error(`The pipeline "${this.params.pipelineName}" does not exist on Heroku`);
    }

    this.appExists = await heroku.appExists(this.params.appName);
    this.configVars = await heroku.getPipelineVars(this.pipelineId);
    this.shouldRun = Object.keys(this.configVars).length > 0;
  }

  async run() {
    if (this.appExists) {
      core.info('  - This will reset any config vars that you have changed on this app.');
    }
    const app = await heroku.getApp(this.params.appName);
    return heroku.setAppVars(app.id, this.configVars);
  }
}

module.exports = ConfigVarsStep;
