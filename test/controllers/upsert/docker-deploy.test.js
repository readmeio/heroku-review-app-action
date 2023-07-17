const DockerDeployStep = require('../../../src/controllers/upsert/docker-deploy');
const githubActions = require('../../../src/github-actions');

const setupBeforeAndAfter = require('./setup');

const SAMPLE_WORKFLOW_RUN_NUMBER = 61201;
const SAMPLE_WORKFLOW_RUN_ID = '44444444-5555-6666-7777-888888888888';
const SAMPLE_PARAMS = { owner: 'owlbert', repo: 'owlzilla' };

describe('#src/controllers/upsert/docker-deploy', () => {
  setupBeforeAndAfter();

  describe('run()', () => {
    it('should call startDeploy() and waitForCompletion() with correct parameters', async () => {
      githubActions.startDeploy = jest.fn(() => ({
        id: SAMPLE_WORKFLOW_RUN_ID,
        run_number: SAMPLE_WORKFLOW_RUN_NUMBER,
      }));
      githubActions.waitForCompletion = jest.fn(() => ({ status: 'completed', conclusion: 'success' }));

      const step = new DockerDeployStep(SAMPLE_PARAMS);
      await step.run();
      expect(githubActions.startDeploy).toHaveBeenCalledTimes(1);
      expect(githubActions.startDeploy).toHaveBeenCalledWith(SAMPLE_PARAMS);
      expect(githubActions.waitForCompletion).toHaveBeenCalledTimes(1);
      expect(githubActions.waitForCompletion).toHaveBeenCalledWith(SAMPLE_PARAMS, SAMPLE_WORKFLOW_RUN_ID);
    });

    it('should throw an error if the workflow run finishes unsuccessfully', async () => {
      githubActions.startDeploy = jest.fn(() => ({
        id: SAMPLE_WORKFLOW_RUN_ID,
        run_number: SAMPLE_WORKFLOW_RUN_NUMBER,
      }));
      githubActions.waitForCompletion = jest.fn(() => ({ status: 'completed', conclusion: 'failure' }));

      const step = new DockerDeployStep(SAMPLE_PARAMS);
      await expect(step.run()).rejects.toThrow(/finished with status "completed" and conclusion "failure"/);
      expect(githubActions.startDeploy).toHaveBeenCalledTimes(1);
      expect(githubActions.startDeploy).toHaveBeenCalledWith(SAMPLE_PARAMS);
      expect(githubActions.waitForCompletion).toHaveBeenCalledTimes(1);
      expect(githubActions.waitForCompletion).toHaveBeenCalledWith(SAMPLE_PARAMS, SAMPLE_WORKFLOW_RUN_ID);
    });

    it('should throw an error if the workflow run times out (throws an error)', async () => {
      githubActions.startDeploy = jest.fn(() => ({
        id: SAMPLE_WORKFLOW_RUN_ID,
        run_number: SAMPLE_WORKFLOW_RUN_NUMBER,
      }));
      githubActions.waitForCompletion = jest.fn(() => {
        // simulate what happens when the workflow run times out
        throw new Error('Timed out waiting for GitHub workflow run to finish.');
      });

      const step = new DockerDeployStep(SAMPLE_PARAMS);
      await expect(step.run()).rejects.toThrow(/Timed out/);
      expect(githubActions.startDeploy).toHaveBeenCalledTimes(1);
      expect(githubActions.startDeploy).toHaveBeenCalledWith(SAMPLE_PARAMS);
      expect(githubActions.waitForCompletion).toHaveBeenCalledTimes(1);
      expect(githubActions.waitForCompletion).toHaveBeenCalledWith(SAMPLE_PARAMS, SAMPLE_WORKFLOW_RUN_ID);
    });
  });
});
