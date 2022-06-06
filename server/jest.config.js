module.exports = {
  coveragePathIgnorePatterns: ['/node_modules/', '/setup/'],
  moduleNameMapper: {
    '~(.*)': `${__dirname}/src$1`,
  },
  setupFilesAfterEnv: [`${__dirname}/setup/setup-test.js`],
  testEnvironment: 'node',
  testPathIgnorePatterns: [
    `${__dirname}/node_modules/`,
    process.env.JEST_ENV === 'e2e' ? '.*\\.spec.js$' : '.*\\.e2e-spec.js$',
  ],
  testURL: 'http://localhost/',
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
};
