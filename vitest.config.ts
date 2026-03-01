import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        setupFiles: ['./src/test-setup.ts'],
        exclude: ['tests/integration/**', 'node_modules/**'],
    },
});
