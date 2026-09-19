import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { webcrypto } from "node:crypto";

// Fix crypto.getRandomValues issue in Node.js environment
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

/**
 * Bundle Size Monitor Plugin
 * Warns when bundle sizes exceed defined thresholds
 */
function bundleSizeMonitor() {
  // Size limits in KB (gzipped equivalent estimation: ~30% of actual size)
  const SIZE_LIMITS = {
    mainBundle: 250, // Main bundle limit (gzipped)
    routeBundle: 150, // Individual route bundle limit (gzipped)
    vendorBundle: 300, // Vendor bundle limit (gzipped)
  };

  return {
    name: 'bundle-size-monitor',
    apply: 'build',
    
    closeBundle() {
      // This runs after the bundle is generated
      console.log('\n📦 Bundle Size Analysis:');
    },
    
    generateBundle(options, bundle) {
      const chunks = Object.values(bundle).filter(chunk => chunk.type === 'chunk');
      const assets = Object.values(bundle).filter(asset => asset.type === 'asset');
      
      let totalSize = 0;
      let hasWarnings = false;
      
      // Analyze JavaScript chunks
      chunks.forEach(chunk => {
        const sizeKB = (chunk.code.length / 1024).toFixed(2);
        const estimatedGzipKB = (sizeKB * 0.3).toFixed(2); // Rough gzip estimation
        totalSize += parseFloat(sizeKB);
        
        let limit = SIZE_LIMITS.routeBundle;
        let bundleType = 'route';
        
        // Determine bundle type and appropriate limit
        if (chunk.name === 'index' || chunk.fileName.includes('index')) {
          limit = SIZE_LIMITS.mainBundle;
          bundleType = 'main';
        } else if (chunk.name.includes('vendor') || chunk.fileName.includes('vendor')) {
          limit = SIZE_LIMITS.vendorBundle;
          bundleType = 'vendor';
        }
        
        // Check if size exceeds limit (using estimated gzip size)
        if (parseFloat(estimatedGzipKB) > limit) {
          console.warn(`⚠️  ${chunk.fileName}: ${sizeKB} KB (est. ${estimatedGzipKB} KB gzipped) - EXCEEDS ${bundleType} limit of ${limit} KB`);
          hasWarnings = true;
        } else {
          console.log(`✅ ${chunk.fileName}: ${sizeKB} KB (est. ${estimatedGzipKB} KB gzipped)`);
        }
      });
      
      // Analyze CSS and other assets
      assets.forEach(asset => {
        if (asset.fileName.endsWith('.css')) {
          const sizeKB = (asset.source.length / 1024).toFixed(2);
          console.log(`📄 ${asset.fileName}: ${sizeKB} KB`);
          totalSize += parseFloat(sizeKB);
        }
      });
      
      console.log(`\n📊 Total Bundle Size: ${totalSize.toFixed(2)} KB (uncompressed)`);
      console.log(`📊 Estimated Gzipped: ${(totalSize * 0.3).toFixed(2)} KB\n`);
      
      if (hasWarnings) {
        console.warn('⚠️  WARNING: Some bundles exceed size limits!');
        console.warn('Consider code splitting, lazy loading, or removing unused dependencies.\n');
      } else {
        console.log('✅ All bundles are within size limits!\n');
      }
    }
  };
}

/**
 * HTML Environment Variable Replace Plugin
 * Replaces %VITE_GTM_ID% placeholder in index.html with the actual GTM container ID
 */
function htmlEnvReplace(gtmId, metaPixelId) {
  return {
    name: 'html-env-replace',
    transformIndexHtml(html) {
      return html
        .replace(/__VITE_GTM_ID__/g, gtmId || 'GTM-XXXXXXX')
        // Leave the placeholder if no pixel id is set; the inline guard then skips init.
        .replace(/__VITE_META_PIXEL_ID__/g, metaPixelId || '');
    }
  };
}

export default defineConfig(({ mode }) => {
  // Vite does NOT auto-populate process.env from .env files, so load them here
  // and hand the GTM container id to the index.html replace plugin.
  const env = loadEnv(mode, '.', '');
  return {
  plugins: [react(), bundleSizeMonitor(), htmlEnvReplace(env.VITE_GTM_ID, env.VITE_META_PIXEL_ID)],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },

  // Vite reads `esbuild` at the top level, NOT under `build`. Keep it here or the
  // console/debugger stripping silently does nothing.
  esbuild: {
    drop: ['console', 'debugger'],
  },

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    css: true
  },

  build: {
    sourcemap: false,
    minify: "esbuild",
    chunkSizeWarningLimit: 1000,
    
    // Asset optimization settings
    assetsInlineLimit: 4096,
    cssCodeSplit: true,
    
    // Minification options (Requirements 9.1, 9.2, 9.3)
    target: 'es2015',
    cssMinify: true, // CSS minification enabled
    
    rollupOptions: {
      // Force externalize React Router to separate chunk
      external: (id) => {
        // Don't externalize, but this helps with chunking
        return false;
      },
      output: {
        // Matched by resolved module path, not by bare specifier. The previous
        // object form listed 'react-dom', but the app imports 'react-dom/client' —
        // a different module id — so react-dom never matched and landed in the entry
        // chunk instead. Same for axios, which left utils-vendor empty (0 bytes).
        // The trailing slash anchors each match: node_modules/react/ does not match
        // node_modules/react-redux/ or node_modules/react-router-dom/.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          // react + react-dom + scheduler must share one chunk; splitting them apart
          // reorders initialization and breaks React at runtime.
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react-vendor';
          if (/node_modules\/(@reduxjs|react-redux|redux|immer|reselect)\//.test(id)) return 'redux-vendor';
          if (/node_modules\/react-router(-dom)?\//.test(id)) return 'router-vendor';
          if (/node_modules\/axios\//.test(id)) return 'utils-vendor';
        },
        // Optimize asset file names
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          } else if (/woff2?|ttf|otf|eot/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      }
    },
    
    // Compression and optimization
    reportCompressedSize: true,
  },

  optimizeDeps: {
    include: [
      "react", 
      "react-dom", 
      "react/jsx-runtime",
      "@reduxjs/toolkit",
      "react-redux",
      "react-router-dom"
    ],
    force: false
  },
  
  // Enable compression
  server: {
    compress: true,
    port: 3000,
    strictPort: false,
    host: true,
  },
  };
});
