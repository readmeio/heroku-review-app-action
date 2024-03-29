const nock = require('nock');

const heroku = require('../src/heroku');

const SAMPLE_APP_ID = '33333333-4444-5555-6666-777777777777';
const SAMPLE_APP_NAME = 'dr-owlbert-pr-1234';
const SAMPLE_COMMAND = 'npm run lint';
const SAMPLE_CONFIG_VARS = { MAILCHIMP_API_KEY: '123', NODE_ENV: 'pr' };
const SAMPLE_DRAIN_URL = 'https://logs.example.com/my-log-drain';
const SAMPLE_FEATURE = 'spine-reticulation';
const SAMPLE_PIPELINE_ID = '12121212-3434-5656-7878-909090909090';
const SAMPLE_PIPELINE_NAME = 'aqueduct';
const SAMPLE_RESPONSE = { response_field: 'response_value' };
const SAMPLE_REGION = 'eu';
const SAMPLE_TEAM = 'owlbert';
const SAMPLE_CREATE_PARAMS = {
  appName: SAMPLE_APP_NAME,
  herokuRegion: SAMPLE_REGION,
  herokuTeam: SAMPLE_TEAM,
};
const SAMPLE_POST_FIELDS = {
  name: SAMPLE_APP_NAME,
  region: SAMPLE_REGION,
  team: SAMPLE_TEAM,
};

describe('#src/heroku', () => {
  beforeAll(() => {
    nock.disableNetConnect();
  });

  afterAll(() => {
    nock.enableNetConnect();
  });

  beforeEach(heroku.clearCache);

  afterEach(nock.cleanAll);

  describe('Heroku API read functions', () => {
    describe('getApp()', () => {
      it('should return the configuration of the given app', async () => {
        nock('https://api.heroku.com').get(`/apps/${SAMPLE_APP_NAME}`).reply(200, SAMPLE_RESPONSE);
        await expect(heroku.getApp(SAMPLE_APP_NAME)).resolves.toStrictEqual(SAMPLE_RESPONSE);
      });

      it('should throw an error if the given app does not exist', async () => {
        nock('https://api.heroku.com').get(`/apps/${SAMPLE_APP_NAME}`).reply(404);
        await expect(heroku.getApp(SAMPLE_APP_NAME)).rejects.toThrow(/404/);
      });
    });

    describe('getAppSize()', () => {
      it('should return the size of the given app', async () => {
        nock('https://api.heroku.com')
          .get(`/apps/${SAMPLE_APP_NAME}/formation/web`)
          .reply(200, { size: 'performance-l' });
        await expect(heroku.getAppSize(SAMPLE_APP_NAME)).resolves.toStrictEqual('performance-l');
      });

      it('should throw an error if the given app or formation does not exist', async () => {
        nock('https://api.heroku.com').get(`/apps/${SAMPLE_APP_NAME}/formation/web`).reply(404);
        await expect(heroku.getAppSize(SAMPLE_APP_NAME)).rejects.toThrow(/404/);
      });
    });

    describe('getAppFeature()', () => {
      it('should return the configuration of the given app', async () => {
        nock('https://api.heroku.com')
          .get(`/apps/${SAMPLE_APP_NAME}/features/${SAMPLE_FEATURE}`)
          .reply(200, SAMPLE_RESPONSE);
        await expect(heroku.getAppFeature(SAMPLE_APP_NAME, SAMPLE_FEATURE)).resolves.toStrictEqual(SAMPLE_RESPONSE);
      });

      it('should throw an error if the given app or feature does not exist', async () => {
        nock('https://api.heroku.com').get(`/apps/${SAMPLE_APP_NAME}/features/${SAMPLE_FEATURE}`).reply(404);
        await expect(heroku.getAppFeature(SAMPLE_APP_NAME, SAMPLE_FEATURE)).rejects.toThrow(/404/);
      });
    });

    describe('getPipelineId()', () => {
      it('should return the UUID of the given pipeline', async () => {
        nock('https://api.heroku.com').get(`/pipelines/${SAMPLE_PIPELINE_NAME}`).reply(200, { id: SAMPLE_PIPELINE_ID });
        await expect(heroku.getPipelineId(SAMPLE_PIPELINE_NAME)).resolves.toBe(SAMPLE_PIPELINE_ID);
      });

      it('should return undefined if the pipeline does not exist', async () => {
        nock('https://api.heroku.com').get(`/pipelines/${SAMPLE_PIPELINE_NAME}`).reply(404);
        await expect(heroku.getPipelineId(SAMPLE_PIPELINE_NAME)).resolves.toBeUndefined();
      });
    });

    describe('getPipelineApps()', () => {
      it('should return a list of UUIDs for apps in the given pipeline', async () => {
        nock('https://api.heroku.com')
          .get(`/pipelines/${SAMPLE_PIPELINE_NAME}/pipeline-couplings`)
          .reply(200, [{ app: { id: SAMPLE_PIPELINE_ID } }]);
        await expect(heroku.getPipelineApps(SAMPLE_PIPELINE_NAME)).resolves.toStrictEqual([SAMPLE_PIPELINE_ID]);
      });

      it('should throw an error if the given pipeline does not exist', async () => {
        nock('https://api.heroku.com').get(`/pipelines/${SAMPLE_PIPELINE_NAME}/pipeline-couplings`).reply(404);
        await expect(heroku.getPipelineApps(SAMPLE_PIPELINE_NAME)).rejects.toThrow(/404/);
      });
    });

    describe('getPipelineVars()', () => {
      it('should return the config vars for the given pipeline', async () => {
        nock('https://api.heroku.com')
          .get(`/pipelines/${SAMPLE_PIPELINE_NAME}/stage/review/config-vars`)
          .reply(200, SAMPLE_CONFIG_VARS);
        await expect(heroku.getPipelineVars(SAMPLE_PIPELINE_NAME)).resolves.toStrictEqual(SAMPLE_CONFIG_VARS);
      });

      it('should throw an error if the pipeline does not exist', async () => {
        nock('https://api.heroku.com').get(`/pipelines/${SAMPLE_PIPELINE_NAME}/stage/review/config-vars`).reply(404);
        await expect(heroku.getPipelineVars(SAMPLE_PIPELINE_NAME)).rejects.toThrow(/404/);
      });
    });

    describe('getReviewAppConfig()', () => {
      it('should return the review app configuration for the given pipeline', async () => {
        nock('https://api.heroku.com')
          .get(`/pipelines/${SAMPLE_PIPELINE_NAME}/review-app-config`)
          .reply(200, SAMPLE_RESPONSE);
        await expect(heroku.getReviewAppConfig(SAMPLE_PIPELINE_NAME)).resolves.toStrictEqual(SAMPLE_RESPONSE);
      });

      it('should reurn undefined if review apps are not configured for the pipeline', async () => {
        nock('https://api.heroku.com').get('/pipelines/foo/review-app-config').reply(404);
        await expect(heroku.getReviewAppConfig('foo')).resolves.toBeUndefined();
      });
    });

    describe('appExists()', () => {
      it('should return true if the given app exists on Heroku', async () => {
        nock('https://api.heroku.com').get(`/apps/${SAMPLE_APP_NAME}`).reply(200, SAMPLE_RESPONSE);
        await expect(heroku.appExists(SAMPLE_APP_NAME)).resolves.toBe(true);
      });

      it('should return false if the given app does not exists on Heroku', async () => {
        nock('https://api.heroku.com').get(`/apps/${SAMPLE_APP_NAME}`).reply(404);
        await expect(heroku.appExists(SAMPLE_APP_NAME)).resolves.toBe(false);
      });

      it('should cache positive results, only calling the Heroku API once', async () => {
        nock('https://api.heroku.com').get(`/apps/${SAMPLE_APP_NAME}`).reply(200, SAMPLE_RESPONSE);
        await expect(heroku.appExists(SAMPLE_APP_NAME)).resolves.toBe(true);
        await expect(heroku.appExists(SAMPLE_APP_NAME)).resolves.toBe(true);
      });

      it('should cache negative results, only calling the Heroku API once', async () => {
        nock('https://api.heroku.com').get(`/apps/${SAMPLE_APP_NAME}`).reply(404, SAMPLE_RESPONSE);
        await expect(heroku.appExists(SAMPLE_APP_NAME)).resolves.toBe(false);
        await expect(heroku.appExists(SAMPLE_APP_NAME)).resolves.toBe(false);
      });

      it('should return true after creating a new app', async () => {
        nock('https://api.heroku.com').get(`/apps/${SAMPLE_APP_NAME}`).reply(404);
        await expect(heroku.appExists(SAMPLE_APP_NAME)).resolves.toBe(false);

        nock('https://api.heroku.com').post('/teams/apps', SAMPLE_POST_FIELDS).reply(200, SAMPLE_RESPONSE);
        await expect(heroku.createApp(SAMPLE_CREATE_PARAMS)).resolves.toStrictEqual(SAMPLE_RESPONSE);

        nock('https://api.heroku.com').get(`/apps/${SAMPLE_APP_NAME}`).reply(200, SAMPLE_RESPONSE);
        await expect(heroku.appExists(SAMPLE_APP_NAME)).resolves.toBe(true);
      });
    });

    describe('getDrains()', () => {
      it('should return the log drain(s) attached to the given app', async () => {
        nock('https://api.heroku.com')
          .get(`/apps/${SAMPLE_APP_ID}/log-drains`)
          .reply(200, [{ url: SAMPLE_DRAIN_URL }]);
        await expect(heroku.getDrains(SAMPLE_APP_ID)).resolves.toStrictEqual([SAMPLE_DRAIN_URL]);
      });

      it('should throw an error if the pipeline does not exist', async () => {
        nock('https://api.heroku.com').get(`/apps/${SAMPLE_APP_ID}/log-drains`).reply(404);
        await expect(heroku.getDrains(SAMPLE_APP_ID)).rejects.toThrow(/404/);
      });
    });
  });

  describe('Heroku API write functions', () => {
    describe('createApp()', () => {
      it('should POST to the correct endpoint to create an app', async () => {
        nock('https://api.heroku.com').post('/teams/apps', SAMPLE_POST_FIELDS).reply(200, SAMPLE_RESPONSE);
        await expect(heroku.createApp(SAMPLE_CREATE_PARAMS)).resolves.toStrictEqual(SAMPLE_RESPONSE);
      });
    });

    describe('setAppSize()', () => {
      it('should change the size of the given app', async () => {
        nock('https://api.heroku.com')
          .patch(`/apps/${SAMPLE_APP_NAME}/formation/web`, { quantity: 1, size: 'standard-2x' })
          .reply(200, SAMPLE_RESPONSE);
        await expect(heroku.setAppSize({ appName: SAMPLE_APP_NAME, herokuSize: 'standard-2x' })).resolves.toStrictEqual(
          SAMPLE_RESPONSE
        );
      });

      it('should throw an error if the given app or formation does not exist', async () => {
        nock('https://api.heroku.com').patch(`/apps/${SAMPLE_APP_NAME}/formation/web`).reply(404);
        await expect(heroku.setAppSize({ appName: SAMPLE_APP_NAME, size: 'standard-2x' })).rejects.toThrow(/404/);
      });
    });

    describe('deleteApp()', () => {
      it('should DELETE to the correct endpoint to delete an app', async () => {
        nock('https://api.heroku.com').delete(`/apps/${SAMPLE_APP_NAME}`).reply(200, SAMPLE_RESPONSE);
        await expect(heroku.deleteApp(SAMPLE_APP_NAME)).resolves.toStrictEqual(SAMPLE_RESPONSE);
      });
    });

    describe('coupleAppToPipeline()', () => {
      it('should POST to the correct endpoint to create a pipeline coupling', async () => {
        nock('https://api.heroku.com')
          .post('/pipeline-couplings', { app: SAMPLE_APP_ID, pipeline: SAMPLE_PIPELINE_ID, stage: /.*/ })
          .reply(200, SAMPLE_RESPONSE);
        await expect(heroku.coupleAppToPipeline(SAMPLE_APP_ID, SAMPLE_PIPELINE_ID)).resolves.toStrictEqual(
          SAMPLE_RESPONSE
        );
      });
    });

    describe('setAppFeature()', () => {
      it('should PATCH to the correct endpoint to enable a Heroku Labs feature', async () => {
        nock('https://api.heroku.com')
          .patch(`/apps/${SAMPLE_APP_ID}/features/${SAMPLE_FEATURE}`, { enabled: true })
          .reply(200, SAMPLE_RESPONSE);
        await expect(heroku.setAppFeature(SAMPLE_APP_ID, SAMPLE_FEATURE, true)).resolves.toStrictEqual(SAMPLE_RESPONSE);
      });
    });

    describe('setAppVars()', () => {
      it('should PATCH to the correct endpoint to update config vars', async () => {
        nock('https://api.heroku.com')
          .patch(`/apps/${SAMPLE_APP_ID}/config-vars`, SAMPLE_CONFIG_VARS)
          .reply(200, SAMPLE_RESPONSE);
        await expect(heroku.setAppVars(SAMPLE_APP_ID, SAMPLE_CONFIG_VARS)).resolves.toStrictEqual(SAMPLE_RESPONSE);
      });
    });

    describe('addDrain()', () => {
      it('should POST to the correct endpoint to set up a log drain', async () => {
        nock('https://api.heroku.com')
          .post(`/apps/${SAMPLE_APP_ID}/log-drains`, { url: SAMPLE_DRAIN_URL })
          .reply(200, SAMPLE_RESPONSE);
        await expect(heroku.addDrain(SAMPLE_APP_ID, SAMPLE_DRAIN_URL)).resolves.toStrictEqual(SAMPLE_RESPONSE);
      });
    });

    describe('runAppCommand()', () => {
      it('should POST to the correct endpoint to run a one-off dyno in the background', async () => {
        nock('https://api.heroku.com')
          .post(`/apps/${SAMPLE_APP_ID}/dynos`, { command: SAMPLE_COMMAND, attach: false })
          .reply(200, SAMPLE_RESPONSE);
        await expect(heroku.runAppCommand(SAMPLE_APP_ID, SAMPLE_COMMAND)).resolves.toStrictEqual(SAMPLE_RESPONSE);
      });
    });
  });
});
