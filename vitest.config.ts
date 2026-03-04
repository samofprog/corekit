import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['__tests__/**/*.spec.ts'],
        coverage: {
            include: ['src/**/*.ts'],
            exclude: ['src/**/index.ts'],
            thresholds: {
                branches: 80,
                functions: 80,
                lines: 80,
                statements: 80,
            },
        },
    },
});