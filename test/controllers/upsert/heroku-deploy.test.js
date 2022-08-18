const HerokuDeployStep = require('../../../src/controllers/upsert/heroku-deploy');
const git = require('../../../src/git');
const heroku = require('../../../src/heroku');

const setupBeforeAndAfter = require('./setup');

const SAMPLE_APP_NAME = 'owlzilla';
const SAMPLE_CREDENTIALS = { email: 'geddy@example.com', apiKey: '33333333-4444-5555-6666-777777777777' };
const SAMPLE_REF_NAME = 'refs/remotes/pull/52722/merge';

describe('#src/controllers/upsert/heroku-deploy', () => {
  setupBeforeAndAfter();

  describe('checkPrereqs()', () => {
    it('should run when not explicitly configured for Docker deploys', async () => {
      const step = new HerokuDeployStep({ appName: SAMPLE_APP_NAME, useDocker: false });
      await step.checkPrereqs();
      expect(step.shouldRun).toBe(true);
    });

    it('should not run when configured for Docker deploys', async () => {
      const step = new HerokuDeployStep({ appName: SAMPLE_APP_NAME, useDocker: true });
      await step.checkPrereqs();
      expect(step.shouldRun).toBe(false);
    });
  });

  describe('run()', () => {
    it('should call git.push() with correct parameters', async () => {
      heroku.getCredentials = jest.fn(() => SAMPLE_CREDENTIALS);
      git.push = jest.fn(() => ({ status: 0 }));

      const step = new HerokuDeployStep({ appName: SAMPLE_APP_NAME, refName: SAMPLE_REF_NAME });
      await step.run();
      expect(git.push).toHaveBeenCalledTimes(1);
      expect(git.push).toHaveBeenCalledWith(SAMPLE_CREDENTIALS, SAMPLE_APP_NAME, SAMPLE_REF_NAME);
    });

    it('should throw an error if git.push() returns a non-zero status', async () => {
      heroku.getCredentials = jest.fn(() => SAMPLE_CREDENTIALS);
      git.push = jest.fn(() => ({ status: 1 }));

      const step = new HerokuDeployStep({ appName: SAMPLE_APP_NAME, refName: SAMPLE_REF_NAME });
      await expect(step.run()).rejects.toThrow(/Ran into errors when deploying Heroku app/);
      expect(git.push).toHaveBeenCalledTimes(1);
      expect(git.push).toHaveBeenCalledWith(SAMPLE_CREDENTIALS, SAMPLE_APP_NAME, SAMPLE_REF_NAME);
    });
  });
});
