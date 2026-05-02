import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  oxc: false,
  test: {
    globals: true,
    environment: 'node',
    root: '.',
    // Runtime tests only. Type-level tests live in *.spec.types.ts
    // files, exercised by vitest's typecheck mode (see typecheck.include
    // below). The two patterns don't overlap because *.spec.ts matches
    // names ending in `.spec.ts`, not `.spec.<anything>.ts`.
    include: ['test/**/*.spec.ts'],
    typecheck: {
      enabled: true,
      include: ['test/**/*.spec.types.ts']
    },
    coverage: {
      provider: 'v8',
      reportsDirectory: 'test/coverage',
      include: ['src/**/*.ts', 'index.ts'],
      exclude: ['test/**'],
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100
      }
    }
  },
  plugins: [
    swc.vite({
      jsc: {
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true
        }
      }
    })
  ]
});
