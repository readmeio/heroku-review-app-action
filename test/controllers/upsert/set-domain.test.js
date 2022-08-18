const SetDomainStep = require('../../../src/controllers/upsert/set-domain');
const heroku = require('../../../src/heroku');

const SAMPLE_APP_ID = '11111111-2222-3333-4444-555555555555';
const SAMPLE_APP_NAME = 'owlzilla';
const SAMPLE_RESPONSE = { response_field: 'response_value' };

describe('#src/controllers/upsert/set-domain', () => {
  afterEach(jest.restoreAllMocks);

  describe('checkPrereqs()', () => {
    it('should run on the "readme" pipeline', async () => {
      const readmeStep = new SetDomainStep({ pipelineName: 'readme' });
      await readmeStep.checkPrereqs();
      expect(readmeStep.shouldRun).toBe(true);
    });

    it('should not run on other pipelines', async () => {
      const otherStep = new SetDomainStep({ pipelineName: 'not-readme' });
      await otherStep.checkPrereqs();
      expect(otherStep.shouldRun).toBe(false);
    });
  });

  describe('run()', () => {
    it('should run the appropriate command in a new Heroku dyno', async () => {
      heroku.getApp = jest.fn(() => ({ id: SAMPLE_APP_ID }));
      heroku.runAppCommand = jest.fn();

      const step = new SetDomainStep({ appName: SAMPLE_APP_NAME, pipelineName: 'readme' });
      await expect(step.run()).resolves;
      expect(heroku.runAppCommand.mock.calls.length).toBe(1);
      expect(heroku.runAppCommand.mock.calls[0][0]).toBe(SAMPLE_APP_ID);
      expect(heroku.runAppCommand.mock.calls[0][1]).toBe('node bin/setdomain.js');
    });
  });
});
