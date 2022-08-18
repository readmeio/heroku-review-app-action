const heroku = require('../../heroku');

class LogDrainStep {
  constructor(params) {
    this.params = params;
    this.shouldRun = undefined;
    this.title = 'Configuring app to send logs to Logstash';
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
    await heroku.addDrain(app.id, this.params.logDrainUrl);
  }
}

module.exports = LogDrainStep;
