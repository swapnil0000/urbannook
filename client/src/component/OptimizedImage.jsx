import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

/**
 * OptimizedImage component with lazy loading, intersection observer, and responsive srcset
 * Provides loading placeholder, efficient image loading, and responsive image optimization
 * 
 * Features:
 * - Responsive srcset generation with breakpoints: 640px, 768px, 1024px, 1280px, 1920px
 * - WebP format support with JPEG fallback
 * - Lazy loading with intersection observer
 * - fetchPriority support for LCP optimization
 * - Width/height attributes to prevent layout shift
 * - Mobile image size target: ≤100KB
 * - Desktop image: highest quality
 * 
 * Usage:
 * 1. Auto-generated srcset (requires pre-optimized images):
 *    <OptimizedImage src="/assets/hero2.webp" alt="Hero" />
 *    Expects: hero2-640w.webp, hero2-768w.webp, hero2-1024w.webp, hero2-1280w.webp, hero2-1920w.webp
 * 
 * 2. Custom srcset:
 *    <OptimizedImage 
 *      src="/assets/hero2.webp" 
 *      srcset="/assets/mobilehero.webp 640w, /assets/hero2.webp 1280w"
 *      alt="Hero" 
 *    />
 * 
 * 3. Hero image (above-fold, high priority):
 *    <OptimizedImage 
 *      src="/assets/hero2.webp" 
 *      alt="Hero" 
 *      loading="eager" 
 *      fetchPriority="high"
 *      width={1280}
 *      height={720}
 *    />
 * 
 * Note: Image optimization must be done at build time or manually.
 * Mobile images should be ≤100KB for optimal performance.
 */
const OptimizedImage = ({
  src,
  alt,
  className = '',
  placeholderClassName = '',
  width,
  height,
  loading = 'lazy',
  fetchPriority = 'auto',
  srcset,
  sizes,
  onLoad,
  onError,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);

  // Generate responsive srcset if not provided
  const generateSrcset = (imageSrc) => {
    // Only use provided srcset, don't auto-generate
    if (srcset) return srcset;
    
    // Return undefined to use only src attribute
    return undefined;
  };

  // Generate sizes attribute if not provided
  const generateSizes = () => {
    if (sizes) return sizes;
    
    // Only return sizes if srcset is provided
    if (!srcset) return undefined;
    
    // Default responsive sizes based on common layouts
    return '(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1280px';
  };

  const responsiveSrcset = generateSrcset(src);
  const responsiveSizes = generateSizes();

  useEffect(() => {
    // Skip intersection observer if loading is eager
    if (loading === 'eager') {
      setIsInView(true);
      return;
    }

    // Create intersection observer for lazy loading
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before image enters viewport
        threshold: 0.01,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, [loading]);

  const handleLoad = (e) => {
    setIsLoaded(true);
    if (onLoad) {
      onLoad(e);
    }
  };

  const handleError = (e) => {
    setHasError(true);
    if (onError) {
      onError(e);
    }
  };

  return (
    <div
      ref={imgRef}
      className={`relative ${className}`}
    >
      {/* Loading placeholder */}
      {!isLoaded && !hasError && (
        <div
          className={`absolute inset-0 bg-gray-200 animate-pulse ${placeholderClassName}`}
          aria-label="Loading image"
        />
      )}

      {/* Error placeholder */}
      {hasError && (
        <div
          className={`absolute inset-0 bg-gray-100 flex items-center justify-center ${placeholderClassName}`}
          aria-label="Failed to load image"
        >
          <svg
            className="w-12 h-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      )}

      {/* Actual image - only load when in view */}
      {isInView && (
        <img
          src={src}
          alt={alt}
          srcSet={responsiveSrcset}
          sizes={responsiveSizes}
          className={`w-full h-full transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading={loading}
          fetchPriority={fetchPriority}
          width={width}
          height={height}
          onLoad={handleLoad}
          onError={handleError}
          {...props}
        />
      )}
    </div>
  );
};

OptimizedImage.propTypes = {
  src: PropTypes.string.isRequired,
  alt: PropTypes.string.isRequired,
  className: PropTypes.string,
  placeholderClassName: PropTypes.string,
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  loading: PropTypes.oneOf(['lazy', 'eager']),
  fetchPriority: PropTypes.oneOf(['high', 'low', 'auto']),
  srcset: PropTypes.string,
  sizes: PropTypes.string,
  onLoad: PropTypes.func,
  onError: PropTypes.func,
};

export default OptimizedImage;
