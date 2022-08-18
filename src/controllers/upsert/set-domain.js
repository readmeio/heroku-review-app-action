const heroku = require('../../heroku');
const Step = require('../step');

class SetDomainStep extends Step {
  constructor(params) {
    super('Configuring custom domains in Cloudflare', params);
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
