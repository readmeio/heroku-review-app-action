const childProcess = require('child_process');
const fs = require('fs');

const git = require('../src/git');

const SAMPLE_APP_NAME = 'dr-owlbert-pr-1234';
const SAMPLE_REF = 'refs/heads/dev';
const SAMPLE_EMAIL = 'jest-test-user@example.com';
const SAMPLE_SHA = '1234567890123456789012345678901234567890';
const SAMPLE_API_KEY = '12345678-1234-1234-1234-1234567890ab';
const SAMPLE_SINGLE_LINE_MESSAGE = 'chore: replace Dewey Duck with Owlbert';
const SAMPLE_MULTILINE_MESSAGE =
  "chore: replace Dewey Duck with Owlbert\nHuey, Dewey, or Louie? Let's go with an owl instead.";

describe('#src/git', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('repoExists()', () => {
    it('should return true if the working directory contains a git repo', () => {
      const spy = jest.spyOn(fs, 'statSync').mockReturnValue({});
      expect(git.repoExists()).toBe(true);
      expect(spy).toHaveBeenCalledWith('.git');
    });

    it('should return false if the working directory does not contain a git repo', () => {
      const spy = jest.spyOn(fs, 'statSync').mockImplementation(() => {
        throw new Error("ENOENT: no such file or directory, stat '.git'");
      });
      expect(git.repoExists()).toBe(false);
      expect(spy).toHaveBeenCalledWith('.git');
    });
  });

  describe('refExists()', () => {
    const EXPECTED_ARGS = ['show-ref', '--verify', '--quiet', SAMPLE_REF];

    it('should return true if the "git show-ref" command succeeds', () => {
      const spy = jest.spyOn(childProcess, 'spawnSync').mockReturnValue({ status: 0 });
      expect(git.refExists(SAMPLE_REF)).toBe(true);
      expect(spy.mock.lastCall[0]).toBe('git');
      expect(spy.mock.lastCall[1]).toStrictEqual(EXPECTED_ARGS);
    });

    it('should return false if the "git show-ref" command fails', () => {
      const spy = jest.spyOn(childProcess, 'spawnSync').mockReturnValue({ status: 1 });
      expect(git.refExists(SAMPLE_REF)).toBe(false);
      expect(spy.mock.lastCall[0]).toBe('git');
      expect(spy.mock.lastCall[1]).toStrictEqual(EXPECTED_ARGS);
    });
  });

  describe('shaForRef()', () => {
    const EXPECTED_ARGS = ['log', '--pretty=format:%H', '--no-merges', '--quiet', `${SAMPLE_REF}~1..${SAMPLE_REF}`];

    it('should return the commit hash if the "git log" command succeeds', () => {
      const spy = jest.spyOn(childProcess, 'spawnSync').mockReturnValue({
        status: 0,
        stdout: Buffer.from(`${SAMPLE_SHA}\n`),
      });
      expect(git.shaForRef(SAMPLE_REF)).toBe(SAMPLE_SHA);
      expect(spy.mock.lastCall[0]).toBe('git');
      expect(spy.mock.lastCall[1]).toStrictEqual(EXPECTED_ARGS);
    });

    it('should return only the first line if the "git log" response contains multiple lines', () => {
      const spy = jest.spyOn(childProcess, 'spawnSync').mockReturnValue({
        status: 0,
        stdout: Buffer.from(`${SAMPLE_SHA}\n${SAMPLE_SHA}\n${SAMPLE_SHA}\n`),
      });
      expect(git.shaForRef(SAMPLE_REF)).toBe(SAMPLE_SHA);
      expect(spy.mock.lastCall[0]).toBe('git');
      expect(spy.mock.lastCall[1]).toStrictEqual(EXPECTED_ARGS);
    });

    it('should return undefined if the "git log" command fails', () => {
      const spy = jest.spyOn(childProcess, 'spawnSync').mockReturnValue({ status: 1 });
      expect(git.shaForRef(SAMPLE_REF)).toBeUndefined();
      expect(spy.mock.lastCall[0]).toBe('git');
      expect(spy.mock.lastCall[1]).toStrictEqual(EXPECTED_ARGS);
    });
  });

  describe('messageForRef()', () => {
    const EXPECTED_ARGS = ['log', '--pretty=format:%s', '--no-merges', '--quiet', `${SAMPLE_REF}~1..${SAMPLE_REF}`];

    it('should return the commit message if the "git log" command succeeds', () => {
      const spy = jest.spyOn(childProcess, 'spawnSync').mockReturnValue({
        status: 0,
        stdout: Buffer.from(`${SAMPLE_SINGLE_LINE_MESSAGE}\n`),
      });
      expect(git.messageForRef(SAMPLE_REF)).toBe(SAMPLE_SINGLE_LINE_MESSAGE);
      expect(spy.mock.lastCall[0]).toBe('git');
      expect(spy.mock.lastCall[1]).toStrictEqual(EXPECTED_ARGS);
    });

    it('should return only the first line if the "git log" response contains multiple lines', () => {
      const spy = jest.spyOn(childProcess, 'spawnSync').mockReturnValue({
        status: 0,
        stdout: Buffer.from(`${SAMPLE_MULTILINE_MESSAGE}\n`),
      });
      expect(git.messageForRef(SAMPLE_REF)).toBe(SAMPLE_SINGLE_LINE_MESSAGE);
      expect(spy.mock.lastCall[0]).toBe('git');
      expect(spy.mock.lastCall[1]).toStrictEqual(EXPECTED_ARGS);
    });

    it('should return undefined if the "git log" command fails', () => {
      const spy = jest.spyOn(childProcess, 'spawnSync').mockReturnValue({ status: 1 });
      expect(git.messageForRef(SAMPLE_REF)).toBeUndefined();
      expect(spy.mock.lastCall[0]).toBe('git');
      expect(spy.mock.lastCall[1]).toStrictEqual(EXPECTED_ARGS);
    });
  });

  describe('push()', () => {
    const EXPECTED_ARGS = [
      'push',
      '--force',
      `https://${encodeURIComponent(SAMPLE_EMAIL)}:${encodeURIComponent(
        SAMPLE_API_KEY
      )}@git.heroku.com/${SAMPLE_APP_NAME}.git`,
      `${SAMPLE_REF}:refs/heads/master`,
    ];

    const SAMPLE_CREDENTIALS = { email: SAMPLE_EMAIL, apiKey: SAMPLE_API_KEY };

    it('should run "git push" with the correct arguments', () => {
      const spy = jest.spyOn(childProcess, 'spawnSync').mockReturnValue({ status: 0 });
      expect(git.push(SAMPLE_CREDENTIALS, SAMPLE_APP_NAME, SAMPLE_REF)).toStrictEqual({ status: 0 });
      expect(spy.mock.lastCall[0]).toBe('git');
      expect(spy.mock.lastCall[1]).toStrictEqual(EXPECTED_ARGS);
    });
  });
});
