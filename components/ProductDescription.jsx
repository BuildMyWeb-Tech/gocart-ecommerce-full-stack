'use client'

import {
  ArrowRight,
  Star,
  Truck,
  ShieldCheck,
  RefreshCcw,
  MessageCircle,
  Send,
  Camera,
  Package,
  Clock,
  ChevronRight,
  ThumbsUp,
  Globe,
  AlertCircle,
  CheckCircle,
  Award,
  Calendar,StarIcon ,
  Users
} from "lucide-react"

import Image from "next/image"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import toast from "react-hot-toast"

const ProductDescription = ({ product }) => {
  const { isSignedIn, user } = useUser()

  const [selectedTab, setSelectedTab] = useState("Description")
  const [reviews, setReviews] = useState(product.rating || [])
  const [reviewInput, setReviewInput] = useState({ rating: 5, review: "" })
  const [isLoading, setIsLoading] = useState(false)
  const [shippingInfo, setShippingInfo] = useState(null)

  const totalReviews = reviews.length
  const averageRating =
    totalReviews > 0
      ? (reviews.reduce((a, b) => a + b.rating, 0) / totalReviews).toFixed(1)
      : "0.0"
      
  // Function to fetch shipping information from backend
  const fetchShippingInfo = async () => {
    try {
      setIsLoading(true)
      // This would be your API call to fetch shipping info
      // const response = await fetch('/api/shipping-info');
      // const data = await response.json();
      
      // Simulating API response
      setTimeout(() => {
        setShippingInfo({
          deliveryTime: "3-7 business days",
          freeShippingThreshold: 50,
          returnPolicy: "7-day easy return",
          internationalShipping: true,
          shippingMethods: ["Standard", "Express", "Next-day"],
          restrictions: ["Certain remote areas may have extended delivery times"],
          tracking: true
        })
        setIsLoading(false)
      }, 500)
    } catch (error) {
      console.error("Error fetching shipping info:", error)
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (selectedTab === "Shipping" && !shippingInfo) {
      fetchShippingInfo()
    }
  }, [selectedTab])

  /* ---------------- REVIEW SUBMIT ---------------- */
  const handleSubmitReview = async (e) => {
    e.preventDefault()

    if (!isSignedIn) {
      toast.error("Please sign in to submit review")
      return
    }

    if (reviewInput.review.length < 10) {
      toast.error("Minimum 10 characters required")
      return
    }

    try {
      setIsLoading(true)
      
      // Create the review object
      const newReview = {
        productId: product.id,
        rating: reviewInput.rating,
        review: reviewInput.review,
        createdAt: new Date(),
        user: {
          id: user.id,
          name: user.fullName || "User",
          image: user.imageUrl
        }
      }
      
      // This would be your API call to submit the review
      // const response = await fetch('/api/reviews', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(newReview)
      // });
      
      // If successful, update the UI
      // const data = await response.json();
      
      // Simulating successful API response
      setTimeout(() => {
        setReviews([newReview, ...reviews])
        setReviewInput({ rating: 5, review: "" })
        toast.success("Review submitted successfully!")
        setIsLoading(false)
      }, 500)
      
    } catch (error) {
      console.error("Error submitting review:", error)
      toast.error("Failed to submit review. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <div className="my-16 text-sm text-slate-600">
      {/* TABS */}
      <div className="flex border-b border-slate-200 mb-6 overflow-x-auto bg-white rounded-t-xl shadow-sm">
        {["Description", "Reviews", "Shipping"].map(tab => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`px-6 py-4 font-medium whitespace-nowrap transition-all duration-200 ${
              selectedTab === tab
                ? "border-b-2 border-green-600 text-green-700 bg-green-50"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-2">
              {tab === "Description" && <CheckCircle size={16} className={selectedTab === tab ? "text-green-600" : "text-slate-400"} />}
              {tab === "Reviews" && <Star size={16} className={selectedTab === tab ? "text-green-600" : "text-slate-400"} />}
              {tab === "Shipping" && <Truck size={16} className={selectedTab === tab ? "text-green-600" : "text-slate-400"} />}
              
              {tab}
              
              {tab === "Reviews" && (
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                  selectedTab === tab 
                    ? "bg-green-100 text-green-700" 
                    : "bg-slate-100 text-slate-600"
                }`}>
                  {reviews.length}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* DESCRIPTION */}
      {selectedTab === "Description" && (
        <div className="bg-white p-6 md:p-8 rounded-b-xl rounded-tr-xl shadow-sm max-w-4xl transition-all duration-300 animate-fadeIn">
          {/* Product highlights */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg mb-6 border border-green-100">
            <h3 className="text-slate-800 font-semibold mb-3 flex items-center gap-2">
              <Award size={18} className="text-green-600" />
              Product Highlights
            </h3>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {product.shortDescription && product.shortDescription.split('|').map((highlight, index) => (
                <li key={index} className="flex items-start gap-2">
                  <div className="bg-white p-1 rounded-full mt-0.5">
                    <CheckCircle size={14} className="text-green-600" />
                  </div>
                  <span className="text-slate-700">{highlight.trim()}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Main description */}
          <div className="prose prose-slate max-w-none">
            <h3 className="text-slate-800 font-semibold mb-4">Product Description</h3>
            {product.description ? (
              <div className="leading-relaxed space-y-4">
                {product.description.split('\n\n').map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            ) : (
              <div className="bg-slate-50 p-4 rounded-lg text-slate-500 italic">
                No description available for this product.
              </div>
            )}
          </div>

          {/* FEATURES FROM SHOP PANEL */}
          <div className="mt-8 border-t border-slate-100 pt-6">
            <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <CheckCircle size={18} className="text-blue-600" />
              Key Features
            </h4>
            <div className="bg-slate-50 p-5 rounded-lg">
              <ul className="space-y-3">
                {product.keyFeatures ? (
                  product.keyFeatures.split('|').map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="bg-blue-100 p-1 rounded-full mt-0.5">
                        <ChevronRight size={12} className="text-blue-600" />
                      </div>
                      <span className="text-slate-700">{feature.trim()}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-slate-500 italic">Features not specified</li>
                )}
              </ul>
            </div>
          </div>

          {/* Additional product details */}
          {product.additionalInfo && (
            <div className="mt-8 border-t border-slate-100 pt-6">
              <h4 className="font-semibold text-slate-800 mb-4">Additional Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(product.additionalInfo).map(([key, value], index) => (
                  <div key={index} className="bg-slate-50 p-3 rounded-lg">
                    <span className="text-xs text-slate-500 uppercase">{key}</span>
                    <p className="font-medium text-slate-800">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* REVIEWS */}
      {selectedTab === "Reviews" && (
        <div className="bg-white p-6 md:p-8 rounded-b-xl rounded-tr-xl shadow-sm max-w-4xl transition-all duration-300 animate-fadeIn">
          {/* Review summary */}
          <div className="flex flex-col md:flex-row gap-8 mb-8 pb-8 border-b border-slate-100">
            {/* Rating overview */}
            <div className="md:w-1/3 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-50 to-white rounded-xl border border-slate-200">
              <div className="text-5xl font-bold text-slate-800 flex items-center gap-1">
                {averageRating}
                <span className="text-lg text-slate-400">/5</span>
              </div>
              <div className="flex mt-3 mb-1">
                {[1,2,3,4,5].map(i => (
                  <Star
                    key={i}
                    size={20}
                    className="text-amber-400"
                    fill={averageRating >= i ? "#FBBF24" : "#E5E7EB"}
                    strokeWidth={0}
                  />
                ))}
              </div>
              <p className="text-sm text-slate-500">Based on {totalReviews} reviews</p>
              
              {/* Rating distribution */}
              <div className="w-full mt-4 space-y-1">
                {[5,4,3,2,1].map(star => {
                  const count = reviews.filter(r => r.rating === star).length;
                  const percentage = totalReviews ? Math.round((count / totalReviews) * 100) : 0;
                  
                  return (
                    <div key={star} className="flex items-center gap-2">
                      <span className="text-xs w-2">{star}</span>
                      <div className="h-2 flex-1 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            star >= 4 ? "bg-green-500" : 
                            star === 3 ? "bg-amber-500" : 
                            "bg-red-500"
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 w-7">{percentage}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* WRITE REVIEW */}
            <div className="md:w-2/3">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <MessageCircle size={16} className="text-blue-600" />
                Write a Review
              </h3>
              
              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-sm text-slate-600 mr-2">Your rating:</p>
                  {[1,2,3,4,5].map(i => (
                    <Star
                      key={i}
                      size={24}
                      className={`cursor-pointer transition-colors duration-200 ${
                        reviewInput.rating >= i ? "text-amber-400" : "text-slate-300"
                      }`}
                      fill={reviewInput.rating >= i ? "#FBBF24" : "#E5E7EB"}
                      strokeWidth={0}
                      onClick={() => setReviewInput({...reviewInput, rating: i})}
                    />
                  ))}
                </div>

                <div>
                  <label className="text-sm text-slate-600 mb-1.5 block">Your review</label>
                  <textarea
                    className="w-full border border-slate-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    rows={4}
                    placeholder="Share your experience with this product..."
                    value={reviewInput.review}
                    onChange={(e) => setReviewInput({...reviewInput, review: e.target.value})}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Min. 10 characters. Be honest and helpful to other customers.
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <button 
                    type="submit"
                    disabled={isLoading}
                    className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-5 py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-70"
                  >
                    {isLoading ? 'Submitting...' : 'Submit Review'} 
                    <Send size={16}/>
                  </button>
                  
                  {!isSignedIn && (
                    <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
                      <AlertCircle size={14} className="inline mr-1" /> 
                      You need to sign in to submit a review
                    </p>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* CUSTOMER REVIEWS */}
          <div className="space-y-6">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Users size={16} className="text-blue-600" />
              Customer Reviews ({reviews.length})
            </h3>
            
            {reviews.length > 0 ? (
              reviews.map((r, i) => (
                <div key={i} className="border border-slate-200 p-5 rounded-lg hover:shadow-sm transition-all">
                  <div className="flex gap-4">
                    {r.user.image ? (
                      <Image 
                        src={r.user.image} 
                        width={48} 
                        height={48} 
                        className="rounded-full border border-slate-200 object-cover" 
                        alt={r.user.name}
                      />
                    ) : (
                      <div className="size-12 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 font-medium">
                        {r.user.name[0]}
                      </div>
                    )}

                    <div className="flex-1">
                      <div className="flex flex-wrap justify-between mb-2">
                        <div>
                          <p className="font-medium text-slate-800">{r.user.name}</p>
                          <div className="flex items-center gap-2">
                            <div className="flex">
                              {[1,2,3,4,5].map(i => (
                                <Star 
                                  key={i} 
                                  size={14} 
                                  fill={r.rating >= i ? "#FBBF24" : "#E5E7EB"} 
                                  strokeWidth={0}
                                  className="text-amber-400"
                                />
                              ))}
                            </div>
                            <span className="text-xs text-slate-500">
                              {new Date(r.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <button className="text-slate-400 hover:text-green-600 transition-colors p-1">
                            <ThumbsUp size={14} />
                          </button>
                          <span className="text-xs text-slate-500">Helpful</span>
                        </div>
                      </div>
                      
                      <p className="mt-3 text-slate-600">{r.review}</p>
                      
                      {r.images && r.images.length > 0 && (
                        <div className="flex gap-2 mt-3">
                          {r.images.map((img, idx) => (
                            <div key={idx} className="size-16 rounded-md overflow-hidden border border-slate-200">
                              <Image 
                                src={img} 
                                width={64} 
                                height={64} 
                                className="object-cover w-full h-full" 
                                alt="Review image" 
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center bg-slate-50 rounded-lg p-8 text-center">
                <MessageCircle size={40} className="text-slate-300 mb-3" />
                <p className="text-slate-600 mb-2">No reviews yet</p>
                <p className="text-slate-500 text-xs">Be the first to review this product!</p>
              </div>
            )}
          </div>
          
          {reviews.length > 5 && (
            <div className="text-center mt-6">
              <button className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-medium">
                Load more reviews
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* SHIPPING */}
      {selectedTab === "Shipping" && (
        <div className="bg-white p-6 md:p-8 rounded-b-xl rounded-tr-xl shadow-sm max-w-4xl transition-all duration-300 animate-fadeIn">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-10">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mb-3"></div>
              <p className="text-slate-500">Loading shipping information...</p>
            </div>
          ) : shippingInfo ? (
            <div className="space-y-6">
              <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                <Truck size={18} className="text-green-600" />
                Delivery Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Delivery time */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-100 flex gap-4">
                  <div className="bg-white p-2 rounded-full h-min mt-1">
                    <Clock size={20} className="text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-800">Delivery Time</h4>
                    <p className="text-slate-600">{shippingInfo.deliveryTime}</p>
                  </div>
                </div>
                
                {/* Free shipping */}
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-100 flex gap-4">
                  <div className="bg-white p-2 rounded-full h-min mt-1">
                    <Package size={20} className="text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-800">Free Shipping</h4>
                    <p className="text-slate-600">On orders over ₹{shippingInfo.freeShippingThreshold}</p>
                  </div>
                </div>
                
                {/* Return policy */}
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-4 rounded-lg border border-amber-100 flex gap-4">
                  <div className="bg-white p-2 rounded-full h-min mt-1">
                    <RefreshCcw size={20} className="text-amber-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-800">Returns</h4>
                    <p className="text-slate-600">{shippingInfo.returnPolicy}</p>
                  </div>
                </div>
                
                {/* International shipping */}
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-100 flex gap-4">
                  <div className="bg-white p-2 rounded-full h-min mt-1">
                    <Globe size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-800">International</h4>
                    <p className="text-slate-600">
                      {shippingInfo.internationalShipping ? "Available for select countries" : "Not available"}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Shipping methods */}
              <div className="mt-8 border-t border-slate-100 pt-6">
                <h4 className="font-semibold text-slate-800 mb-4">Available Shipping Methods</h4>
                <div className="space-y-3">
                  {shippingInfo.shippingMethods.map((method, idx) => (
                    <div key={idx} className="p-3 border border-slate-200 rounded-lg flex items-center justify-between bg-slate-50">
                      <div className="flex items-center gap-3">
                        <div className="size-4 rounded-full border-2 border-green-500"></div>
                        <span className="font-medium text-slate-700">{method}</span>
                      </div>
                      <span className="text-sm text-slate-500">
                        {method === "Standard" ? "Free" : 
                         method === "Express" ? "+₹10.00" : 
                         method === "Next-day" ? "+₹25.00" : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Shipping restrictions */}
              {shippingInfo.restrictions && shippingInfo.restrictions.length > 0 && (
                <div className="mt-8 border-t border-slate-100 pt-6">
                  <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <AlertCircle size={16} className="text-amber-600" />
                    Shipping Restrictions
                  </h4>
                  <ul className="space-y-2 ml-6 list-disc text-slate-600">
                    {shippingInfo.restrictions.map((restriction, idx) => (
                      <li key={idx}>{restriction}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Tracking information */}
              {shippingInfo.tracking && (
                <div className="bg-blue-50 p-4 rounded-lg mt-8">
                  <div className="flex items-start gap-3">
                    <div className="bg-white p-2 rounded-full mt-1">
                      <ShieldCheck size={18} className="text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-800">Shipment Tracking</h4>
                      <p className="text-slate-600">
                        All shipments include tracking information. You'll receive tracking details via email once your order ships.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-10">
              <AlertCircle size={40} className="text-slate-300 mb-3" />
              <p className="text-slate-600 mb-2">No shipping information available</p>
              <p className="text-slate-500 text-xs">Please check back later</p>
            </div>
          )}
        </div>
      )}


              {/* Store Page */}
              <div className="flex flex-col sm:flex-row gap-4 mt-14 bg-gradient-to-r from-slate-50 to-white p-6 rounded-xl shadow-sm border border-slate-100">
                <Image 
                    src={product.store.logo} 
                    alt={product.store.name} 
                    className="size-16 sm:size-20 rounded-full ring-4 ring-white shadow-md object-cover mx-auto sm:mx-0" 
                    width={100} 
                    height={100} 
                />
                <div className="flex-1 text-center sm:text-left">
                    <h3 className="font-bold text-lg text-slate-800">Product by {product.store.name}</h3>
                    <div className="flex items-center gap-2 mt-1 justify-center sm:justify-start">
                        <div className="flex">
                            {[1, 2, 3, 4, 5].map((_, i) => (
                                <StarIcon 
                                    key={i} 
                                    size={16} 
                                    className='text-yellow-400' 
                                    fill="#FBBF24"
                                    strokeWidth={0} 
                                />
                            ))}
                        </div>
                        <span className="text-sm text-slate-600">98% Positive Ratings</span>
                    </div>
                    <p className="text-sm text-slate-600 my-2">Official Store • {product.store.productsCount || '100+'}  Products • Since {product.store.establishedYear || '2020'}</p>
                    <div className="flex flex-col sm:flex-row gap-3 mt-3 justify-center sm:justify-start">
                        <Link 
                            href={`/shop/${product.store.username}`} 
                            className="inline-flex items-center justify-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors group font-medium"
                        >
                            Visit Store <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                        {/* <Link 
                            href={`/chat/${product.store.username}`} 
                            className="inline-flex items-center justify-center gap-1.5 bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                        >
                            <MessageCircle size={16} /> Contact Seller
                        </Link> */}
                    </div>
                </div>
              </div>
      
    </div>
  )
}

export default ProductDescription
