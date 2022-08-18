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
    const features = await Promise.all([
      heroku.getAppFeature(app.id, 'nodejs-language-metrics'),
      heroku.getAppFeature(app.id, 'runtime-dyno-metadata'),
      heroku.getAppFeature(app.id, 'runtime-heroku-metrics'),
    ]);
    this.shouldRun = !(features[0].enabled && features[1].enabled && features[2].enabled);
  }

  async run() {
    const app = await heroku.getApp(this.params.appName);
    return Promise.all([
      heroku.setAppFeature(app.id, 'nodejs-language-metrics', true),
      heroku.setAppFeature(app.id, 'runtime-dyno-metadata', true),
      heroku.setAppFeature(app.id, 'runtime-heroku-metrics', true),
    ]);
  }
}

module.exports = HerokuLabsStep;
