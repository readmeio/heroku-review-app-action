require('module-alias/register');

module.exports = {
  testEnvironment: 'node',
  testRegex: '(/test/.*|(\\.|/)(test|spec))\\.(js?|ts?)$',
  testPathIgnorePatterns: ['/node_modules/'],
  coveragePathIgnorePatterns: ['node_modules', '/test'],
  roots: ['<rootDir>'],
  modulePaths: ['<rootDir>'],
  restoreMocks: true,
};
