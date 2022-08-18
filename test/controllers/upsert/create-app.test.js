const CreateAppStep = require('../../../src/controllers/upsert/create-app');
const heroku = require('../../../src/heroku');

const setupBeforeAndAfter = require('./setup');

const SAMPLE_APP_NAME = 'owlzilla';
const SAMPLE_PARAMS = { appName: SAMPLE_APP_NAME };

describe('#src/controllers/upsert/create-app', () => {
  setupBeforeAndAfter();

  describe('checkPrereqs()', () => {
    it('should run when the app does not exist', async () => {
      heroku.appExists = jest.fn(() => false);

      const step = new CreateAppStep(SAMPLE_PARAMS);
      await step.checkPrereqs();
      expect(step.shouldRun).toBe(true);
    });

    it('should not run when the app already exists', async () => {
      heroku.appExists = jest.fn(() => true);

      const step = new CreateAppStep(SAMPLE_PARAMS);
      await step.checkPrereqs();
      expect(step.shouldRun).toBe(false);
    });
  });

  describe('run()', () => {
    it('should call createApp', async () => {
      heroku.createApp = jest.fn();

      const step = new CreateAppStep(SAMPLE_PARAMS);
      await step.run();
      expect(heroku.createApp).toHaveBeenCalledTimes(1);
      expect(heroku.createApp).toHaveBeenCalledWith(SAMPLE_PARAMS);
    });
  });
});
