module.exports = {
  testEnvironment: 'node',
  testRegex: '(/test/.*\\.test\\.js)',
  testPathIgnorePatterns: ['/node_modules/'],
  coveragePathIgnorePatterns: ['node_modules', '/test'],
  roots: ['<rootDir>'],
  modulePaths: ['<rootDir>'],
  restoreMocks: true,
};
