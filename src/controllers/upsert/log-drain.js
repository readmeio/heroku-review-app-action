const heroku = require('../../heroku');
const Step = require('../step');

class LogDrainStep extends Step {
  constructor(params) {
    super('Configuring app to send logs to Logstash', params);
  }

  async checkPrereqs() {
    if (!this.params.logDrainUrl) {
      this.shouldRun = false;
      return;
    }

    const appExists = await heroku.appExists(this.params.appName);
    if (!appExists) {
      this.shouldRun = true;
      return;
    }

    const app = await heroku.getApp(this.params.appName);
    const existingDrains = await heroku.getDrains(app.id);
    this.shouldRun = !existingDrains.includes(this.params.logDrainUrl);
  }

  async run() {
    const app = await heroku.getApp(this.params.appName);
    return heroku.addDrain(app.id, this.params.logDrainUrl);
  }
}

module.exports = LogDrainStep;
