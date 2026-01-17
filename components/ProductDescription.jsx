'use client'

import {
  ArrowRight,
  Star,
  Truck,
  ShieldCheck,
  RefreshCcw,
  MessageCircle,
  Send,
  Camera
} from "lucide-react"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { useUser } from "@clerk/nextjs"
import toast from "react-hot-toast"

const ProductDescription = ({ product }) => {
  const { isSignedIn, user } = useUser()

  const [selectedTab, setSelectedTab] = useState("Description")
  const [reviews, setReviews] = useState(product.rating || [])
  const [reviewInput, setReviewInput] = useState({ rating: 5, review: "" })

  const totalReviews = reviews.length
  const averageRating =
    totalReviews > 0
      ? (reviews.reduce((a, b) => a + b.rating, 0) / totalReviews).toFixed(1)
      : "0.0"

  /* ---------------- REVIEW SUBMIT ---------------- */
  const handleSubmitReview = (e) => {
    e.preventDefault()

    if (!isSignedIn) {
      toast.error("Please sign in to submit review")
      return
    }

    if (reviewInput.review.length < 10) {
      toast.error("Minimum 10 characters required")
      return
    }

    const newReview = {
      rating: reviewInput.rating,
      review: reviewInput.review,
      createdAt: new Date(),
      user: {
        name: user.fullName || "User",
        image: user.imageUrl
      }
    }

    setReviews([newReview, ...reviews])
    setReviewInput({ rating: 5, review: "" })
    toast.success("Review submitted")
  }

  return (
    <div className="my-16 text-sm text-slate-600">

      {/* TABS */}
      <div className="flex border-b border-slate-200 mb-6 overflow-x-auto">
        {["Description", "Reviews", "Shipping"].map(tab => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`px-5 py-3 font-medium whitespace-nowrap ${
              selectedTab === tab
                ? "border-b-2 border-green-600 text-slate-900"
                : "text-slate-400"
            }`}
          >
            {tab}
            {tab === "Reviews" && (
              <span className="ml-2 bg-green-100 text-green-700 px-2 rounded-full text-xs">
                {reviews.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* DESCRIPTION */}
      {selectedTab === "Description" && (
        <div className="bg-white p-6 rounded-xl shadow-sm max-w-3xl">
          <p className="leading-relaxed">{product.description}</p>

          {/* FEATURES FROM SHOP PANEL */}
          <div className="mt-8">
            <h4 className="font-semibold text-slate-800 mb-4">Key Features</h4>
            <ul className="space-y-2 list-disc pl-6">
              {(product.features || []).slice(0, 5).map((feature, i) => (
                <li key={i}>{feature}</li>
              ))}
            </ul>
          </div>

          {/* CART ACTIONS */}
          {/* <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <button className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700">
              Add to Cart
            </button>

            <Link
              href="/cart"
              className="bg-white border border-slate-300 px-6 py-3 rounded-lg text-center hover:bg-slate-50"
            >
              View Cart
            </Link>
          </div> */}
        </div>
      )}

      {/* REVIEWS */}
      {selectedTab === "Reviews" && (
        <div className="bg-white p-6 rounded-xl shadow-sm max-w-3xl">

          {/* SUMMARY */}
          <div className="mb-6">
            <div className="text-4xl font-bold">{averageRating}</div>
            <div className="flex mt-1">
              {[1,2,3,4,5].map(i => (
                <Star
                  key={i}
                  size={18}
                  fill={averageRating >= i ? "#FBBF24" : "#E5E7EB"}
                  strokeWidth={0}
                />
              ))}
            </div>
            <p className="text-xs mt-1">{totalReviews} reviews</p>
          </div>

          {/* WRITE REVIEW */}
          <form onSubmit={handleSubmitReview} className="mb-8">
            <div className="flex gap-1 mb-3">
              {[1,2,3,4,5].map(i => (
                <Star
                  key={i}
                  size={24}
                  className="cursor-pointer"
                  fill={reviewInput.rating >= i ? "#FBBF24" : "#E5E7EB"}
                  strokeWidth={0}
                  onClick={() => setReviewInput({...reviewInput, rating: i})}
                />
              ))}
            </div>

            <textarea
              className="w-full border rounded-lg p-3"
              rows={4}
              placeholder="Write your review..."
              value={reviewInput.review}
              onChange={(e)=>setReviewInput({...reviewInput, review:e.target.value})}
            />

            <button className="mt-3 flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg">
              Submit Review <Send size={16}/>
            </button>
          </form>

          {/* CUSTOMER REVIEWS */}
          <div className="space-y-6">
            {reviews.map((r, i) => (
              <div key={i} className="border p-4 rounded-lg">
                <div className="flex gap-3">
                  {r.user.image ? (
                    <Image src={r.user.image} width={40} height={40} className="rounded-full" />
                  ) : (
                    <div className="size-10 rounded-full bg-slate-300 flex items-center justify-center">
                      {r.user.name[0]}
                    </div>
                  )}

                  <div>
                    <p className="font-medium">{r.user.name}</p>
                    <div className="flex">
                      {[1,2,3,4,5].map(i => (
                        <Star key={i} size={14} fill={r.rating >= i ? "#FBBF24" : "#E5E7EB"} strokeWidth={0}/>
                      ))}
                    </div>
                    <p className="mt-2">{r.review}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SHIPPING */}
      {selectedTab === "Shipping" && (
        <div className="bg-white p-6 rounded-xl shadow-sm max-w-3xl space-y-4">
          <div className="flex gap-3">
            <Truck className="text-green-600"/>
            <p>Fast delivery within 3–7 business days</p>
          </div>
          <div className="flex gap-3">
            <ShieldCheck className="text-blue-600"/>
            <p>Safe & secure packaging</p>
          </div>
          <div className="flex gap-3">
            <RefreshCcw className="text-orange-600"/>
            <p>7-day easy return policy</p>
          </div>
        </div>
      )}

    </div>
  )
}

export default ProductDescription
