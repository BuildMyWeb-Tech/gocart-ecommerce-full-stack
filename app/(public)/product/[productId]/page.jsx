'use client';
import ProductDescription from '@/components/ProductDescription';
import ProductDetails from '@/components/ProductDetails';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import Link from 'next/link';
import { Loader2, Home, ChevronRight } from 'lucide-react';

export default function Product() {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  const products = useSelector((state) => state.product.list);

  useEffect(() => {
    scrollTo(0, 0);

    if (products.length > 0) {
      const found = products.find((p) => p.id === productId);
      setProduct(found || null);
      setLoading(false);
    }
  }, [productId, products]);

  // ── Multiple categories display: "Electronics + Accessories" ─────
  const categoryDisplay = product
    ? Array.isArray(product.category)
      ? product.category.join(' + ')
      : product.category
    : '';

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 size={22} className="animate-spin" />
          <span>Loading product...</span>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-500 gap-3">
        <p className="text-lg font-medium">Product not found</p>
        <Link href="/" className="text-sm text-indigo-600 hover:underline">
          ← Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-6">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb — shows multiple categories with + */}
        <div className="flex items-center gap-1.5 text-slate-500 text-sm mt-8 mb-5 flex-wrap">
          <Link href="/" className="flex items-center gap-1 hover:text-slate-700 transition-colors">
            <Home size={14} />
            Home
          </Link>
          <ChevronRight size={14} className="text-slate-300" />
          <Link href="/shop" className="hover:text-slate-700 transition-colors">
            Products
          </Link>
          <ChevronRight size={14} className="text-slate-300" />
          <span className="text-indigo-600 font-medium">{categoryDisplay}</span>
          <ChevronRight size={14} className="text-slate-300" />
          <span className="text-slate-700 font-medium line-clamp-1 max-w-[200px]">
            {product.name}
          </span>
        </div>

        {/* Product Details */}
        <ProductDetails product={product} />

        {/* Description & Reviews */}
        <ProductDescription product={product} />
      </div>
    </div>
  );
}
