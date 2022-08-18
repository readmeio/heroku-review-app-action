const heroku = require('../../heroku');
const Step = require('../step');

class PipelineCouplingStep extends Step {
  constructor(params) {
    super(`Associating app with Heroku pipeline "${params.pipelineName}"`, params);
  }

  async checkPrereqs() {
    this.pipelineId = await heroku.getPipelineId(this.params.pipelineName);
    if (!this.pipelineId) {
      throw new Error(`The pipeline "${this.params.pipelineName}" does not exist on Heroku`);
    }

    const appExists = await heroku.appExists(this.params.appName);
    if (!appExists) {
      this.shouldRun = true;
      return;
    }

    const pipelineApps = await heroku.getPipelineApps(this.pipelineId);
    const app = await heroku.getApp(this.params.appName);
    this.shouldRun = !pipelineApps.includes(app.id);
  }

  async run() {
    const app = await heroku.getApp(this.params.appName);
    return heroku.coupleAppToPipeline(app.id, this.pipelineId);
  }
}

module.exports = PipelineCouplingStep;
