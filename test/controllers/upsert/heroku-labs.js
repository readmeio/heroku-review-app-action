const nock = require('nock');

const HerokuLabsStep = require('../../../src/controllers/upsert/heroku-labs');
const heroku = require('../../../src/heroku');

const SAMPLE_APP_ID = '11111111-2222-3333-4444-555555555555';
const SAMPLE_APP_NAME = 'owlzilla';
const SAMPLE_PIPELINE_NAME = 'owlpipeline';

describe('#src/controllers/upsert/heroku-labs', () => {
  beforeAll(() => {
    nock.disableNetConnect();
  });

  afterAll(() => {
    nock.enableNetConnect();
  });

  afterEach(jest.restoreAllMocks);

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

      const step = new HerokuLabsStep({ appName: SAMPLE_APP_NAME, pipelineName: SAMPLE_PIPELINE_NAME });
      await expect(step.run()).resolves;
      expect(heroku.setAppFeature.mock.calls.length).toBe(3);
      expect(heroku.setAppFeature.mock.calls[0][0]).toBe(SAMPLE_APP_ID);
      expect(heroku.setAppFeature.mock.calls[1][0]).toBe(SAMPLE_APP_ID);
      expect(heroku.setAppFeature.mock.calls[2][0]).toBe(SAMPLE_APP_ID);

      // The features are all set concurrently so they could run in any order;
      // our check needs to account for that.
      const features = [
        heroku.setAppFeature.mock.calls[0][1],
        heroku.setAppFeature.mock.calls[1][1],
        heroku.setAppFeature.mock.calls[2][1],
      ];
      features.sort();
      expect(features).toStrictEqual(['nodejs-language-metrics', 'runtime-dyno-metadata', 'runtime-heroku-metrics']);
    });
  });
});
