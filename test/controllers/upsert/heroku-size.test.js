const HerokuSizeStep = require('../../../src/controllers/upsert/heroku-size');
const heroku = require('../../../src/heroku');

const setupBeforeAndAfter = require('./setup');

const SAMPLE_APP_NAME = 'owlzilla';

describe('#src/controllers/upsert/heroku-size', () => {
  setupBeforeAndAfter();

  describe('checkPrereqs()', () => {
    it('should not run when creating a new app if size matches the default', async () => {
      jest.spyOn(heroku, 'appExists').mockResolvedValue(false);
      const step = new HerokuSizeStep({ appName: SAMPLE_APP_NAME, herokuSize: 'standard-1x' });
      await step.checkPrereqs();
      expect(step.shouldRun).toBe(false);
    });

    it('should run when creating a new app if size differs from the default', async () => {
      jest.spyOn(heroku, 'appExists').mockResolvedValue(false);
      const step = new HerokuSizeStep({ appName: SAMPLE_APP_NAME, herokuSize: 'different-size' });
      await step.checkPrereqs();
      expect(step.shouldRun).toBe(true);
    });

    it('should not run on an existing app if the current size matches the desired size', async () => {
      jest.spyOn(heroku, 'appExists').mockResolvedValue(true);
      jest.spyOn(heroku, 'getAppSize').mockResolvedValue('current-size');
      const step = new HerokuSizeStep({ appName: SAMPLE_APP_NAME, herokuSize: 'current-size' });
      await step.checkPrereqs();
      expect(step.shouldRun).toBe(false);
    });

    it('should run on an existing app if the current size differs from the desired size', async () => {
      jest.spyOn(heroku, 'appExists').mockResolvedValue(true);
      jest.spyOn(heroku, 'getAppSize').mockResolvedValue('current-size');
      const step = new HerokuSizeStep({ appName: SAMPLE_APP_NAME, herokuSize: 'different-size' });
      await step.checkPrereqs();
      expect(step.shouldRun).toBe(true);
    });

    it('should run on an existing app if the formation does not exist', async () => {
      jest.spyOn(heroku, 'appExists').mockResolvedValue(true);
      jest.spyOn(heroku, 'getAppSize').mockRejectedValue(new Error('404 Not Found'));
      const step = new HerokuSizeStep({ appName: SAMPLE_APP_NAME, herokuSize: 'current-size' });
      await step.checkPrereqs();
      expect(step.shouldRun).toBe(true);
    });
  });

  describe('run()', () => {
    it('should call setAppSize with correct params', async () => {
      const SAMPLE_PARAMS = { appName: SAMPLE_APP_NAME, herokuSize: 'new-size' };
      jest.spyOn(heroku, 'setAppSize').mockResolvedValue({ size: 'new-size' });
      const step = new HerokuSizeStep(SAMPLE_PARAMS);
      await step.run();
      expect(heroku.setAppSize).toHaveBeenCalledTimes(1);
      expect(heroku.setAppSize).toHaveBeenCalledWith(SAMPLE_PARAMS);
    });
  });
});
