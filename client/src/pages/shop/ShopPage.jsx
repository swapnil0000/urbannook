import { Suspense, lazy } from 'react';
import { useSearchParams } from 'react-router-dom';

const AllProductsPage = lazy(() => import('./AllProductsPage'));
const CategoryPage = lazy(() => import('./CategoryPage'));
const ProductDetailPage = lazy(() => import('./ProductDetailPage'));

const MinimalLoader = () => (
  <div className="fixed top-0 left-0 w-full h-1 bg-gray-200 z-50">
    <div className="h-full bg-[#a89068] animate-pulse" />
  </div>
);

const ShopPage = () => {
  const [searchParams] = useSearchParams();
  const product = searchParams.get('product');
  const category = searchParams.get('category');

  if (product) {
    return (
      <Suspense fallback={<MinimalLoader />}>
        <ProductDetailPage />
      </Suspense>
    );
  }

  if (category) {
    return (
      <Suspense fallback={<MinimalLoader />}>
        <CategoryPage />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<MinimalLoader />}>
      <AllProductsPage />
    </Suspense>
  );
};

export default ShopPage;
