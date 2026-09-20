import {defineConfig,globalIgnores} from 'eslint/config';

export default defineConfig([
  globalIgnores(['.next/**','node_modules/**','next-env.d.ts']),
]);
