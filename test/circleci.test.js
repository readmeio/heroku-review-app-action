const nock = require('nock');

const circleci = require('../src/circleci');

const SAMPLE_APP_NAME = 'owlears-heroku-app';
const SAMPLE_OWNER = 'owlbert';
const SAMPLE_REPO = 'owl-ears';
const SAMPLE_BRANCH = 'feat/ui/big-droopy-elephant-ears';
const SAMPLE_NODE_ENV = 'pull_request_env';
const SAMPLE_PIPELINE_ID = '11111111-1111-1111-1111-111111111111';
const SAMPLE_PARAMS = {
  owner: SAMPLE_OWNER,
  repo: SAMPLE_REPO,
  branch: SAMPLE_BRANCH,
  appName: SAMPLE_APP_NAME,
  nodeEnv: SAMPLE_NODE_ENV,
};

describe('#src/circleci', () => {
  beforeAll(() => {
    nock.disableNetConnect();
  });

  afterAll(() => {
    nock.enableNetConnect();
  });

  afterEach(nock.cleanAll);

  describe('CircleCI API functions', () => {
    describe('startDockerBuild()', () => {
      it('should kick off a build with appropriate parameters', async () => {
        const response = {
          id: SAMPLE_PIPELINE_ID,
          state: 'created',
          number: '678',
          created_at: '2022-08-17T22:22:22Z',
        };
        const parameters = {
          RUN_TEST: false,
          RUN_DOCKER: true,
          HEROKU_APPS_TO_PUSH: SAMPLE_APP_NAME,
          HEROKU_APPS_TO_RELEASE: SAMPLE_APP_NAME,
          NODE_ENV: SAMPLE_NODE_ENV,
        };

        nock('https://circleci.com/api/v2')
          .post(`/project/gh/${SAMPLE_OWNER}/${SAMPLE_REPO}/pipeline`, { branch: SAMPLE_BRANCH, parameters })
          .reply(200, response);
        await expect(circleci.startDockerBuild(SAMPLE_PARAMS)).resolves.toStrictEqual(response);
      });

      it('should throw an error if the CircleCI API returns an error', async () => {
        nock('https://circleci.com/api/v2').post(`/project/gh/${SAMPLE_OWNER}/${SAMPLE_REPO}/pipeline`).reply(401);
        await expect(circleci.startDockerBuild(SAMPLE_PARAMS)).rejects.toThrow(/401/);
      });
    });

    describe('waitForPipelineFinish()', () => {
      const SAMPLE_ITEM = {
        id: '11111111-2222-3333-4444-555555555555',
        number: 101,
        created_at: '2022-08-17T22:22:22Z',
      };

      const RUNNING_ITEM = { ...SAMPLE_ITEM, status: 'running' };
      const FINISHED_ITEM = { ...SAMPLE_ITEM, status: 'success' };

      it("should poll CircleCI until the pipeline's workflow finishes", async () => {
        nock('https://circleci.com/api/v2').get(`/pipeline/${SAMPLE_PIPELINE_ID}/workflow`).reply(200, { items: [] });
        nock('https://circleci.com/api/v2')
          .get(`/pipeline/${SAMPLE_PIPELINE_ID}/workflow`)
          .reply(200, { items: [RUNNING_ITEM] });
        nock('https://circleci.com/api/v2')
          .get(`/pipeline/${SAMPLE_PIPELINE_ID}/workflow`)
          .reply(200, { items: [FINISHED_ITEM] });

        await expect(circleci.waitForPipelineFinish(SAMPLE_PIPELINE_ID)).resolves.toStrictEqual(FINISHED_ITEM);
      });

      it('should use the most recent workflow if the pipeline has 2 or more workflows', async () => {
        const earlierItem = { ...FINISHED_ITEM, created_at: '2022-08-17T21:12:00Z' };
        const laterItem = { ...FINISHED_ITEM, created_at: '2022-08-17T21:13:00Z' };

        nock('https://circleci.com/api/v2')
          .get(`/pipeline/${SAMPLE_PIPELINE_ID}/workflow`)
          .reply(200, { items: [earlierItem, laterItem] });
        await expect(circleci.waitForPipelineFinish(SAMPLE_PIPELINE_ID)).resolves.toStrictEqual(laterItem);
      });

      it('should throw an error if we exceed the timeout waiting for an item to be enqueued', async () => {
        for (let i = 0; i < 100; i += 1) {
          nock('https://circleci.com/api/v2')
            .get(`/pipeline/${SAMPLE_PIPELINE_ID}/workflow`)
            .reply(200, { items: [RUNNING_ITEM] });
        }
        await expect(circleci.waitForPipelineFinish(SAMPLE_PIPELINE_ID)).rejects.toThrow(/Timed out/);
      });

      it('should throw an error if the CircleCI API returns an error', async () => {
        nock('https://circleci.com/api/v2').get(`/pipeline/${SAMPLE_PIPELINE_ID}/workflow`).reply(401);
        await expect(circleci.waitForPipelineFinish(SAMPLE_PIPELINE_ID)).rejects.toThrow(/401/);
      });
    });
  });
});
