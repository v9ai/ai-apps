import type { Config } from 'jest';

const config: Config = {
  preset: '@ai-apps/jest-presets/node',
  setupFiles: ['./jest.setup.ts'],
  testMatch: ['**/__tests__/integration.test.ts'],
  testTimeout: 30000,
};

export default config;
