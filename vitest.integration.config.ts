import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        setupFiles: ['./src/test-setup.ts'],
        include: ['tests/integration/**/*.test.ts'],
        testTimeout: 15000,
        hookTimeout: 30000,
        fileParallelism: false,
    },
});
