const heroku = require('../../heroku');

class SetDomainStep {
  constructor(params) {
    this.params = params;
    this.shouldRun = undefined;
    this.title = 'Configuring custom domains in Cloudflare';
  }

  async checkPrereqs() {
    this.shouldRun = this.params.pipelineName === 'readme';
  }

  async run() {
    const app = await heroku.getApp(this.params.appName);
    return heroku.runAppCommand(app.id, 'node bin/setdomain.js');
  }
}

module.exports = SetDomainStep;
