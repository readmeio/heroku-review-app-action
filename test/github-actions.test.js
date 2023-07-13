const nock = require('nock');

const githubActions = require('../src/github-actions');

const SAMPLE_APP_NAME = 'owlears-heroku-app';
const SAMPLE_OWNER = 'owlbert';
const SAMPLE_REPO = 'owl-ears';
const SAMPLE_BRANCH = 'feat/ui/big-droopy-elephant-ears';
const SAMPLE_NODE_ENV = 'pull_request_env';
const SAMPLE_WORKFLOW_ID = 12345;
const SAMPLE_WORKFLOW_RUN_ID = 23456;
const SAMPLE_WORKFLOW_RUN_NUMBER = 72;
const SAMPLE_SHA = '0000111122223333444455556666777788889999';
const SAMPLE_PARAMS = {
  owner: SAMPLE_OWNER,
  repo: SAMPLE_REPO,
  branch: SAMPLE_BRANCH,
  sha: SAMPLE_SHA,
  appName: SAMPLE_APP_NAME,
  nodeEnv: SAMPLE_NODE_ENV,
};

describe('#src/github-actions', () => {
  beforeAll(() => {
    nock.disableNetConnect();
  });

  afterEach(nock.cleanAll);

  describe('GitHub Actions API functions', () => {
    const querystring = `branch=${encodeURIComponent(SAMPLE_BRANCH)}&head_sha=${encodeURIComponent(SAMPLE_SHA)}`;
    const path = `/repos/${SAMPLE_OWNER}/${SAMPLE_REPO}/actions/workflows/${SAMPLE_WORKFLOW_ID}/runs?${querystring}`;
    const sampleWorkflowRun = {
      id: SAMPLE_WORKFLOW_RUN_ID,
      run_number: SAMPLE_WORKFLOW_RUN_NUMBER,
      status: 'queued',
      created_at: '2029-12-31T00:00:00Z',
    };

    describe('startDeploy()', () => {
      beforeEach(() => {
        nock('https://api.github.com')
          .get(`/repos/${SAMPLE_OWNER}/${SAMPLE_REPO}/actions/workflows`)
          .reply(200, {
            total_count: 2,
            workflows: [
              { id: 666, name: 'CI' },
              { id: SAMPLE_WORKFLOW_ID, name: 'Deploy' },
            ],
          });
        nock('https://api.github.com')
          .post(`/repos/${SAMPLE_OWNER}/${SAMPLE_REPO}/actions/workflows/${SAMPLE_WORKFLOW_ID}/dispatches`, {
            ref: SAMPLE_BRANCH,
            inputs: {
              heroku_apps_to_push: SAMPLE_APP_NAME,
              heroku_apps_to_release: SAMPLE_APP_NAME,
              node_env: SAMPLE_NODE_ENV,
            },
          })
          .reply(204);
      });

      it('should kick off a build with appropriate parameters', async () => {
        nock('https://api.github.com')
          .get(path)
          .reply(200, { total_count: 1, workflow_runs: [sampleWorkflowRun] });
        await expect(githubActions.startDeploy(SAMPLE_PARAMS)).resolves.toStrictEqual(sampleWorkflowRun);
      });

      it('should poll multiple times until the workflow run has started', async () => {
        nock('https://api.github.com').get(path).reply(200, { total_count: 0, workflow_runs: [] });
        nock('https://api.github.com').get(path).reply(200, { total_count: 0, workflow_runs: [] });
        nock('https://api.github.com')
          .get(path)
          .reply(200, { total_count: 1, workflow_runs: [sampleWorkflowRun] });
        await expect(githubActions.startDeploy(SAMPLE_PARAMS)).resolves.toStrictEqual(sampleWorkflowRun);
      });

      it('should ignore workflow runs that were started before the call to startDeploy()', async () => {
        nock('https://api.github.com')
          .get(path)
          .reply(200, {
            total_count: 1,
            workflow_runs: [{ ...sampleWorkflowRun, created_at: '2023-01-01T00:00:00Z' }],
          });
        nock('https://api.github.com')
          .get(path)
          .reply(200, {
            total_count: 2,
            workflow_runs: [{ ...sampleWorkflowRun, created_at: '2023-01-01T00:00:00Z' }, sampleWorkflowRun],
          });
        await expect(githubActions.startDeploy(SAMPLE_PARAMS)).resolves.toStrictEqual(sampleWorkflowRun);
      });

      it('should throw an error if it times out before the workflow run has started', async () => {
        for (let i = 0; i < 50; i += 1) {
          nock('https://api.github.com').get(path).reply(200, { total_count: 0, workflow_runs: [] });
        }
        await expect(githubActions.startDeploy(SAMPLE_PARAMS)).rejects.toThrow(/Timed out/);
      });

      it('should throw an error if the GitHub API returns an error', async () => {
        nock('https://api.github.com').get(path).reply(500);
        await expect(githubActions.startDeploy(SAMPLE_PARAMS)).rejects.toThrow(/.*/);
      });
    });

    describe('waitForCompletion()', () => {
      const path = `/repos/${SAMPLE_OWNER}/${SAMPLE_REPO}/actions/runs/${SAMPLE_WORKFLOW_RUN_ID}`;
      const SAMPLE_RESULT = {
        id: SAMPLE_WORKFLOW_RUN_ID,
        run_number: SAMPLE_WORKFLOW_RUN_NUMBER,
        status: 'completed',
        conclusion: 'success',
      };

      it('should poll GitHub until the workflow run finishes', async () => {
        nock('https://api.github.com')
          .get(path)
          .reply(200, { ...SAMPLE_RESULT, status: 'in_progress', conclusion: undefined });
        nock('https://api.github.com')
          .get(path)
          .reply(200, { ...SAMPLE_RESULT, status: 'in_progress', conclusion: undefined });
        nock('https://api.github.com').get(path).reply(200, SAMPLE_RESULT);
        await expect(githubActions.waitForCompletion(SAMPLE_PARAMS, SAMPLE_WORKFLOW_RUN_ID)).resolves.toStrictEqual(
          SAMPLE_RESULT
        );
      });

      it('should throw an error if we exceed the timeout waiting for the run to finish', async () => {
        for (let i = 0; i < 50; i += 1) {
          nock('https://api.github.com')
            .get(path)
            .reply(200, { ...SAMPLE_RESULT, status: 'in_progress', conclusion: undefined });
        }
        await expect(githubActions.waitForCompletion(SAMPLE_PARAMS, SAMPLE_WORKFLOW_RUN_ID)).rejects.toThrow(
          /Timed out/
        );
      });

      it('should throw an error if the GitHub API returns an error', async () => {
        nock('https://api.github.com').get(path).reply(500);
        await expect(githubActions.waitForCompletion(SAMPLE_PARAMS, SAMPLE_WORKFLOW_RUN_ID)).rejects.toThrow(/.*/);
      });
    });
  });
});
