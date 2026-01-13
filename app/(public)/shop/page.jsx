'use client'
import { Suspense, useState, useEffect } from "react"
import ProductCard from "@/components/ProductCard"
import { MoveLeftIcon, FilterIcon, SlidersHorizontalIcon, Search, ShoppingBagIcon } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSelector } from "react-redux"

function ShopContent() {
    // get query params ?search=abc
    const searchParams = useSearchParams()
    const search = searchParams.get('search') || ''
    const router = useRouter()

    const products = useSelector(state => state.product.list)
    const [selectedCategory, setSelectedCategory] = useState('All')
    const [priceRange, setPriceRange] = useState([0, 1000])
    const [showFilters, setShowFilters] = useState(false)
    const [sortBy, setSortBy] = useState('featured')

    // Get unique categories from products
    const categories = ['All', ...new Set(products.map(product => product.category).filter(Boolean))]
    
    // Find min and max product prices
    const minPrice = Math.min(...products.map(p => p.price), 0)
    const maxPrice = Math.max(...products.map(p => p.price), 1000)
    
    useEffect(() => {
        setPriceRange([minPrice, maxPrice])
    }, [products])

    // Filter products based on search, category, and price
    const filteredProducts = products.filter(product => {
        const matchesSearch = search 
            ? product.name.toLowerCase().includes(search.toLowerCase()) 
            : true
            
        const matchesCategory = selectedCategory === 'All' 
            ? true 
            : product.category === selectedCategory
            
        const matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1]
        
        return matchesSearch && matchesCategory && matchesPrice
    })
    
    // Sort products
    const sortedProducts = [...filteredProducts].sort((a, b) => {
        switch (sortBy) {
            case 'price-low':
                return a.price - b.price
            case 'price-high':
                return b.price - a.price
            case 'newest':
                return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
            case 'rating':
                const aRating = a.rating.reduce((acc, curr) => acc + curr.rating, 0) / (a.rating.length || 1)
                const bRating = b.rating.reduce((acc, curr) => acc + curr.rating, 0) / (b.rating.length || 1)
                return bRating - aRating
            default: // featured or default
                return 0 // keep original order
        }
    })

    return (
        <div className="min-h-[70vh] mx-6">
            <div className="max-w-7xl mx-auto">
                {/* Header with search results or back button */}
                <div className="flex justify-between items-center my-6">
                    <h1 
                        onClick={() => router.push('/shop')} 
                        className="text-2xl text-slate-500 flex items-center gap-2 cursor-pointer"
                    > 
                        {search && <MoveLeftIcon size={20} />} 
                        {search ? `Search: "${search}"` : <span>All <span className="text-slate-700 font-medium">Products</span></span>}
                    </h1>
                    
                    {/* Filter & Sort Controls (Desktop) */}
                    <div className="hidden md:flex items-center gap-3">
                        <div className="relative">
                            <select 
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="appearance-none bg-white border border-slate-200 text-slate-700 py-2 pl-4 pr-8 rounded-lg cursor-pointer text-sm focus:outline-none focus:border-slate-400"
                            >
                                <option value="featured">Featured</option>
                                <option value="price-low">Price: Low to High</option>
                                <option value="price-high">Price: High to Low</option>
                                <option value="newest">Newest First</option>
                                <option value="rating">Highest Rated</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-600">
                                <SlidersHorizontalIcon size={16} />
                            </div>
                        </div>
                        
                        <button 
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg transition-colors ${
                                showFilters 
                                    ? 'bg-slate-700 text-white' 
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                        >
                            <FilterIcon size={16} />
                            Filters
                        </button>
                    </div>
                    
                    {/* Mobile filter button */}
                    <button 
                        className="md:hidden flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-sm"
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <FilterIcon size={14} />
                        Filter
                    </button>
                </div>
                
                {/* Search bar - for mobile */}
                <div className="md:hidden mb-6">
                    <form 
                        onSubmit={(e) => {
                            e.preventDefault()
                            const formData = new FormData(e.currentTarget)
                            const search = formData.get('search')
                            router.push(`/shop?search=${search}`)
                        }} 
                        className="relative"
                    >
                        <input 
                            type="text" 
                            name="search"
                            defaultValue={search}
                            placeholder="Search products..." 
                            className="w-full bg-slate-100 border border-slate-200 py-2 pl-10 pr-4 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-300"
                        />
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">
                            <Search size={16} />
                        </div>
                    </form>
                </div>
                
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Filters sidebar */}
                    {showFilters && (
                        <div className="w-full md:w-64 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                            <div className="mb-6">
                                <h3 className="font-medium text-slate-800 mb-3">Categories</h3>
                                <div className="space-y-2 max-h-56 overflow-y-auto">
                                    {categories.map((category) => (
                                        <div key={category} className="flex items-center">
                                            <input 
                                                type="radio" 
                                                id={category} 
                                                name="category"
                                                checked={selectedCategory === category}
                                                onChange={() => setSelectedCategory(category)}
                                                className="mr-2 accent-slate-700"
                                            />
                                            <label htmlFor={category} className="text-sm text-slate-600 cursor-pointer">
                                                {category}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="mb-6">
                                <h3 className="font-medium text-slate-800 mb-3">Price Range</h3>
                                <div className="flex items-center gap-2 mb-3">
                                    <input 
                                        type="number" 
                                        value={priceRange[0]}
                                        onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                                        className="w-full p-2 border border-slate-200 rounded text-sm"
                                        min={minPrice}
                                        max={priceRange[1]}
                                    />
                                    <span className="text-slate-500">to</span>
                                    <input 
                                        type="number" 
                                        value={priceRange[1]}
                                        onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                                        className="w-full p-2 border border-slate-200 rounded text-sm"
                                        min={priceRange[0]}
                                        max={maxPrice}
                                    />
                                </div>
                                <input 
                                    type="range" 
                                    min={minPrice} 
                                    max={maxPrice}
                                    value={priceRange[1]}
                                    onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                                    className="w-full accent-slate-700"
                                />
                            </div>
                            
                            <div className="md:hidden mb-4">
                                <h3 className="font-medium text-slate-800 mb-3">Sort By</h3>
                                <select 
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="w-full bg-white border border-slate-200 text-slate-700 p-2 rounded cursor-pointer text-sm"
                                >
                                    <option value="featured">Featured</option>
                                    <option value="price-low">Price: Low to High</option>
                                    <option value="price-high">Price: High to Low</option>
                                    <option value="newest">Newest First</option>
                                    <option value="rating">Highest Rated</option>
                                </select>
                            </div>
                            
                            <div className="flex gap-2 md:hidden">
                                <button 
                                    onClick={() => setShowFilters(false)}
                                    className="w-full bg-slate-200 text-slate-700 py-2 rounded-lg text-sm"
                                >
                                    Close
                                </button>
                                <button 
                                    onClick={() => {
                                        setSelectedCategory('All')
                                        setPriceRange([minPrice, maxPrice])
                                        setSortBy('featured')
                                    }}
                                    className="w-full bg-slate-800 text-white py-2 rounded-lg text-sm"
                                >
                                    Reset Filters
                                </button>
                            </div>
                        </div>
                    )}
                    
                    {/* Products Grid */}
                    <div className="flex-1">
                        {sortedProducts.length > 0 ? (
                            <>
                                <div className="hidden md:flex justify-between mb-4">
                                    <p className="text-sm text-slate-600">Showing {sortedProducts.length} products</p>
                                    <p className="text-sm text-slate-600">
                                        {selectedCategory !== 'All' && `Category: ${selectedCategory}`}
                                    </p>
                                </div>
                                
                                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mx-auto mb-32">
                                    {sortedProducts.map((product) => <ProductCard key={product.id} product={product} />)}
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="bg-slate-100 p-5 rounded-full mb-4">
                                    <ShoppingBagIcon className="w-8 h-8 text-slate-400" />
                                </div>
                                <h3 className="text-lg font-medium text-slate-800 mb-1">No products found</h3>
                                <p className="text-sm text-slate-500 max-w-md mb-4">
                                    We couldn't find any products matching your criteria. Try adjusting your filters or search term.
                                </p>
                                <button 
                                    onClick={() => {
                                        setSelectedCategory('All')
                                        setPriceRange([minPrice, maxPrice])
                                        router.push('/shop')
                                    }} 
                                    className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                                >
                                    Reset Filters
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function Shop() {
  return (
    <Suspense fallback={
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-10 w-40 bg-slate-200 rounded mb-4"></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full max-w-7xl px-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex flex-col space-y-3">
                <div className="h-40 sm:h-56 bg-slate-200 rounded-lg"></div>
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    }>
      <ShopContent />
    </Suspense>
  );
}
