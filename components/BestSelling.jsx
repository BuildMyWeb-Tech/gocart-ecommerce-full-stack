'use client'
import Title from './Title'
import ProductCard from './ProductCard'
import { useSelector } from 'react-redux'
import { ArrowRight, TrendingUp } from 'lucide-react'

const BestSelling = () => {
    const displayQuantity = 8
    const products = useSelector(state => state.product.list)

    // Add sample product data for demo
    const sampleProducts = products.map(product => ({
        ...product,
        shortDescription: product.category === 'Hair Care' 
            ? 'Promotes Hair Growth | Hair Fall Control'
            : product.category === 'Anti Dandruff' 
            ? 'Reduces Dandruff Up To 100% | Treats Itchy Scalp'
            : product.category === 'Hair Growth Serum'
            ? 'Boosts Hair Growth | Reduces Hair Thinning'
            : 'Gives 5X Hair Fall Control | Nourishes the Roots',
        flat20: true,
        flat20Price: 306,
        flat35: product.price > 500,
        flat35Price: product.price > 500 ? 565 : null,
    }))

    return (
        <div className='px-6 py-12 max-w-6xl mx-auto'>
            <div className="flex items-center justify-between mb-8">
                <Title 
                    title={<div className="flex items-center gap-2"><TrendingUp className="text-emerald-500" size={24} /> Best Selling</div>}
                    description={`Showing ${sampleProducts.length < displayQuantity ? sampleProducts.length : displayQuantity} of ${sampleProducts.length} products`} 
                />
                <a href="/shop" className="hidden sm:flex items-center text-slate-700 hover:text-slate-900 transition-colors font-medium text-sm">
                    View All <ArrowRight size={16} className="ml-1" />
                </a>
            </div>
            
            <div className='mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6'>
                {sampleProducts.slice().sort((a, b) => b.rating.length - a.rating.length).slice(0, displayQuantity).map((product, index) => (
                    <ProductCard key={index} product={product} />
                ))}
            </div>
            
            <div className="flex justify-center mt-8 sm:hidden">
                <a href="/shop" className="flex items-center justify-center text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-all py-2 px-4 rounded-full font-medium text-sm w-full max-w-xs">
                    View All <ArrowRight size={16} className="ml-1" />
                </a>
            </div>
        </div>
    )
}

export default BestSelling
