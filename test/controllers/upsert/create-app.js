const CreateAppStep = require('../../../src/controllers/upsert/create-app');
const heroku = require('../../../src/heroku');

const SAMPLE_APP_NAME = 'owlzilla';
const SAMPLE_RESPONSE = { response_field: 'response_value' };

describe('#src/controllers/upsert/create-app', () => {
  afterEach(jest.restoreAllMocks);

  describe('checkPrereqs()', () => {
    it('should run when the app does not exist', async () => {
      heroku.appExists = jest.fn(() => false);

      const step = new CreateAppStep({ appName: SAMPLE_APP_NAME });
      await step.checkPrereqs();
      expect(step.shouldRun).toBe(true);
    });

    it('should not run when the app already exists', async () => {
      heroku.appExists = jest.fn(() => true);

      const step = new CreateAppStep({ appName: SAMPLE_APP_NAME });
      await step.checkPrereqs();
      expect(step.shouldRun).toBe(false);
    });
  });

  describe('run()', () => {
    it('should call createApp', async () => {
      heroku.createApp = jest.fn(() => SAMPLE_RESPONSE);

      const step = new CreateAppStep({ appName: SAMPLE_APP_NAME });
      await expect(step.run()).resolves.toStrictEqual(SAMPLE_RESPONSE);
      expect(heroku.createApp.mock.calls.length).toBe(1);
      expect(heroku.createApp.mock.calls[0][0]).toBe(SAMPLE_APP_NAME);
    });
  });
});
