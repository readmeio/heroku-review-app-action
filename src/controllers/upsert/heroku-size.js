const core = require('@actions/core');

const heroku = require('../../heroku');
const Step = require('../step');

const DEFAULT_DYNO_SIZE = 'standard-1x';

class HerokuSizeStep extends Step {
  constructor(params) {
    super('Setting Heroku dyno size', params);
  }

  async checkPrereqs() {
    this.currentSize = 'unknown';
    if (await heroku.appExists(this.params.appName)) {
      try {
        this.currentSize = await heroku.getAppSize(this.params.appName);
      } catch (err) {
        // This will encounter an error if the app exists but has never been
        // deployed. This isn't a problem -- in that case this.currentSize will
        // be set to 'unknown' which is safe, it will force the step to run.
      }
    } else {
      this.currentSize = DEFAULT_DYNO_SIZE;
    }
    this.shouldRun = this.params.herokuSize.toLowerCase() !== this.currentSize.toLowerCase();
  }

  async run() {
    core.info(`  - Changing dyno size from ${this.currentSize} to ${this.params.herokuSize}`);
    return heroku.setAppSize(this.params);
  }
}

module.exports = HerokuSizeStep;
