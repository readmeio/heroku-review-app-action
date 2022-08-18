const circleci = require('../../../src/circleci');
const DockerDeployStep = require('../../../src/controllers/upsert/docker-deploy');

const setupBeforeAndAfter = require('./setup');

const SAMPLE_APP_NAME = 'owlzilla';
const SAMPLE_PIPELINE_NUMBER = 61201;
const SAMPLE_PIPELINE_ID = '44444444-5555-6666-7777-888888888888';
const SAMPLE_PARAMS = { owner: 'owlbert', repo: 'owlzilla' };

describe('#src/controllers/upsert/docker-deploy', () => {
  setupBeforeAndAfter();

  describe('checkPrereqs()', () => {
    it('should run when explicitly configured for Docker deploys', async () => {
      circleci.initializeCredentials = jest.fn();

      const step = new DockerDeployStep({ appName: SAMPLE_APP_NAME, useDocker: true });
      await step.checkPrereqs();
      expect(step.shouldRun).toBe(true);
    });

    it('should not run when not configured for Docker deploys', async () => {
      const step = new DockerDeployStep({ appName: SAMPLE_APP_NAME, useDocker: false });
      await step.checkPrereqs();
      expect(step.shouldRun).toBe(false);
    });

    it('should initialize CircleCI credentials when configured for Docker deploys', async () => {
      circleci.initializeCredentials = jest.fn();

      const step = new DockerDeployStep({ appName: SAMPLE_APP_NAME, useDocker: true });
      await step.checkPrereqs();
      expect(circleci.initializeCredentials).toHaveBeenCalledTimes(1);
    });
  });

  describe('run()', () => {
    it('should call startDockerBuild() and waitForPipelineFinish() with correct parameters', async () => {
      circleci.startDockerBuild = jest.fn(() => ({ number: SAMPLE_PIPELINE_NUMBER, id: SAMPLE_PIPELINE_ID }));
      circleci.waitForPipelineFinish = jest.fn(() => ({ status: 'success' }));

      const step = new DockerDeployStep(SAMPLE_PARAMS);
      await step.run();
      expect(circleci.startDockerBuild).toHaveBeenCalledTimes(1);
      expect(circleci.startDockerBuild).toHaveBeenCalledWith(SAMPLE_PARAMS);
      expect(circleci.waitForPipelineFinish).toHaveBeenCalledTimes(1);
      expect(circleci.waitForPipelineFinish).toHaveBeenCalledWith(SAMPLE_PIPELINE_ID);
    });

    it('should throw an error if the pipeline finishes unsuccessfully', async () => {
      circleci.startDockerBuild = jest.fn(() => ({ number: SAMPLE_PIPELINE_NUMBER, id: SAMPLE_PIPELINE_ID }));
      circleci.waitForPipelineFinish = jest.fn(() => ({ status: 'failed' }));

      const step = new DockerDeployStep(SAMPLE_PARAMS);
      await expect(step.run()).rejects.toThrow(/finished with status "failed"/);
      expect(circleci.startDockerBuild).toHaveBeenCalledTimes(1);
      expect(circleci.startDockerBuild).toHaveBeenCalledWith(SAMPLE_PARAMS);
      expect(circleci.waitForPipelineFinish).toHaveBeenCalledTimes(1);
      expect(circleci.waitForPipelineFinish).toHaveBeenCalledWith(SAMPLE_PIPELINE_ID);
    });

    it.skip('should throw an error if the pipeline times out (throws an error)', async () => {
      circleci.startDockerBuild = jest.fn(() => ({ number: SAMPLE_PIPELINE_NUMBER, id: SAMPLE_PIPELINE_ID }));
      circleci.waitForPipelineFinish = jest.fn(() => {
        // simulate what happens when the pipeline times out
        throw new Error('Timed out waiting for CircleCI pipeline to finish.');
      });

      const step = new DockerDeployStep(SAMPLE_PARAMS);
      await expect(step.run()).rejects.toThrow(/Timed out/);
      expect(circleci.startDockerBuild).toHaveBeenCalledTimes(1);
      expect(circleci.startDockerBuild).toHaveBeenCalledWith(SAMPLE_PARAMS);
      expect(circleci.waitForPipelineFinish).toHaveBeenCalledTimes(1);
      expect(circleci.waitForPipelineFinish).toHaveBeenCalledWith(SAMPLE_PIPELINE_ID);
    });
  });
});
