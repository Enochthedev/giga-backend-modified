module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>'],
    testMatch: [
        '**/__tests__/**/*.ts',
        '**/?(*.)+(spec|test).ts'
    ],
    transform: {
        '^.+\\.ts$': 'ts-jest'
    },
    collectCoverageFrom: [
        '../services/**/*.ts',
        '../packages/**/*.ts',
        '!**/*.d.ts',
        '!**/node_modules/**',
        '!**/dist/**',
        '!**/coverage/**'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: [
        'text',
        'lcov',
        'html',
        'json'
    ],
    moduleNameMapping: {
        '^@giga/common$': '<rootDir>/../packages/common/src',
        '^@giga/common/(.*)$': '<rootDir>/../packages/common/src/$1'
    },
    setupFilesAfterEnv: ['<rootDir>/setup.ts'],
    testTimeout: 30000,
    verbose: true,
    maxWorkers: 4,
    testSequencer: '<rootDir>/test-sequencer.js'
};