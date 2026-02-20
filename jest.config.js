/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  transformIgnorePatterns: ['node_modules/(?!(@paralleldrive/cuid2|@noble/hashes)/)'],

  preset: 'ts-jest',
  testEnvironment: 'node',

  transform: {
    '^.+\\.(ts|tsx|js)$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.test.json',
      },
    ],
  },

  testMatch: ['**/tests/**/*.test.ts'],
};
