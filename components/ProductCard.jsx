'use client'
import { StarIcon, ShoppingCartIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React, { useState } from 'react'

const ProductCard = ({ product }) => {
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$'
    const [imageLoaded, setImageLoaded] = useState(false);

    // calculate the average rating of the product
    const rating = Math.round(product.rating.reduce((acc, curr) => acc + curr.rating, 0) / product.rating.length) || 0;
    
    // Calculate discount percentage
    const discountPercentage = product.mrp && product.price < product.mrp 
        ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
        : 0;

    return (
        <Link href={`/product/${product.id}`} className='group max-xl:mx-auto relative block transform transition-all duration-300 hover:translate-y-[-5px]'>
            {/* Product Image Container */}
            <div className='bg-gradient-to-br from-slate-50 to-[#F5F5F5] h-40 sm:w-60 sm:h-68 rounded-xl flex items-center justify-center overflow-hidden relative shadow-sm group-hover:shadow-md transition duration-300'>
                {/* Skeleton loader */}
                {!imageLoaded && (
                    <div className="absolute inset-0 bg-slate-100 animate-pulse"></div>
                )}
                
                {/* Product Image */}
                <Image 
                    width={500} 
                    height={500} 
                    className={`max-h-30 sm:max-h-40 w-auto group-hover:scale-115 transition duration-300 object-contain z-10 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`} 
                    src={product.images[0]} 
                    alt={product.name}
                    onLoad={() => setImageLoaded(true)}
                />
                
                {/* Quick add to cart button - appears on hover */}
                <div className="absolute bottom-2 left-0 right-0 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 transform translate-y-4 group-hover:translate-y-0">
                    <button className="bg-white text-slate-800 text-xs font-medium py-1.5 px-4 rounded-full shadow-md hover:bg-slate-800 hover:text-white transition-colors flex items-center gap-1.5">
                        <ShoppingCartIcon size={14} /> 
                        Quick View
                    </button>
                </div>
                
                {/* Discount badge */}
                {discountPercentage > 0 && (
                    <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full z-20">
                        -{discountPercentage}%
                    </div>
                )}
                
                {/* New product badge */}
                {product.createdAt && new Date(product.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full z-20">
                        NEW
                    </div>
                )}
            </div>
            
            {/* Product Information */}
            <div className='flex justify-between gap-3 text-sm text-slate-800 pt-3 max-w-60 px-1'>
                <div>
                    {/* Product Name */}
                    <p className="font-medium text-slate-700 group-hover:text-slate-900 transition-colors line-clamp-1">{product.name}</p>
                    
                    {/* Product Category */}
                    {product.category && (
                        <p className="text-xs text-slate-500 mb-1.5">{product.category}</p>
                    )}
                    
                    {/* Star Rating */}
                    <div className='flex items-center gap-1'>
                        <div className='flex'>
                            {Array(5).fill('').map((_, index) => (
                                <StarIcon 
                                    key={index} 
                                    size={14} 
                                    className='text-transparent mt-0.5' 
                                    fill={rating >= index + 1 ? "#00C950" : "#D1D5DB"} 
                                    strokeWidth={0}
                                />
                            ))}
                        </div>
                        {product.rating.length > 0 && (
                            <span className="text-xs text-slate-400">({product.rating.length})</span>
                        )}
                    </div>
                </div>
                
                {/* Product Price */}
                <div className="text-right">
                    <p className="font-semibold">{currency}{product.price}</p>
                    {product.mrp && product.price < product.mrp && (
                        <p className="text-xs text-slate-400 line-through">{currency}{product.mrp}</p>
                    )}
                </div>
            </div>
            
            {/* Stock Status */}
            {product.stock === 0 && (
                <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center rounded-lg z-30">
                    <p className="bg-slate-800 text-white text-xs font-medium py-1 px-3 rounded-full">Out of Stock</p>
                </div>
            )}
        </Link>
    )
}

export default ProductCard
