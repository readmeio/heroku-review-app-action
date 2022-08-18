const HerokuLabsStep = require('../../../src/controllers/upsert/heroku-labs');
const heroku = require('../../../src/heroku');

const setupBeforeAndAfter = require('./setup');

const SAMPLE_APP_ID = '11111111-2222-3333-4444-555555555555';
const SAMPLE_APP_NAME = 'owlzilla';

describe('#src/controllers/upsert/heroku-labs', () => {
  setupBeforeAndAfter();

  describe('checkPrereqs()', () => {
    it('should always run when creating a new app', async () => {
      heroku.appExists = jest.fn(() => false);

      const step = new HerokuLabsStep({ appName: SAMPLE_APP_NAME });
      await step.checkPrereqs();
      expect(step.shouldRun).toBe(true);
    });

    it('should run when the app exists but any required feature is disabled', async () => {
      heroku.appExists = jest.fn(() => true);
      heroku.getApp = jest.fn(() => ({ id: SAMPLE_APP_ID }));
      heroku.getAppFeature = jest.fn(() => ({ enabled: false }));

      const step = new HerokuLabsStep({ appName: SAMPLE_APP_NAME });
      await step.checkPrereqs();
      expect(step.shouldRun).toBe(true);
    });

    it('should not run if the app exists and all any required features are enabled', async () => {
      heroku.appExists = jest.fn(() => true);
      heroku.getApp = jest.fn(() => ({ id: SAMPLE_APP_ID }));
      heroku.getAppFeature = jest.fn(() => ({ enabled: true }));

      const step = new HerokuLabsStep({ appName: SAMPLE_APP_NAME });
      await step.checkPrereqs();
      expect(step.shouldRun).toBe(false);
    });
  });

  describe('run()', () => {
    it('should call setAppFeature 3 times with correct feature names', async () => {
      heroku.getApp = jest.fn(() => ({ id: SAMPLE_APP_ID }));
      heroku.setAppFeature = jest.fn();

      const step = new HerokuLabsStep({ appName: SAMPLE_APP_NAME });
      await step.run();
      expect(heroku.setAppFeature).toHaveBeenCalledTimes(3);
      expect(heroku.setAppFeature).toHaveBeenCalledWith(SAMPLE_APP_ID, 'nodejs-language-metrics', true);
      expect(heroku.setAppFeature).toHaveBeenCalledWith(SAMPLE_APP_ID, 'runtime-dyno-metadata', true);
      expect(heroku.setAppFeature).toHaveBeenCalledWith(SAMPLE_APP_ID, 'runtime-heroku-metrics', true);
    });
  });
});
