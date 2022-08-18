const heroku = require('../../heroku');

class HerokuLabsStep {
  constructor(params) {
    this.params = params;
    this.shouldRun = undefined;
    this.title = 'Enabling Heroku Labs features';
  }

  async checkPrereqs() {
    const appExists = await heroku.appExists(this.params.appName);
    if (!appExists) {
      this.shouldRun = true;
      return;
    }

    const app = await heroku.getApp(this.params.appName);
    this.shouldRun = !(
      (await heroku.getAppFeature(app.id, 'nodejs-language-metrics')).enabled &&
      (await heroku.getAppFeature(app.id, 'runtime-dyno-metadata')).enabled &&
      (await heroku.getAppFeature(app.id, 'runtime-heroku-metrics')).enabled
    );
  }

  async run() {
    const app = await heroku.getApp(this.params.appName);
    await heroku.setAppFeature(app.id, 'nodejs-language-metrics', true);
    await heroku.setAppFeature(app.id, 'runtime-dyno-metadata', true);
    await heroku.setAppFeature(app.id, 'runtime-heroku-metrics', true);
  }
}

module.exports = HerokuLabsStep;
