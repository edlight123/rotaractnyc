const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

/** @type {import('jest').Config} */
const customConfig = {
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
  collectCoverageFrom: [
    'app/api/**/*.ts',
    'hooks/**/*.ts',
    'lib/**/*.ts',
    '!lib/firebase/admin.ts',
    '!lib/firebase/client.ts',
  ],
};

module.exports = createJestConfig(customConfig);
