import {defineConfig} from 'electron-vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import {resolve} from 'node:path';
const workspace={exclude:['@flowproof/contracts','@flowproof/browser-runtime']};
export default defineConfig({
  main:{build:{externalizeDeps:workspace,rollupOptions:{external:['playwright-core','ws'],input:{index:resolve('src/main/index.ts'),utility:resolve('src/utility/index.ts')}}}},
  preload:{build:{externalizeDeps:false,rollupOptions:{input:resolve('src/preload/index.ts'),output:{format:'cjs',entryFileNames:'index.cjs'}}}},
  renderer:{plugins:[react(),tailwind()],base:'./',server:{host:'127.0.0.1'}}
});
