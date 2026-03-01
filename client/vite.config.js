import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

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

export default defineConfig({
  plugins: [react(), bundleSizeMonitor()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },

  build: {
    sourcemap: false,
    minify: "esbuild",
    chunkSizeWarningLimit: 1000,
    
    // Asset optimization settings
    assetsInlineLimit: 4096,
    cssCodeSplit: true,
    
    // Minification options
    target: 'es2015',
    cssMinify: true,
    
    // Esbuild minification options
    esbuild: {
      drop: ['console', 'debugger'],
      // Faster builds with parallel processing
      platform: 'browser',
      format: 'esm'
    },
    
    rollupOptions: {
      // Force externalize React Router to separate chunk
      external: (id) => {
        // Don't externalize, but this helps with chunking
        return false;
      },
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
        // More aggressive tree shaking
        unknownGlobalSideEffects: false,
        correctVarValueBeforeDeclaration: false
      },
      output: {
        manualChunks: (id) => {
          // Vendor chunks - split large libraries into separate bundles
          if (id.includes('node_modules')) {
            // More specific React Router splitting
            if (id.includes('react-router-dom') || id.includes('@remix-run/router')) {
              return 'react-router-vendor';
            }
            // React DOM splitting
            if (id.includes('react-dom')) {
              return 'react-dom-vendor';
            }
            // Core React (must be last to avoid conflicts)
            if (id.includes('react/') || id.includes('react\\') || id.endsWith('react')) {
              return 'react-vendor';
            }
            if (id.includes('@reduxjs/toolkit') || id.includes('react-redux')) {
              return 'redux-vendor';
            }
            if (id.includes('ol/')) {
              return 'map-vendor';
            }
            if (id.includes('axios')) {
              return 'http-vendor';
            }
            return 'vendor';
          }
          
          // Route-based code splitting
          if (id.includes('/pages/home/')) return 'home-pages';
          if (id.includes('/pages/shop/')) return 'shop-pages';
          if (id.includes('/pages/account/')) return 'account-pages';
          if (id.includes('/pages/support/')) return 'support-pages';
          if (id.includes('/pages/legal/')) return 'legal-pages';
          if (id.includes('/pages/info/')) return 'info-pages';
          
          // Component chunks
          if (id.includes('/component/layout/auth/')) return 'auth-components';
          if (id.includes('MapModal') || id.includes('CouponList')) return 'modal-components';
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
    include: ["react", "react-dom"],
    // Force pre-bundling for consistent builds
    force: false
  },
  
  // Enable compression
  server: {
    compress: true,
    port: 3000,
    strictPort: false,
    host: true,
  },
});
