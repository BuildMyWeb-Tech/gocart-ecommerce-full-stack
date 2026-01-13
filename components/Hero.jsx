'use client'
import { assets } from '@/assets/assets'
import { ArrowRightIcon, ChevronRightIcon } from 'lucide-react'
import Image from 'next/image'
import React from 'react'
import CategoriesMarquee from './CategoriesMarquee'

const Hero = () => {
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$'

    return (
        <div className='mx-6 overflow-hidden'>
            <div className='flex max-xl:flex-col gap-8 max-w-7xl mx-auto my-10 relative'>
                {/* Main Hero Section */}
                <div className='relative flex-1 flex flex-col bg-gradient-to-br from-green-100 to-green-200 rounded-3xl xl:min-h-100 group shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden'>
                    <div className='p-5 sm:p-16 z-10'>
                        {/* News Banner */}
                        <div className='inline-flex items-center gap-3 bg-green-300/80 backdrop-blur-sm text-green-600 pr-4 p-1 rounded-full text-xs sm:text-sm shadow-sm hover:shadow-md transition-all duration-300'>
                            <span className='bg-green-600 px-3 py-1 max-sm:ml-1 rounded-full text-white text-xs font-semibold'>NEWS</span> 
                            <span className="font-medium">Free Shipping on Orders Above $50!</span> 
                            <ChevronRightIcon className='group-hover:ml-2 transition-all' size={16} />
                        </div>
                        
                        {/* Main Heading */}
                        <h2 className='text-3xl sm:text-5xl leading-[1.2] my-3 font-bold bg-gradient-to-r from-slate-700 to-[#42A832] bg-clip-text text-transparent max-w-xs sm:max-w-md tracking-tight'>
                            Gadgets you'll love. Prices you'll trust.
                        </h2>
                        
                        {/* Price Info */}
                        <div className='text-slate-800 text-sm font-medium mt-4 sm:mt-8 backdrop-blur-sm bg-white/20 inline-block px-4 py-2 rounded-lg'>
                            <p className="uppercase tracking-wider text-xs opacity-80">Starts from</p>
                            <p className='text-3xl font-bold'>{currency}4.90</p>
                        </div>
                        
                        {/* CTA Button */}
                        <button className='bg-slate-800 text-white text-sm py-2.5 px-7 sm:py-5 sm:px-12 mt-4 sm:mt-10 rounded-md hover:bg-slate-900 hover:scale-103 active:scale-95 transition-all duration-300 shadow-md hover:shadow-lg font-medium tracking-wide'>
                            LEARN MORE
                        </button>
                    </div>
                    
                    {/* Background Pattern */}
                    <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
                        <div className="absolute top-10 right-10 w-40 h-40 rounded-full bg-green-400"></div>
                        <div className="absolute bottom-20 left-10 w-20 h-20 rounded-full bg-green-500"></div>
                    </div>
                    
                    {/* Hero Image */}
                    <Image 
                        className='sm:absolute bottom-0 right-0 md:right-10 w-full sm:max-w-sm object-contain drop-shadow-xl transform group-hover:scale-105 transition-transform duration-500 z-0' 
                        src={assets.hero_model_img} 
                        alt="Featured product" 
                    />
                </div>

                {/* Side Sections */}
                <div className='flex flex-col md:flex-row xl:flex-col gap-5 w-full xl:max-w-sm text-sm text-slate-600'>
                    {/* Best Products Card */}
                    <div className='flex-1 flex items-center justify-between w-full bg-gradient-to-br from-orange-100 to-orange-200 rounded-3xl p-6 px-8 group shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden'>
                        <div className="z-10">
                            <p className='text-3xl font-bold bg-gradient-to-r from-slate-800 to-[#FF8C00] bg-clip-text text-transparent max-w-40'>Best products</p>
                            <p className='flex items-center gap-1 mt-4 font-medium group-hover:text-orange-700 transition-colors duration-300'>
                                View more 
                                <ArrowRightIcon className='group-hover:ml-2 transition-all duration-300' size={18} />
                            </p>
                        </div>
                        
                        {/* Background Pattern */}
                        <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
                            <div className="absolute top-5 right-5 w-20 h-20 rounded-full bg-orange-400"></div>
                        </div>
                        
                        <Image 
                            className='w-35 object-contain drop-shadow-lg transform group-hover:scale-110 transition-transform duration-500 z-0' 
                            src={assets.hero_product_img1} 
                            alt="Best product" 
                        />
                    </div>

                    {/* Discounts Card */}
                    <div className='flex-1 flex items-center justify-between w-full bg-gradient-to-br from-blue-100 to-blue-200 rounded-3xl p-6 px-8 group shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden'>
                        <div className="z-10">
                            <p className='text-3xl font-bold bg-gradient-to-r from-slate-800 to-[#3B82F6] bg-clip-text text-transparent max-w-40'>20% discounts</p>
                            <p className='flex items-center gap-1 mt-4 font-medium group-hover:text-blue-700 transition-colors duration-300'>
                                View more 
                                <ArrowRightIcon className='group-hover:ml-2 transition-all duration-300' size={18} />
                            </p>
                        </div>
                        
                        {/* Background Pattern */}
                        <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
                            <div className="absolute bottom-5 left-5 w-20 h-20 rounded-full bg-blue-400"></div>
                        </div>
                        
                        <Image 
                            className='w-35 object-contain drop-shadow-lg transform group-hover:scale-110 transition-transform duration-500 z-0' 
                            src={assets.hero_product_img2} 
                            alt="Discounted product" 
                        />
                    </div>
                </div>
            </div>
            <CategoriesMarquee />
        </div>
    )
}

export default Hero
