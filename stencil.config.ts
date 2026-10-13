import { Config } from '@stencil/core';

// Conditionally load framework output targets
let angularOutputTarget: any;
let reactOutputTarget: any;
let vueOutputTarget: any;

try { angularOutputTarget = require('@stencil/angular-output-target').angularOutputTarget; } catch {}
try { reactOutputTarget = require('@stencil/react-output-target').reactOutputTarget; } catch {}
try { vueOutputTarget = require('@stencil/vue-output-target').vueOutputTarget; } catch {}

export const config: Config = {
  namespace: 'clinical-genogram',
  outputTargets: [
    {
      type: 'dist',
      esmLoaderPath: '../loader',
    },
    {
      type: 'dist-custom-elements',
      customElementsExportBehavior: 'auto-define-custom-elements',
      externalRuntime: false,
    },
    {
      type: 'www',
      serviceWorker: null,
      copy: [
        { src: '../demo/sample-data', dest: 'demo/sample-data' },
      ],
    },
    // Framework targets (only active when their packages are installed)
    ...(angularOutputTarget ? [angularOutputTarget({
      componentCorePackage: 'clinical-genogram',
      outputType: 'component',
      directivesProxyFile: '../output-targets/angular/src/directives/proxies.ts',
      directivesArrayFile: '../output-targets/angular/src/directives/index.ts',
    })] : []),
    ...(reactOutputTarget ? [reactOutputTarget({
      componentCorePackage: 'clinical-genogram',
      proxiesFile: '../output-targets/react/src/components/stencil-generated/index.ts',
    })] : []),
    ...(vueOutputTarget ? [vueOutputTarget({
      componentCorePackage: 'clinical-genogram',
      proxiesFile: '../output-targets/vue/src/components.ts',
    })] : []),
  ],
  testing: {
    browserHeadless: 'shell',
  },
};
