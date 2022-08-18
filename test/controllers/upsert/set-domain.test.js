const nock = require('nock');

const SetDomainStep = require('../../../src/controllers/upsert/set-domain');

const SAMPLE_APP_ID = '11111111-2222-3333-4444-555555555555';
const SAMPLE_APP_NAME = 'owlzilla';
const SAMPLE_RESPONSE = { response_field: 'response_value' };

describe('#src/controllers/upsert/set-domain', () => {
  describe('checkPrereqs()', () => {
    it('should only run on the "readme" pipeline', async () => {
      const readmeStep = new SetDomainStep({ pipelineName: 'readme' });
      await readmeStep.checkPrereqs();
      expect(readmeStep.shouldRun).toBe(true);

      const otherStep = new SetDomainStep({ pipelineName: 'not-readme' });
      await otherStep.checkPrereqs();
      expect(otherStep.shouldRun).toBe(false);
    });
  });

  describe('run()', () => {
    it('should run the appropriate command in a new Heroku dyno', async () => {
      nock('https://api.heroku.com').get(`/apps/${SAMPLE_APP_NAME}`).reply(200, { id: SAMPLE_APP_ID });
      nock('https://api.heroku.com')
        .post(`/apps/${SAMPLE_APP_ID}/dynos`, { command: 'node bin/setdomain.js', attach: false })
        .reply(200, SAMPLE_RESPONSE);

      const step = new SetDomainStep({ appName: SAMPLE_APP_NAME, pipelineName: 'readme' });
      await expect(step.run()).resolves.toStrictEqual(SAMPLE_RESPONSE);
    });
  });
});
