// C:\Users\Siddharathan\Desktop\gocart-ecommerce-full-stack\app\(public)\shop\page.jsx
'use client';
import { Suspense, useState, useEffect } from 'react';
import ProductCard from '@/components/ProductCard';
import {
  MoveLeftIcon, FilterIcon, Search, AlertCircle,
  ArrowUpDown, PanelLeft, PanelLeftClose, RefreshCw,
  CheckCircle2, X,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSelector } from 'react-redux';

function ShopContent() {
  const searchParams = useSearchParams();
  const search  = searchParams.get('search') || '';
  const router  = useRouter();
  const products = useSelector((state) => state.product.list);

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [priceRange,        setPriceRange]        = useState([0, 10000]);
  const [showFilters,       setShowFilters]        = useState(false);
  const [sortBy,            setSortBy]             = useState('featured');

  // Categories from join table (product.categories = [{category:{name}}])
  const categories = [
    'All',
    ...new Set(
      products
        .flatMap((p) => (p.categories || []).map((c) => c.category?.name || c.name).filter(Boolean))
    ),
  ];

  // Price from variants
  const allPrices = products.flatMap((p) => (p.variants || []).map((v) => Number(v.price) || 0));
  const minPrice  = allPrices.length ? Math.min(...allPrices) : 0;
  const maxPrice  = allPrices.length ? Math.max(...allPrices) : 10000;

  useEffect(() => {
    setPriceRange([minPrice, maxPrice]);
  }, [products.length]);

  // Variant-aware min price for a product
  const getMinPrice = (p) => {
    const prices = (p.variants || []).map((v) => Number(v.price) || 0);
    return prices.length ? Math.min(...prices) : 0;
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = search
      ? p.name.toLowerCase().includes(search.toLowerCase())
      : true;

    const productCategoryNames = (p.categories || []).map((c) => c.category?.name || c.name);
    const matchesCategory = selectedCategory === 'All'
      ? true
      : productCategoryNames.includes(selectedCategory);

    const minP = getMinPrice(p);
    const matchesPrice = minP >= priceRange[0] && minP <= priceRange[1];

    return matchesSearch && matchesCategory && matchesPrice;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'price-low':  return getMinPrice(a) - getMinPrice(b);
      case 'price-high': return getMinPrice(b) - getMinPrice(a);
      case 'newest':     return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      case 'rating': {
        const avg = (p) => p.ratings?.length
          ? p.ratings.reduce((s, r) => s + r.rating, 0) / p.ratings.length
          : 0;
        return avg(b) - avg(a);
      }
      default: return 0;
    }
  });

  const resetFilters = () => {
    setSelectedCategory('All');
    setPriceRange([minPrice, maxPrice]);
    setSortBy('featured');
    if (search) router.push('/shop');
  };

  return (
    <div className="min-h-[70vh] mx-auto px-4 sm:px-6 max-w-7xl">
      <div className="w-full">
        {/* Header */}
        <div className="flex justify-between items-center my-6">
          <h1 onClick={() => router.push('/shop')} className="text-2xl text-slate-500 flex items-center gap-2 cursor-pointer hover:text-slate-700">
            {search && <MoveLeftIcon size={20} className="animate-pulse" />}
            {search ? (
              <span>Search: "<span className="font-medium text-slate-800">{search}</span>"</span>
            ) : (
              <span>All <span className="text-green-600 font-medium">Products</span></span>
            )}
          </h1>
          <div className="hidden md:flex items-center gap-3">
            <div className="relative">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none bg-white border border-slate-200 text-slate-700 py-2.5 pl-4 pr-10 rounded-lg text-sm focus:outline-none shadow-sm">
                <option value="featured">Featured</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="newest">Newest First</option>
                <option value="rating">Highest Rated</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-600">
                <ArrowUpDown size={16} />
              </div>
            </div>
            <button onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm rounded-lg transition-all ${showFilters ? 'bg-green-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
              {showFilters ? <><PanelLeftClose size={16} /> Hide Filters</> : <><PanelLeft size={16} /> Show Filters</>}
            </button>
          </div>
          <button className="md:hidden flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-2 rounded-lg text-sm" onClick={() => setShowFilters(!showFilters)}>
            <FilterIcon size={14} /> {showFilters ? 'Hide' : 'Filter'}
          </button>
        </div>

        {/* Mobile search */}
        <div className="md:hidden mb-6">
          <form onSubmit={(e) => { e.preventDefault(); const s = new FormData(e.currentTarget).get('search'); router.push(`/shop?search=${s}`); }} className="relative">
            <input type="text" name="search" defaultValue={search} placeholder="Search products..."
              className="w-full bg-slate-100 border border-slate-200 py-2.5 pl-10 pr-4 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          </form>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Filters sidebar */}
          {showFilters && (
            <div className="w-full md:w-64 bg-white p-5 rounded-xl shadow-md border border-slate-200 h-max">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-800 flex items-center gap-2"><FilterIcon size={16} className="text-green-600" /> Filters</h2>
                <button onClick={resetFilters} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"><RefreshCw size={12} /> Reset All</button>
              </div>

              {/* Categories */}
              <div className="mb-6">
                <h3 className="font-medium text-slate-800 mb-3">Categories</h3>
                <div className="space-y-2.5 max-h-56 overflow-y-auto pl-2">
                  {categories.map((cat) => (
                    <div key={cat} className="flex items-center gap-2">
                      <input type="radio" id={cat} name="category" checked={selectedCategory === cat} onChange={() => setSelectedCategory(cat)} className="accent-green-600 w-4 h-4" />
                      <label htmlFor={cat} className={`text-sm cursor-pointer ${selectedCategory === cat ? 'text-green-700 font-medium' : 'text-slate-600'}`}>{cat}</label>
                      {selectedCategory === cat && <CheckCircle2 size={14} className="text-green-500" />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="mb-6">
                <h3 className="font-medium text-slate-800 mb-3">Price Range</h3>
                <div className="flex items-center gap-2 mb-3">
                  <input type="number" value={priceRange[0]} onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm" min={minPrice} max={priceRange[1]} />
                  <span className="text-slate-400">–</span>
                  <input type="number" value={priceRange[1]} onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm" min={priceRange[0]} max={maxPrice} />
                </div>
                <input type="range" min={minPrice} max={maxPrice} value={priceRange[1]} onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                  className="w-full accent-green-600 h-2 bg-slate-200 rounded-full cursor-pointer" />
                <div className="flex justify-between text-xs text-slate-500 mt-2"><span>₹{minPrice}</span><span>₹{maxPrice}</span></div>
              </div>

              {/* Mobile sort */}
              <div className="md:hidden mb-4">
                <h3 className="font-medium text-slate-800 mb-3">Sort By</h3>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full bg-white border border-slate-200 text-slate-700 p-2.5 rounded-lg text-sm">
                  <option value="featured">Featured</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="newest">Newest First</option>
                  <option value="rating">Highest Rated</option>
                </select>
              </div>

              <div className="flex gap-2 md:hidden">
                <button onClick={() => setShowFilters(false)} className="w-full bg-slate-200 text-slate-700 py-2.5 rounded-lg text-sm flex items-center justify-center gap-1.5"><X size={14} /> Close</button>
                <button onClick={resetFilters} className="w-full bg-green-600 text-white py-2.5 rounded-lg text-sm flex items-center justify-center gap-1.5"><RefreshCw size={14} /> Reset</button>
              </div>
            </div>
          )}

          {/* Products Grid */}
          <div className="flex-1">
            {sortedProducts.length > 0 ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <span className="bg-white border border-slate-200 text-slate-600 text-xs px-3 py-1.5 rounded-full shadow-sm">
                    Showing <span className="font-medium text-green-600">{sortedProducts.length}</span> products
                  </span>
                  {selectedCategory !== 'All' && (
                    <span className="bg-green-50 text-green-700 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs border border-green-100">
                      <CheckCircle2 size={14} className="text-green-600" /> {selectedCategory}
                    </span>
                  )}
                </div>
                <div className={`grid ${showFilters ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'} gap-4 md:gap-6 mb-32`}>
                  {sortedProducts.map((product) => <ProductCard key={product.id} product={product} />)}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center bg-slate-50 rounded-2xl border border-slate-100">
                <AlertCircle className="w-10 h-10 text-amber-500 mb-4" />
                <h3 className="text-xl font-medium text-slate-800 mb-2">No products found</h3>
                <p className="text-sm text-slate-500 max-w-md mb-6">Try adjusting your filters or search term.</p>
                <button onClick={resetFilters} className="bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-lg text-sm font-medium flex items-center gap-2"><RefreshCw size={16} /> Reset Filters</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Shop() {
  return (
    <Suspense fallback={
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-pulse grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5 w-full max-w-7xl px-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex flex-col space-y-3 bg-white p-4 rounded-xl border border-slate-100">
              <div className="h-40 sm:h-56 bg-slate-200 rounded-lg" />
              <div className="h-4 bg-slate-200 rounded-full w-3/4" />
              <div className="h-4 bg-slate-200 rounded-full w-1/2" />
              <div className="h-9 bg-slate-200 rounded-lg mt-2" />
            </div>
          ))}
        </div>
      </div>
    }>
      <ShopContent />
    </Suspense>
  );
}