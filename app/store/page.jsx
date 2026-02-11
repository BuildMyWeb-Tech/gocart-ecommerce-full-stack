'use client'
import { dummyStoreDashboardData } from "@/assets/assets"
import Loading from "@/components/Loading"
import { useAuth } from "@clerk/nextjs"
import axios from "axios"
import { 
  IndianRupee , 
  ShoppingBasketIcon, 
  StarIcon, 
  TagsIcon, 
  TrendingUpIcon, 
  RefreshCcwIcon, 
  ArrowUpIcon, 
  UsersIcon, 
  BarChart4Icon,
  ExternalLinkIcon
} from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"

export default function Dashboard() {
    const {getToken} = useAuth()
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₹'
    const router = useRouter()

    const [loading, setLoading] = useState(true)
    const [dashboardData, setDashboardData] = useState({
        totalProducts: 0,
        totalEarnings: 0,
        totalOrders: 0,
        ratings: [],
    })

    const fetchDashboardData = async () => {
        try {
            const token = await getToken()
            const { data } = await axios.get('/api/store/dashboard', {headers: { Authorization: `Bearer ${token}` }})
            setDashboardData(data.dashboardData)
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchDashboardData()
    }, [])

    // Generate random growth percentages for UI enhancement
    const generateGrowth = () => (Math.random() * 15 + 5).toFixed(1);
    
    const dashboardCardsData = [
        { 
            title: 'Total Products', 
            value: dashboardData.totalProducts, 
            icon: ShoppingBasketIcon, 
            growth: generateGrowth(), 
            bgGradient: 'from-blue-50 to-blue-100',
            iconBg: 'bg-blue-100',
            iconColor: 'text-blue-500',
            borderColor: 'border-blue-200'
        },
        { 
            title: 'Total Earnings', 
            value: '₹' + dashboardData.totalEarnings, 
            icon: IndianRupee , 
            growth: generateGrowth(),
            bgGradient: 'from-green-50 to-green-100',
            iconBg: 'bg-green-100',
            iconColor: 'text-green-500',
            borderColor: 'border-green-200'
        },
        { 
            title: 'Total Orders', 
            value: dashboardData.totalOrders, 
            icon: TagsIcon, 
            growth: generateGrowth(),
            bgGradient: 'from-purple-50 to-purple-100',
            iconBg: 'bg-purple-100',
            iconColor: 'text-purple-500',
            borderColor: 'border-purple-200'
        },
        { 
            title: 'Total Ratings', 
            value: dashboardData.ratings.length, 
            icon: StarIcon, 
            growth: generateGrowth(),
            bgGradient: 'from-amber-50 to-amber-100',
            iconBg: 'bg-amber-100',
            iconColor: 'text-amber-500',
            borderColor: 'border-amber-200'
        },
    ]

    if (loading) return <Loading />

    return (
        <div className="text-slate-600 mb-28">
            {/* Dashboard Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl">
                        Seller <span className="text-slate-800 font-bold">Dashboard</span>
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Overview of your store performance and customer feedback
                    </p>
                </div>
                <button 
                    onClick={fetchDashboardData}
                    className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg text-slate-700 text-sm transition-all"
                >
                    <RefreshCcwIcon size={14} />
                    Refresh
                </button>
            </div>

            {/* Dashboard Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 my-10">
                {dashboardCardsData.map((card, index) => (
                    <div 
                        key={index} 
                        className={`border rounded-xl overflow-hidden shadow-sm bg-gradient-to-br ${card.bgGradient} ${card.borderColor}`}
                    >
                        <div className="flex items-center gap-4 p-5">
                            <div className={`rounded-lg ${card.iconBg} p-3 flex-shrink-0`}>
                                <card.icon size={24} className={card.iconColor} />
                            </div>
                            <div>
                                <p className="text-slate-600 text-sm font-medium">{card.title}</p>
                                <h3 className="text-slate-800 text-2xl font-bold mt-1">{card.value}</h3>
                            </div>
                        </div>
                        
                    </div>
                ))}
            </div>

            {/* Analytics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
                <div className="md:col-span-2 bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-5">
                        <h3 className="font-medium text-slate-800">Sales Overview</h3>
                        <select className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white">
                            <option>Last 7 days</option>
                            <option>Last 30 days</option>
                            <option>Last quarter</option>
                        </select>
                    </div>
                    <div className="h-60 flex items-center justify-center bg-slate-50 rounded-lg border border-slate-100 relative">
                        {/* Placeholder for chart */}
                        <BarChart4Icon size={100} className="text-slate-200" />
                        <p className="absolute text-xs text-slate-400">Sales chart will appear here</p>
                    </div>
                </div>
                
                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                    <h3 className="font-medium text-slate-800 mb-5">Customer Insights</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-100 rounded-lg p-2">
                                    <UsersIcon size={18} className="text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-700">Total Customers</p>
                                    <p className="text-xs text-slate-500">All time</p>
                                </div>
                            </div>
                            <p className="text-xl font-bold text-slate-800">{(dashboardData.totalOrders * 0.7).toFixed(0)}</p>
                        </div>
                        
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="bg-green-100 rounded-lg p-2">
                                    <TrendingUpIcon size={18} className="text-green-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-700">Conversion Rate</p>
                                    <p className="text-xs text-slate-500">Last 30 days</p>
                                </div>
                            </div>
                            <p className="text-xl font-bold text-slate-800">3.8%</p>
                        </div>
                        
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="bg-amber-100 rounded-lg p-2">
                                    <StarIcon size={18} className="text-amber-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-700">Avg. Rating</p>
                                    <p className="text-xs text-slate-500">All products</p>
                                </div>
                            </div>
                            <p className="text-xl font-bold text-slate-800">4.7</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Customer Reviews Section */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex justify-between items-center p-5 border-b border-slate-100">
                    <h2 className="text-lg font-semibold text-slate-800">
                        Recent Customer Reviews
                    </h2>
                    <span className="bg-green-100 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full">
                        {dashboardData.ratings.length} total
                    </span>
                </div>

                <div className="divide-y divide-slate-100">
                    {dashboardData.ratings.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="bg-slate-100 p-4 rounded-full mb-3">
                                <StarIcon size={24} className="text-slate-400" />
                            </div>
                            <h3 className="text-slate-700 font-medium mb-1">No reviews yet</h3>
                            <p className="text-slate-500 text-sm max-w-md">
                                When customers leave reviews for your products, they'll appear here
                            </p>
                        </div>
                    ) : (
                        dashboardData.ratings.map((review, index) => (
                            <div key={index} className="p-5 hover:bg-slate-50 transition-colors">
                                <div className="flex max-sm:flex-col gap-5 sm:items-start justify-between text-sm text-slate-600 max-w-4xl">
                                    <div className="flex-1">
                                        <div className="flex gap-3 items-center">
                                            <div className="relative">
                                                <Image 
                                                    src={review.user.image} 
                                                    alt={review.user.name || "User"} 
                                                    className="w-10 h-10 rounded-full object-cover border border-slate-200" 
                                                    width={100} 
                                                    height={100} 
                                                />
                                                {/* Verification badge */}
                                                <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5 border-2 border-white">
                                                    <CheckCircleIcon size={12} className="text-white" />
                                                </div>
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-800">{review.user.name}</p>
                                                <p className="text-xs text-slate-500">{new Date(review.createdAt).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center mt-2 mb-3">
                                            {Array(5).fill('').map((_, index) => (
                                                <StarIcon 
                                                    key={index} 
                                                    size={16} 
                                                    className='text-transparent' 
                                                    fill={review.rating >= index + 1 ? "#FBBF24" : "#D1D5DB"} 
                                                />
                                            ))}
                                        </div>
                                        <p className="text-slate-700 leading-relaxed">{review.review}</p>
                                    </div>
                                    
                                    <div className="sm:ml-4 sm:w-60 flex-shrink-0 sm:border-l sm:border-slate-200 sm:pl-4 mt-4 sm:mt-0">
                                        <div className="flex flex-col h-full justify-between">
                                            <div>
                                                <div className="inline-block bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full mb-2">
                                                    {review.product?.category || "Uncategorized"}
                                                </div>
                                                <p className="font-medium text-slate-800">{review.product?.name}</p>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    Product ID: {review.product?.id?.substring(0, 8) || "N/A"}
                                                </p>
                                            </div>
                                            
                                            <button 
                                                onClick={() => router.push(`/product/${review.product.id}`)} 
                                                className="mt-4 flex items-center justify-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-4 py-2 rounded-lg transition-all w-full"
                                            >
                                                View Product
                                                <ExternalLinkIcon size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
