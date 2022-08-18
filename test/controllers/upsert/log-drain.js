const nock = require('nock');

const LogDrainStep = require('../../../src/controllers/upsert/log-drain');
const heroku = require('../../../src/heroku');

const SAMPLE_APP_ID = '11111111-2222-3333-4444-555555555555';
const SAMPLE_APP_NAME = 'owlzilla';
const SAMPLE_DRAIN_URL = 'https://example.com/log-drain/12345';

describe('#src/controllers/upsert/log-drain', () => {
  beforeAll(() => {
    nock.disableNetConnect();
  });

  afterAll(() => {
    nock.enableNetConnect();
  });

  afterEach(jest.restoreAllMocks);

  describe('checkPrereqs()', () => {
    it('should not run if the logDrainUrl parameter is empty', async () => {
      const step1 = new LogDrainStep({ appName: SAMPLE_APP_NAME });
      await step1.checkPrereqs();
      expect(step1.shouldRun).toBe(false);

      const step2 = new LogDrainStep({ appName: SAMPLE_APP_NAME, logDrainUrl: '' });
      await step2.checkPrereqs();
      expect(step2.shouldRun).toBe(false);
    });

    it('should run when creating a new app and a drain is specified', async () => {
      heroku.appExists = jest.fn(() => false);

      const step = new LogDrainStep({ appName: SAMPLE_APP_NAME, logDrainUrl: SAMPLE_DRAIN_URL });
      await step.checkPrereqs();
      expect(step.shouldRun).toBe(true);
    });

    it('should run when the app exists and the given drain is not present', async () => {
      heroku.appExists = jest.fn(() => true);
      heroku.getApp = jest.fn(() => ({ id: SAMPLE_APP_ID }));
      heroku.getDrains = jest.fn(() => []);

      const step = new LogDrainStep({ appName: SAMPLE_APP_NAME, logDrainUrl: SAMPLE_DRAIN_URL });
      await step.checkPrereqs();
      expect(step.shouldRun).toBe(true);
    });

    it('should not run if the app exists and the given drain is already present', async () => {
      heroku.appExists = jest.fn(() => true);
      heroku.getApp = jest.fn(() => ({ id: SAMPLE_APP_ID }));
      heroku.getDrains = jest.fn(() => [SAMPLE_DRAIN_URL]);

      const step = new LogDrainStep({ appName: SAMPLE_APP_NAME, logDrainUrl: SAMPLE_DRAIN_URL });
      await step.checkPrereqs();
      expect(step.shouldRun).toBe(false);
    });
  });

  describe('run()', () => {
    it('should call addDrain with the correct drain URL', async () => {
      heroku.getApp = jest.fn(() => ({ id: SAMPLE_APP_ID }));
      heroku.addDrain = jest.fn();

      const step = new LogDrainStep({ appName: SAMPLE_APP_NAME, logDrainUrl: SAMPLE_DRAIN_URL });
      await step.run();
      expect(heroku.addDrain).toHaveBeenCalledTimes(1);
      expect(heroku.addDrain).toHaveBeenCalledWith(SAMPLE_APP_ID, SAMPLE_DRAIN_URL);
    });
  });
});
