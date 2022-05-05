const fs = require('fs');
const netrc = require('../src/netrc');

const HEROKU_USER = 'jest-heroku-user@readme.io';
const HEROKU_TOKEN = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const SAMPLE_CREDENTIALS = { email: HEROKU_USER, apiKey: HEROKU_TOKEN };

describe('#src/netrc', () => {
  const path = netrc.getNetrcPath();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createNetrc()', () => {
    it('should write the correct contents to a .netrc file', () => {
      const spy1 = jest.spyOn(fs, 'existsSync').mockReturnValue(false);
      const spy2 = jest.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);
      expect(netrc.createNetrc(SAMPLE_CREDENTIALS)).toBeUndefined();
      expect(spy1).toHaveBeenCalledWith(path);
      expect(spy2).toHaveBeenCalled();
      expect(spy2.mock.lastCall[0]).toBe(path);
      expect(spy2.mock.lastCall[1]).toMatch(HEROKU_USER);
      expect(spy2.mock.lastCall[1]).toMatch(HEROKU_TOKEN);
    });

    it('should throw an error if a .netrc file already exists', () => {
      const spy1 = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      const spy2 = jest.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);
      expect(() => {
        netrc.createNetrc(SAMPLE_CREDENTIALS);
      }).toThrow(/already exists/);
      expect(spy1).toHaveBeenCalledWith(path);
      expect(spy2).not.toHaveBeenCalled();
    });
  });

  describe('deleteNetrc()', () => {
    it('should delete the .netrc file', () => {
      const spy1 = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      const spy2 = jest.spyOn(fs, 'unlinkSync').mockReturnValue(undefined);
      expect(netrc.deleteNetrc()).toBeUndefined();
      expect(spy1).toHaveBeenCalledWith(path);
      expect(spy2).toHaveBeenCalledWith(path);
    });

    it('should not do anything if no .netrc file exists', () => {
      const spy1 = jest.spyOn(fs, 'existsSync').mockReturnValue(false);
      const spy2 = jest.spyOn(fs, 'unlinkSync').mockReturnValue(undefined);
      expect(netrc.deleteNetrc()).toBeUndefined();
      expect(spy1).toHaveBeenCalledWith(path);
      expect(spy2).not.toHaveBeenCalled();
    });
  });
});
