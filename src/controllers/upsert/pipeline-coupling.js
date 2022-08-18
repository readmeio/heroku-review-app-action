const heroku = require('../../heroku');

class PipelineCouplingStep {
  constructor(params) {
    this.params = params;
    this.shouldRun = undefined;
    this.title = `Associating app with Heroku pipeline "${params.pipelineName}"`;
  }

  async checkPrereqs() {
    const appExists = await heroku.appExists(this.params.appName);
    if (appExists) {
      const pipelineApps = await heroku.getPipelineApps(this.params.pipelineId);
      const app = await heroku.getApp(this.params.appName);
      this.shouldRun = !pipelineApps.includes(app.id);
    } else {
      this.shouldRun = false;
    }
  }

  async run() {
    const app = await heroku.getApp(this.params.appName);
    return heroku.coupleAppToPipeline(app.id, this.params.pipelineId);
  }
}

module.exports = PipelineCouplingStep;
