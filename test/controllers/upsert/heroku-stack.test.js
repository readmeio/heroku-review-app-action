const HerokuStackStep = require('../../../src/controllers/upsert/heroku-stack');
const heroku = require('../../../src/heroku');

const setupBeforeAndAfter = require('./setup');

const SAMPLE_APP_ID = '11111111-2222-3333-4444-555555555555';
const SAMPLE_APP_NAME = 'owlzilla';
const SAMPLE_STACK_NAME = 'heroku-2112';

describe('#src/controllers/upsert/heroku-stack', () => {
  setupBeforeAndAfter();

  describe('checkPrereqs()', () => {
    it('should never run when creating a new app', async () => {
      heroku.appExists = jest.fn(() => false);

      const step = new HerokuStackStep({ appName: SAMPLE_APP_NAME, herokuStack: SAMPLE_STACK_NAME });
      await step.checkPrereqs();
      expect(step.shouldRun).toBe(false);
    });

    it('should run when the app exists but is on the wrong stack', async () => {
      heroku.appExists = jest.fn(() => true);
      heroku.getApp = jest.fn(() => ({ id: SAMPLE_APP_ID, stack: { name: 'heroku-24601' } }));

      const step = new HerokuStackStep({ appName: SAMPLE_APP_NAME, herokuStack: SAMPLE_STACK_NAME });
      await step.checkPrereqs();
      expect(step.shouldRun).toBe(true);
    });

    it('should not run if the app exists and is on the desired stack', async () => {
      heroku.appExists = jest.fn(() => true);
      heroku.getApp = jest.fn(() => ({ id: SAMPLE_APP_ID, stack: { name: SAMPLE_STACK_NAME } }));

      const step = new HerokuStackStep({ appName: SAMPLE_APP_NAME, herokuStack: SAMPLE_STACK_NAME });
      await step.checkPrereqs();
      expect(step.shouldRun).toBe(false);
    });
  });

  describe('run()', () => {
    it('should call setAppStack with correct stack name', async () => {
      heroku.setAppStack = jest.fn();

      const step = new HerokuStackStep({ appName: SAMPLE_APP_NAME, herokuStack: SAMPLE_STACK_NAME });
      await step.run();
      expect(heroku.setAppStack).toHaveBeenCalledTimes(1);
      expect(heroku.setAppStack).toHaveBeenCalledWith(SAMPLE_APP_NAME, SAMPLE_STACK_NAME);
    });
  });
});
