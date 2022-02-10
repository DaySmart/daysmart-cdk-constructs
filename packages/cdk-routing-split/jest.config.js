module.exports = {
    roots: ['.'],
    collectCoverageFrom: ['<rootDir>/src/**/*.ts'],
    coverageDirectory: '<rootDir>/coverage',
    testMatch: ['<rootDir>/test/**/*.test.ts'],
    modulePaths: ['node-modules'],
    preset: 'ts-jest',
    testEnvironment: 'node',
    globals: {
        'ts-jest': {
            tsconfig: 'tsconfig.test.json',
        },
    },
    globalSetup: '<rootDir>/test/setup/jest.config-env-vars.js',
    setupFilesAfterEnv: ['<rootDir>/test/setup/jest.setup.js'],
    coverageReporters: ['json', 'lcov', 'text'],
    coveragePathIgnorePatterns: ['.*/src/*\\.d\\.ts'],
};
