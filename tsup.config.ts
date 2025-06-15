import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'core/dist/index': './packages/core/lib/index.ts',
    'bullmq/dist/index': './packages/bullmq/lib/index.ts',
  },
  splitting: false,
  sourcemap: true,
  clean: false,
  minify: true,
  dts: true,

  outDir: 'packages',
  format: ['esm', 'cjs'],
  tsconfig: 'tsconfig.prod.json',
});
