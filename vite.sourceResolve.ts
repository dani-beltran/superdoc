import path from 'path';

const sourceResolve = {
  conditions: ['source'],
  alias: [
    // Local workspace aliases for private source-first packages used by public
    // builds and tests. The published `superdoc` package rewrites these to its
    // own emitted dist surface during postbuild.
    { find: '@superdoc/document-api', replacement: path.resolve(__dirname, 'packages/document-api/src/index.ts') },
    {
      find: '@superdoc/layout-resolved',
      replacement: path.resolve(__dirname, 'packages/layout-engine/layout-resolved/src/index.ts'),
    },
    {
      find: '@superdoc/layout-bridge',
      replacement: path.resolve(__dirname, 'packages/layout-engine/layout-bridge/src/index.ts'),
    },
    { find: '@superdoc/common', replacement: path.resolve(__dirname, 'shared/common') },
    { find: '@shared', replacement: path.resolve(__dirname, 'shared') },
    { find: '@core', replacement: path.resolve(__dirname, 'packages/super-editor/src/editors/v1/core') },
    { find: '@extensions', replacement: path.resolve(__dirname, 'packages/super-editor/src/editors/v1/extensions') },
    { find: '@features', replacement: path.resolve(__dirname, 'packages/super-editor/src/editors/v1/features') },
    { find: '@components', replacement: path.resolve(__dirname, 'packages/super-editor/src/editors/v1/components') },
    { find: '@helpers', replacement: path.resolve(__dirname, 'packages/super-editor/src/editors/v1/core/helpers') },
    {
      find: '@converter',
      replacement: path.resolve(__dirname, 'packages/super-editor/src/editors/v1/core/super-converter'),
    },
    { find: '@tests', replacement: path.resolve(__dirname, 'packages/super-editor/src/editors/v1/tests') },
    {
      find: '@translator',
      replacement: path.resolve(
        __dirname,
        'packages/super-editor/src/editors/v1/core/super-converter/v3/node-translator/index.js',
      ),
    },
    { find: '@utils', replacement: path.resolve(__dirname, 'packages/super-editor/src/editors/v1/utils') },
  ],
};

export default sourceResolve;
