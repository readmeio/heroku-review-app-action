const core = require('@actions/core');
const nock = require('nock');

module.exports = () => {
  beforeAll(() => {
    nock.disableNetConnect();
  });

  afterAll(() => {
    nock.enableNetConnect();
  });

  beforeEach(() => {
    core.info = jest.fn();
  });

  afterEach(jest.restoreAllMocks);
};
