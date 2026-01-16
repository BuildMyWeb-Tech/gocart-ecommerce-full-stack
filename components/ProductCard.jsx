'use client'
import { StarIcon, ShoppingCartIcon, Heart, Eye, Award, Clock, Tag, CheckCircle } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React, { useState } from 'react'

const ProductCard = ({ product }) => {
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₹'
    const [imageLoaded, setImageLoaded] = useState(false);
    const [isHovering, setIsHovering] = useState(false);

    // calculate the average rating of the product
    const rating = Math.round(product.rating.reduce((acc, curr) => acc + curr.rating, 0) / product.rating.length) || 0;
    
    // Calculate discount percentage
    const discountPercentage = product.mrp && product.price < product.mrp 
        ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
        : 0;
        
    // Calculate promo text
    const promoText = product.flat20 ? `Get it for ${currency}${product.flat20Price || (product.price * 0.8).toFixed(0)} with FLAT20` : 
                     product.flat35 ? `Get it for ${currency}${product.flat35Price || (product.price * 0.65).toFixed(0)} with FLAT35` : '';

    return (
        <Link 
            href={`/product/${product.id}`} 
            className='group max-xl:mx-auto relative block transform transition-all duration-300 hover:translate-y-[-5px]'
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
        >
            {/* Product Card Container - Matching the reference image style */}
            <div className='rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-all duration-300'>
                {/* Product Image Container */}
                <div className={`h-48 sm:h-60 w-full flex items-center justify-center overflow-hidden relative
                    ${product.category === 'Hair Growth' ? 'bg-[#ede0d4]' : 
                     product.category === 'Shampoo' ? 'bg-[#d8f3dc]' : 
                     product.category === 'Anti Dandruff' ? 'bg-[#e9ecef]' : 
                     'bg-[#dbe7fb]'}`}>
                    {/* Skeleton loader */}
                    {!imageLoaded && (
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-200 to-slate-300 animate-pulse"></div>
                    )}
                    
                    {/* Product Image */}
                    <div className="relative w-full h-full flex items-center justify-center p-4">
                        <Image 
                            width={500} 
                            height={500} 
                            className={`max-h-40 sm:max-h-48 w-auto transition-all duration-500 object-contain z-10 ${
                                imageLoaded ? 'opacity-100' : 'opacity-0'
                            } ${isHovering ? 'scale-110' : 'scale-100'}`} 
                            src={product.images[0]} 
                            alt={product.name}
                            onLoad={() => setImageLoaded(true)}
                        />
                    </div>
                    
                    {/* Best Seller Badge */}
                    <div className="absolute top-3 left-3 bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-1 rounded-md z-20 flex items-center gap-1">
                        <Award size={12} /> Best Seller
                    </div>

                    {/* Discount badge */}
                    {discountPercentage > 0 && (
                        <div className="absolute top-3 right-3 bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded-md z-20 flex items-center gap-1">
                            <Tag size={12} /> {discountPercentage}% OFF
                        </div>
                    )}
                </div>
                
                {/* Product Information */}
                <div className='p-3 sm:p-4'>
                    {/* Star Rating */}
                    <div className='flex items-center gap-1 mb-1'>
                        <div className='flex text-green-600'>
                            {Array(5).fill('').map((_, index) => (
                                <StarIcon 
                                    key={index} 
                                    size={14} 
                                    className='text-transparent' 
                                    fill={rating >= index + 1 ? "#00C950" : "#D1D5DB"} 
                                    strokeWidth={0}
                                />
                            ))}
                        </div>
                        <span className="text-xs text-slate-600 font-medium">
                            {rating.toFixed(1)} | {product.rating.length} Reviews
                        </span>
                    </div>
                    
                    {/* Product Name */}
                    <h3 className="font-medium text-sm sm:text-base text-slate-800 line-clamp-2 min-h-[2.5rem] mb-1">
                        {product.name}
                    </h3>
                    
                    {/* Product Short Description */}
                    <div className="flex flex-wrap gap-1 mt-1 mb-2">
                        {product.shortDescription && product.shortDescription.split('|').map((item, index) => (
                            <div key={index} className="text-xs text-slate-600 flex items-center">
                                {index > 0 && <span className="mx-1 text-slate-400">•</span>}
                                {item.trim()}
                            </div>
                        ))}
                    </div>

                    {/* Product Price */}
                    <div className="flex items-center gap-2 mt-2">
                        <p className="font-semibold text-base text-slate-900">{currency}{product.price}</p>
                        {product.mrp && product.price < product.mrp && (
                            <p className="text-xs text-slate-500 line-through">{currency}{product.mrp}</p>
                        )}
                        {discountPercentage > 0 && (
                            <p className="text-xs text-green-600 font-medium">{discountPercentage}% OFF</p>
                        )}
                    </div>

                    {/* Promo Text */}
                    {promoText && (
                        <div className="flex items-center gap-1 mt-1.5 text-xs text-green-700">
                            <CheckCircle size={12} className="text-green-600" />
                            {promoText}
                        </div>
                    )}

                    {/* Add to Cart Button */}
                    <button className="mt-3 w-full flex items-center justify-center gap-2 bg-[#ffc107] hover:bg-[#ffb700] text-slate-800 font-semibold py-2.5 px-4 rounded-lg transition-colors">
                        <ShoppingCartIcon size={16} />
                        ADD TO CART
                    </button>
                </div>
            </div>
            
            {/* Stock Status */}
            {product.stock === 0 && (
                <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center rounded-2xl z-30 backdrop-blur-sm">
                    <p className="bg-slate-800 text-white text-xs font-medium py-1.5 px-4 rounded-full">Out of Stock</p>
                </div>
            )}
        </Link>
    )
}

export default ProductCard
