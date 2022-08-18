const PipelineCouplingStep = require('../../../src/controllers/upsert/pipeline-coupling');
const heroku = require('../../../src/heroku');

const setupBeforeAndAfter = require('./setup');

const SAMPLE_APP_ID = '11111111-2222-3333-4444-555555555555';
const SAMPLE_APP_NAME = 'owlzilla';
const SAMPLE_PIPELINE_NAME = 'owlline';
const SAMPLE_PIPELINE_ID = '22222222-3333-4444-5555-666666666666';

describe('#src/controllers/upsert/pipeline-coupling', () => {
  setupBeforeAndAfter();

  describe('checkPrereqs()', () => {
    it('should always run when creating a new app', async () => {
      heroku.appExists = jest.fn(() => false);
      heroku.getPipelineId = jest.fn(() => SAMPLE_PIPELINE_ID);

      const step = new PipelineCouplingStep({ appName: SAMPLE_APP_NAME, pipelineName: SAMPLE_PIPELINE_NAME });
      await step.checkPrereqs();
      expect(step.shouldRun).toBe(true);
    });

    it('should run when the app exists but is not coupled to the pipeline', async () => {
      heroku.appExists = jest.fn(() => true);
      heroku.getPipelineId = jest.fn(() => SAMPLE_PIPELINE_ID);
      heroku.getApp = jest.fn(() => ({ id: SAMPLE_APP_ID }));
      heroku.getPipelineApps = jest.fn(() => []);

      const step = new PipelineCouplingStep({ appName: SAMPLE_APP_NAME, pipelineName: SAMPLE_PIPELINE_NAME });
      await step.checkPrereqs();
      expect(step.shouldRun).toBe(true);
      expect(step.pipelineId).toBe(SAMPLE_PIPELINE_ID);
    });

    it('should not run if the app exists and is coupled to the right pipeline', async () => {
      heroku.appExists = jest.fn(() => true);
      heroku.getPipelineId = jest.fn(() => SAMPLE_PIPELINE_ID);
      heroku.getApp = jest.fn(() => ({ id: SAMPLE_APP_ID }));
      heroku.getPipelineApps = jest.fn(() => [SAMPLE_APP_ID]);

      const step = new PipelineCouplingStep({ appName: SAMPLE_APP_NAME, pipelineName: SAMPLE_PIPELINE_NAME });
      await step.checkPrereqs();
      expect(step.shouldRun).toBe(false);
    });
  });

  describe('run()', () => {
    it('should call coupleAppToPipeline with correct parameters', async () => {
      heroku.getApp = jest.fn(() => ({ id: SAMPLE_APP_ID }));
      heroku.coupleAppToPipeline = jest.fn();

      const step = new PipelineCouplingStep({ appName: SAMPLE_APP_NAME, pipelineName: SAMPLE_PIPELINE_NAME });
      step.pipelineId = SAMPLE_PIPELINE_ID;
      await step.run();
      expect(heroku.coupleAppToPipeline).toHaveBeenCalledTimes(1);
      expect(heroku.coupleAppToPipeline).toHaveBeenCalledWith(SAMPLE_APP_ID, SAMPLE_PIPELINE_ID);
    });
  });
});
