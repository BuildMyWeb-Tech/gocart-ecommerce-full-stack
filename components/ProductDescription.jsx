'use client'
import { ArrowRight, StarIcon, ThumbsUp, ThumbsDown, MessageCircleIcon, BadgeCheckIcon } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"

const ProductDescription = ({ product }) => {
    const [selectedTab, setSelectedTab] = useState('Description')
    const [helpfulCount, setHelpfulCount] = useState({}) // Track helpful votes

    // Calculate the review statistics
    const totalReviews = product.rating.length
    const averageRating = product.rating.reduce((acc, item) => acc + item.rating, 0) / totalReviews
    
    // Breakdown of star ratings
    const ratingCounts = [0, 0, 0, 0, 0]
    product.rating.forEach(item => {
        ratingCounts[Math.floor(item.rating) - 1]++
    })
    
    const ratingPercentages = ratingCounts.map(count => (count / totalReviews) * 100)
    
    return (
        <div className="my-18 text-sm text-slate-600">
            {/* Tabs */}
            <div className="flex border-b border-slate-200 mb-6 max-w-2xl">
                {['Description', 'Reviews', 'Shipping'].map((tab, index) => (
                    <button 
                        className={`${tab === selectedTab ? 'border-b-[1.5px] border-green-500 text-slate-800 font-semibold' : 'text-slate-400'} px-5 py-3 font-medium transition-colors duration-200 hover:text-slate-600`} 
                        key={index} 
                        onClick={() => setSelectedTab(tab)}
                    >
                        {tab}
                        {tab === 'Reviews' && (
                            <span className="ml-2 bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">
                                {product.rating.length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Description */}
            {selectedTab === "Description" && (
                <div className="max-w-xl bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Product Details</h3>
                    <p className="leading-relaxed">{product.description}</p>
                    
                    {/* Features list - Add more product information */}
                    <h4 className="font-medium text-slate-700 mt-6 mb-2">Key Features</h4>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Premium quality materials</li>
                        <li>Durable construction for long-term use</li>
                        <li>Modern design that complements any style</li>
                        <li>Easy to clean and maintain</li>
                        <li>Environmentally friendly production</li>
                    </ul>
                    
                    {/* Specifications table */}
                    <h4 className="font-medium text-slate-700 mt-6 mb-2">Specifications</h4>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-50 p-2 rounded">
                            <span className="text-xs text-slate-500">Material</span>
                            <p className="text-sm font-medium text-slate-700">Premium</p>
                        </div>
                        <div className="bg-slate-50 p-2 rounded">
                            <span className="text-xs text-slate-500">Weight</span>
                            <p className="text-sm font-medium text-slate-700">0.5 kg</p>
                        </div>
                        <div className="bg-slate-50 p-2 rounded">
                            <span className="text-xs text-slate-500">Warranty</span>
                            <p className="text-sm font-medium text-slate-700">1 Year</p>
                        </div>
                        <div className="bg-slate-50 p-2 rounded">
                            <span className="text-xs text-slate-500">Made in</span>
                            <p className="text-sm font-medium text-slate-700">USA</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Reviews */}
            {selectedTab === "Reviews" && (
                <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-100">
                    {/* Review Summary */}
                    <div className="flex flex-col md:flex-row gap-8 mb-10 pb-8 border-b border-slate-200">
                        <div className="text-center bg-gradient-to-br from-slate-50 to-green-50 p-6 rounded-xl shadow-sm border border-green-100/30">
                            <div className="text-5xl font-bold text-slate-800">{averageRating.toFixed(1)}</div>
                            <div className='flex items-center justify-center my-3'>
                                {Array(5).fill('').map((_, index) => (
                                    <StarIcon 
                                        key={index} 
                                        size={18} 
                                        className='text-transparent' 
                                        fill={averageRating >= index + 1 ? "#16A34A" : "#D1D5DB"} 
                                        strokeWidth={0}
                                    />
                                ))}
                            </div>
                            <p className="text-sm text-slate-600">Based on {totalReviews} reviews</p>
                        </div>
                        
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 hidden md:block">Rating Breakdown</h3>
                            {/* Rating Bars */}
                            <div className="space-y-3">
                                {[5, 4, 3, 2, 1].map((star) => (
                                    <div key={star} className="flex items-center gap-3">
                                        <div className="text-sm font-medium w-6 text-slate-700">{star}</div>
                                        <StarIcon size={16} className="text-yellow-500" fill="#F59E0B" strokeWidth={0} />
                                        <div className="flex-1 bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full ${
                                                    star >= 4 ? 'bg-green-500' : 
                                                    star >= 3 ? 'bg-blue-500' : 
                                                    star >= 2 ? 'bg-amber-500' : 'bg-red-500'
                                                }`} 
                                                style={{width: `${ratingPercentages[star-1]}%`}}
                                            ></div>
                                        </div>
                                        <div className="text-xs font-medium text-slate-600 w-16">
                                            {ratingCounts[star-1]} ({Math.round(ratingPercentages[star-1])}%)
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Review Form */}
                    <div className="mb-12 bg-gradient-to-r from-green-50 to-slate-50 p-6 rounded-xl border border-green-100/30 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-green-100/50 rounded-full -mr-16 -mt-16 z-0"></div>
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-slate-100/50 rounded-full -ml-12 -mb-12 z-0"></div>
                        
                        <div className="relative z-10">
                            <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center">
                                <StarIcon className="h-5 w-5 mr-2 text-green-600" fill="#16A34A" strokeWidth={0} />
                                Write a Review
                            </h3>
                            
                            <form className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Your Rating*</label>
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                type="button"
                                                key={star}
                                                className="text-2xl focus:outline-none transition-transform hover:scale-110"
                                            >
                                                <StarIcon 
                                                    size={28} 
                                                    className="text-transparent cursor-pointer" 
                                                    fill={"#D1D5DB"} 
                                                    strokeWidth={0}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">Click to rate</p>
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div>
                                        <label htmlFor="review-name" className="block text-sm font-medium text-slate-700 mb-2">Your Name*</label>
                                        <input
                                            type="text"
                                            id="review-name"
                                            placeholder="Enter your name"
                                            className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-shadow"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="review-email" className="block text-sm font-medium text-slate-700 mb-2">Email* (not published)</label>
                                        <input
                                            type="email"
                                            id="review-email"
                                            placeholder="Enter your email"
                                            className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-shadow"
                                        />
                                    </div>
                                </div>
                                
                                <div>
                                    <label htmlFor="review-content" className="block text-sm font-medium text-slate-700 mb-2">Your Review*</label>
                                    <textarea
                                        id="review-content"
                                        rows={4}
                                        placeholder="Share your experience with this product..."
                                        className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-shadow resize-none"
                                    ></textarea>
                                </div>
                                
                                <div className="flex items-center">
                                    <input type="file" id="review-image" className="hidden" accept="image/*" />
                                    <label htmlFor="review-image" className="cursor-pointer text-sm text-green-600 bg-green-50 hover:bg-green-100 border border-green-200 px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center mr-4">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        Add Photo
                                    </label>
                                    <p className="text-xs text-slate-500">(Optional) Share images of your product</p>
                                </div>
                                
                                <button 
                                    type="submit"
                                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium px-6 py-3 rounded-lg transition-colors duration-200 flex items-center shadow-sm"
                                >
                                    Submit Review
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Reviews List */}
                    <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                        </svg>
                        Customer Reviews
                    </h3>
                    <div className="flex flex-col gap-6">
                        {product.rating.map((item, index) => (
                            <div key={index} className="p-5 rounded-xl border border-slate-200 hover:border-green-200 transition-colors duration-200 hover:shadow-sm bg-white">
                                <div className="flex gap-5">
                                    {/* User avatar - either image or initials */}
                                    {item.user.image ? (
                                        <Image 
                                            src={item.user.image} 
                                            alt={item.user.name} 
                                            className="size-14 rounded-full object-cover border-2 border-white shadow-md" 
                                            width={100} 
                                            height={100} 
                                        />
                                    ) : (
                                        <div className="size-14 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-bold text-xl border-2 border-white shadow-md">
                                            {item.user.name.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <div className="flex justify-between flex-wrap gap-2">
                                            <div>
                                                <p className="font-bold text-slate-800 flex items-center flex-wrap">
                                                    {item.user.name}
                                                    {item.rating >= 4 && (
                                                        <span className="ml-2 flex items-center text-green-600 bg-green-50 px-2.5 py-0.5 rounded-full text-xs border border-green-100 whitespace-nowrap">
                                                            <BadgeCheckIcon size={12} className="mr-1" /> Verified Buyer
                                                        </span>
                                                    )}
                                                </p>
                                                <p className="text-xs text-slate-500 mt-1">{new Date(item.createdAt).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'long', 
                                                    day: 'numeric'
                                                })}</p>
                                            </div>
                                            <div className="flex items-center bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                                {Array(5).fill('').map((_, idx) => (
                                                    <StarIcon 
                                                        key={idx} 
                                                        size={16} 
                                                        className='text-transparent mx-0.5' 
                                                        fill={item.rating >= idx + 1 ? "#16A34A" : "#D1D5DB"} 
                                                        strokeWidth={0}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        
                                        <p className="my-4 text-slate-700 leading-relaxed">{item.review}</p>
                                        
                                        {/* Review images if any */}
                                        {item.images && item.images.length > 0 && (
                                            <div className="flex gap-2 mb-4 flex-wrap">
                                                {item.images.map((image, imgIdx) => (
                                                    <div key={imgIdx} className="relative w-16 h-16 rounded-md overflow-hidden border border-slate-200">
                                                        <Image 
                                                            src={image} 
                                                            alt={`Review image ${imgIdx+1}`} 
                                                            className="object-cover h-full w-full" 
                                                            width={64} 
                                                            height={64}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        
                                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 flex-wrap gap-4">
                                            <div className="flex gap-4 flex-wrap">
                                                <button 
                                                    className={`flex items-center gap-1.5 text-xs ${helpfulCount[index] === 'up' ? 'text-green-600 bg-green-50 px-2.5 py-1.5 rounded-full border border-green-100' : 'text-slate-500 hover:bg-slate-50 px-2.5 py-1.5 rounded-full'} transition-colors`}
                                                    onClick={() => setHelpfulCount({...helpfulCount, [index]: 'up'})}
                                                >
                                                    <ThumbsUp size={14} /> Helpful ({helpfulCount[index] === 'up' ? 1 : 0})
                                                </button>
                                                <button 
                                                    className={`flex items-center gap-1.5 text-xs ${helpfulCount[index] === 'down' ? 'text-red-600 bg-red-50 px-2.5 py-1.5 rounded-full border border-red-100' : 'text-slate-500 hover:bg-slate-50 px-2.5 py-1.5 rounded-full'} transition-colors`}
                                                    onClick={() => setHelpfulCount({...helpfulCount, [index]: 'down'})}
                                                >
                                                    <ThumbsDown size={14} /> Not helpful
                                                </button>
                                            </div>
                                            <button className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-green-600 transition-colors hover:bg-slate-50 px-2.5 py-1.5 rounded-full">
                                                <MessageCircleIcon size={14} /> Reply
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {/* Pagination if needed */}
                    {product.rating.length > 5 && (
                        <div className="flex justify-center mt-8">
                            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                                <button className="px-4 py-2 border-r border-slate-200 text-slate-500 hover:bg-slate-50">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </button>
                                <button className="px-4 py-2 border-r border-slate-200 bg-green-50 text-green-600 font-medium">1</button>
                                <button className="px-4 py-2 border-r border-slate-200 text-slate-700 hover:bg-slate-50">2</button>
                                <button className="px-4 py-2 border-r border-slate-200 text-slate-700 hover:bg-slate-50">3</button>
                                <button className="px-4 py-2 text-slate-500 hover:bg-slate-50">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}


            {/* Shipping Tab - New */}
            {selectedTab === "Shipping" && (
                <div className="max-w-xl bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Shipping Information</h3>
                    
                    <div className="space-y-6">
                        <div>
                            <h4 className="font-medium text-slate-700 mb-2">Delivery Options</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="border border-slate-200 p-3 rounded-lg hover:border-green-500 transition-colors">
                                    <p className="font-medium text-slate-700">Standard Shipping</p>
                                    <p className="text-xs text-slate-500 mt-1">3-5 business days</p>
                                    <p className="text-sm font-medium text-green-600 mt-2">FREE</p>
                                </div>
                                <div className="border border-slate-200 p-3 rounded-lg hover:border-green-500 transition-colors">
                                    <p className="font-medium text-slate-700">Express Shipping</p>
                                    <p className="text-xs text-slate-500 mt-1">1-2 business days</p>
                                    <p className="text-sm font-medium text-slate-700 mt-2">$9.99</p>
                                </div>
                            </div>
                        </div>
                        
                        <div>
                            <h4 className="font-medium text-slate-700 mb-2">Return Policy</h4>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                We offer a 30-day return policy on most items. To be eligible for a return, your item must be unused and in the same condition that you received it. It must also be in the original packaging.
                            </p>
                        </div>
                        
                        <div>
                            <h4 className="font-medium text-slate-700 mb-2">International Shipping</h4>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                We ship to over 100 countries worldwide. International shipping times may vary depending on location and customs processing.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Store Page */}
            <div className="flex gap-3 mt-14 bg-slate-50 p-4 rounded-lg shadow-sm">
                <Image 
                    src={product.store.logo} 
                    alt={product.store.name} 
                    className="size-14 rounded-full ring-2 ring-white shadow-md" 
                    width={100} 
                    height={100} 
                />
                <div className="flex flex-col justify-center">
                    <p className="font-semibold text-slate-700">Product by {product.store.name}</p>
                    <p className="text-xs text-slate-500 mb-1">Official Store • 98% Positive Ratings</p>
                    <Link 
                        href={`/shop/${product.store.username}`} 
                        className="flex items-center gap-1.5 text-green-600 font-medium hover:text-green-700 transition-colors group text-sm"
                    >
                        view store <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default ProductDescription
