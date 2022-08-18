const ConfigVarsStep = require('../../../src/controllers/upsert/config-vars');
const heroku = require('../../../src/heroku');

const SAMPLE_APP_ID = '11111111-2222-3333-4444-555555555555';
const SAMPLE_PIPELINE_ID = '22222222-3333-4444-5555-666666666666';
const SAMPLE_APP_NAME = 'owlzilla';
const SAMPLE_PIPELINE_NAME = 'owlpipeline';
const SAMPLE_RESPONSE = { response_field: 'response_value' };
const SAMPLE_CONFIG_VARS = { VAR1: 'value1', VAR2: 'value2' };

describe('#src/controllers/upsert/config-vars', () => {
  afterEach(jest.restoreAllMocks);

  describe('checkPrereqs()', () => {
    it('should run when the pipeline has 1 or more config vars', async () => {
      heroku.getPipelineId = jest.fn(() => ({ id: SAMPLE_PIPELINE_ID }));
      heroku.appExists = jest.fn(() => true);
      heroku.getPipelineVars = jest.fn(() => SAMPLE_CONFIG_VARS);

      const step = new ConfigVarsStep({ pipelineName: SAMPLE_PIPELINE_NAME });
      await step.checkPrereqs();
      expect(step.shouldRun).toBe(true);
    });

    it('should not run when the pipeline has 0 config vars', async () => {
      heroku.getPipelineId = jest.fn(() => ({ id: SAMPLE_PIPELINE_ID }));
      heroku.appExists = jest.fn(() => true);
      heroku.getPipelineVars = jest.fn(() => ({}));

      const step = new ConfigVarsStep({ pipelineName: SAMPLE_PIPELINE_NAME });
      await step.checkPrereqs();
      expect(step.shouldRun).toBe(false);
    });
  });

  describe('run()', () => {
    it('should call setAppVars with the appropriate config vars', async () => {
      heroku.getApp = jest.fn(() => ({ id: SAMPLE_APP_ID }));
      heroku.setAppVars = jest.fn();

      const step = new ConfigVarsStep({ appName: SAMPLE_APP_NAME, pipelineName: SAMPLE_PIPELINE_NAME });
      step.configVars = SAMPLE_CONFIG_VARS;
      await expect(step.run()).resolves;
      expect(heroku.setAppVars.mock.calls.length).toBe(1);
      expect(heroku.setAppVars.mock.calls[0][0]).toBe(SAMPLE_APP_ID);
      expect(heroku.setAppVars.mock.calls[0][1]).toBe(SAMPLE_CONFIG_VARS);
    });
  });
});
