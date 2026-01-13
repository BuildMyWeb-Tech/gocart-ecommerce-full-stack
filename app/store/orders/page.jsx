'use client'
import { useEffect, useState } from "react"
import Loading from "@/components/Loading"
import { orderDummyData } from "@/assets/assets"
import { useAuth } from "@clerk/nextjs"
import axios from "axios"
import toast from "react-hot-toast"
import Image from "next/image"
import { EyeIcon, Trash2Icon, AlertCircleIcon, PackageIcon, TruckIcon, CheckCircleIcon, ClipboardListIcon, DownloadIcon, RefreshCwIcon, FileTextIcon } from "lucide-react"

export default function StoreOrders() {
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedOrder, setSelectedOrder] = useState(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
    const [orderToDelete, setOrderToDelete] = useState(null)
    const [filterValue, setFilterValue] = useState("all")

    const { getToken } = useAuth()

    const fetchOrders = async () => {
       try {
        const token = await getToken()
        const { data } = await axios.get('/api/store/orders', {headers: { Authorization: `Bearer ${token}` }})
        setOrders(data.orders)
       } catch (error) {
        toast.error(error?.response?.data?.error || error.message)
       }finally{
        setLoading(false)
       }
    }

    const updateOrderStatus = async (orderId, status) => {
        try {
            const token = await getToken()
            await axios.post('/api/store/orders',{orderId, status}, {headers: { Authorization: `Bearer ${token}` }})
            setOrders(prev =>
                prev.map(order => 
                    order.id === orderId ? {...order, status} : order
                )
            )
            toast.success('Order status updated!')
       } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
       }
    }

    const openModal = (order) => {
        setSelectedOrder(order)
        setIsModalOpen(true)
    }

    const closeModal = () => {
        setSelectedOrder(null)
        setIsModalOpen(false)
    }
    
    const openDeleteConfirm = (e, order) => {
        e.stopPropagation()
        setOrderToDelete(order)
        setIsDeleteConfirmOpen(true)
    }
    
    const closeDeleteConfirm = () => {
        setOrderToDelete(null)
        setIsDeleteConfirmOpen(false)
    }
    
    const handleDeleteOrder = async () => {
        try {
            // Replace with actual delete API call
            // const token = await getToken()
            // await axios.delete(`/api/store/orders/${orderToDelete.id}`, {headers: { Authorization: `Bearer ${token}` }})
            
            // Mock deletion for now
            setOrders(prev => prev.filter(order => order.id !== orderToDelete.id))
            toast.success('Order deleted successfully')
            closeDeleteConfirm()
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
    }

    const exportOrders = () => {
        // Placeholder for export functionality
        toast.success('Exporting orders to Excel...')
        // Implementation would convert orders to Excel format and download
    }

    const printInvoice = (order) => {
        // Placeholder for invoice printing
        toast.success('Generating invoice for printing...')
        // Implementation would generate and print/download invoice
    }
    
    // Status badge styles and icons
    const getStatusBadge = (status) => {
        const statusConfig = {
            'ORDER_PLACED': {
                color: 'bg-blue-100 text-blue-700',
                icon: <ClipboardListIcon size={14} className="mr-1" />,
                text: 'Order Placed'
            },
            'PROCESSING': {
                color: 'bg-yellow-100 text-yellow-700',
                icon: <PackageIcon size={14} className="mr-1" />,
                text: 'Processing'
            },
            'SHIPPED': {
                color: 'bg-indigo-100 text-indigo-700',
                icon: <TruckIcon size={14} className="mr-1" />,
                text: 'Shipped'
            },
            'DELIVERED': {
                color: 'bg-green-100 text-green-700',
                icon: <CheckCircleIcon size={14} className="mr-1" />,
                text: 'Delivered'
            }
        }
        
        const config = statusConfig[status] || statusConfig['ORDER_PLACED']
        return (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
                {config.icon} {config.text}
            </span>
        )
    }

    useEffect(() => {
        fetchOrders()
    }, [])

    if (loading) return <Loading />

    // Filter orders based on selected filter
    const filteredOrders = filterValue === "all" 
        ? orders
        : filterValue === "recent" 
            ? orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10)
            : filterValue === "pending" 
                ? orders.filter(order => order.status !== "DELIVERED")
                : orders.filter(order => order.status === "DELIVERED");

    return (
        <>
            <div className="mb-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <h1 className="text-2xl md:text-3xl text-slate-800 font-bold flex items-center">
                        <PackageIcon className="mr-3 h-7 w-7 text-blue-600" />
                        Order Management
                    </h1>
                    
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <select 
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none shadow-sm"
                            value={filterValue}
                            onChange={e => setFilterValue(e.target.value)}
                        >
                            <option value="all">All Orders</option>
                            <option value="recent">Recent Orders</option>
                            <option value="pending">Pending Orders</option>
                            <option value="completed">Completed Orders</option>
                        </select>
                        
                        <button 
                            onClick={exportOrders}
                            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg text-sm hover:from-blue-700 hover:to-blue-800 transition shadow-sm flex items-center justify-center"
                        >
                            <DownloadIcon size={16} className="mr-2" />
                            Export Orders
                        </button>
                    </div>
                </div>

                {/* Stats overview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Total Orders</p>
                                <h3 className="text-2xl font-bold text-gray-800 mt-1">{orders.length}</h3>
                            </div>
                            <div className="bg-blue-100 p-3 rounded-full">
                                <ClipboardListIcon className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Pending</p>
                                <h3 className="text-2xl font-bold text-gray-800 mt-1">
                                    {orders.filter(o => o.status !== "DELIVERED").length}
                                </h3>
                            </div>
                            <div className="bg-yellow-100 p-3 rounded-full">
                                <TruckIcon className="h-6 w-6 text-yellow-600" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Completed</p>
                                <h3 className="text-2xl font-bold text-gray-800 mt-1">
                                    {orders.filter(o => o.status === "DELIVERED").length}
                                </h3>
                            </div>
                            <div className="bg-green-100 p-3 rounded-full">
                                <CheckCircleIcon className="h-6 w-6 text-green-600" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Revenue</p>
                                <h3 className="text-2xl font-bold text-gray-800 mt-1">
                                    ${orders.reduce((acc, order) => acc + order.total, 0).toLocaleString()}
                                </h3>
                            </div>
                            <div className="bg-purple-100 p-3 rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {filteredOrders.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-10 text-center border border-gray-100">
                    <div className="flex justify-center mb-6">
                        <div className="bg-slate-100 p-6 rounded-full">
                            <PackageIcon size={50} className="text-slate-400" />
                        </div>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-3">No orders found</h3>
                    <p className="text-slate-500 max-w-md mx-auto mb-6">You haven't received any orders that match your current filter. Orders will appear here when customers make purchases.</p>
                    <button 
                        onClick={fetchOrders}
                        className="inline-flex items-center px-5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg font-medium transition"
                    >
                        <RefreshCwIcon size={16} className="mr-2" />
                        Refresh Orders
                    </button>
                </div>
            ) : (
                <div className="overflow-hidden bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-600">
                            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 text-xs uppercase tracking-wider border-b border-gray-200">
                                <tr>
                                    {["Sr. No.", "Product", "Customer", "Date", "Total", "Payment", "Coupon", "Status", "Actions"].map((heading, i) => (
                                        <th key={i} className="px-4 py-3">{heading}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredOrders.map((order, index) => (
                                    <tr
                                        key={order.id}
                                        className="hover:bg-blue-50/30 transition-colors duration-150"
                                    >
                                        <td className="pl-6 pr-2 py-4 text-blue-600 font-medium">
                                            {index + 1}
                                        </td>
                                        
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                {order.orderItems && order.orderItems[0]?.product?.images && (
                                                    <div className="h-10 w-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                                                        <Image 
                                                            src={order.orderItems[0].product.images[0]} 
                                                            alt={order.orderItems[0].product.name || "Product"} 
                                                            width={40} 
                                                            height={40}
                                                            className="object-cover h-full w-full"
                                                        />
                                                    </div>
                                                )}
                                                <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                                    {order.orderItems?.length || 0} item{order.orderItems?.length !== 1 ? 's' : ''}
                                                </span>
                                            </div>
                                        </td>
                                        
                                        <td className="px-4 py-3 font-medium text-slate-700">
                                            {order.user?.name || "Unknown Customer"}
                                        </td>
                                        
                                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                                            {new Date(order.createdAt).toLocaleDateString('en-US', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        </td>
                                        
                                        <td className="px-4 py-3 font-medium text-slate-800">${order.total.toLocaleString()}</td>
                                        
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                order.paymentMethod === 'STRIPE' 
                                                    ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                                                    : 'bg-orange-100 text-orange-700 border border-orange-200'
                                            }`}>
                                                {order.paymentMethod}
                                            </span>
                                        </td>
                                        
                                        <td className="px-4 py-3">
                                            {order.isCouponUsed ? (
                                                <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full border border-green-200">
                                                    {order.coupon?.code}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 text-xs">—</span>
                                            )}
                                        </td>
                                        
                                        <td className="px-4 py-3" onClick={(e) => { e.stopPropagation() }}>
                                            <div className="relative inline-block w-full">
                                                <select
                                                    value={order.status}
                                                    onChange={e => updateOrderStatus(order.id, e.target.value)}
                                                    className="appearance-none w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 cursor-pointer shadow-sm"
                                                >
                                                    <option value="ORDER_PLACED">ORDER_PLACED</option>
                                                    <option value="PROCESSING">PROCESSING</option>
                                                    <option value="SHIPPED">SHIPPED</option>
                                                    <option value="DELIVERED">DELIVERED</option>
                                                </select>
                                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </td>
                                        
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={() => openModal(order)} 
                                                    className="p-2 bg-blue-50 rounded-lg text-blue-600 hover:bg-blue-100 transition border border-blue-200"
                                                    title="View order details"
                                                >
                                                    <EyeIcon size={16} />
                                                </button>
                                                <button 
                                                    onClick={(e) => openDeleteConfirm(e, order)} 
                                                    className="p-2 bg-red-50 rounded-lg text-red-600 hover:bg-red-100 transition border border-red-200"
                                                    title="Delete order"
                                                >
                                                    <Trash2Icon size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Order Detail Modal */}
            {isModalOpen && selectedOrder && (
                <div onClick={closeModal} className="fixed inset-0 flex items-center justify-center bg-black/50 text-slate-700 text-sm backdrop-blur-sm z-50 p-4" >
                    <div onClick={e => e.stopPropagation()} className="bg-white rounded-xl shadow-xl max-w-3xl w-full relative overflow-y-auto max-h-[90vh] mx-4">
                        {/* Modal header with gradient */}
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-6 px-6 rounded-t-xl">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold flex items-center">
                                    <FileTextIcon className="h-5 w-5 mr-2" /> 
                                    Order #{selectedOrder.id.slice(0, 8)}
                                </h2>
                                <button 
                                    onClick={closeModal} 
                                    className="bg-white/20 p-1.5 rounded-full hover:bg-white/30 transition"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="mt-2 flex items-center">
                                {getStatusBadge(selectedOrder.status)}
                                <span className="text-xs text-white/70 ml-3">
                                    Placed on {new Date(selectedOrder.createdAt).toLocaleDateString('en-US', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric'
                                    })}
                                </span>
                            </div>
                        </div>
                        
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                {/* Customer Details */}
                                <div className="bg-gradient-to-br from-slate-50 to-white p-5 rounded-xl border border-slate-200">
                                    <h3 className="font-semibold text-slate-800 mb-3 flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        Customer Details
                                    </h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex">
                                            <span className="text-slate-500 w-20">Name:</span> 
                                            <span className="font-medium text-slate-800">{selectedOrder.user?.name || "N/A"}</span>
                                        </div>
                                        <div className="flex">
                                            <span className="text-slate-500 w-20">Email:</span> 
                                            <span className="font-medium text-slate-800">{selectedOrder.user?.email || "N/A"}</span>
                                        </div>
                                        <div className="flex">
                                            <span className="text-slate-500 w-20">Phone:</span> 
                                            <span className="font-medium text-slate-800">{selectedOrder.address?.phone || "N/A"}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-6">
                                        <h3 className="font-semibold text-slate-800 mb-3 flex items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            Shipping Address
                                        </h3>
                                        <div className="p-3 bg-white rounded-lg border border-slate-200 text-sm">
                                            {selectedOrder.address?.street && (
                                                <>
                                                    {selectedOrder.address.street}, {selectedOrder.address.city}, {selectedOrder.address.state}, {selectedOrder.address.zip}, {selectedOrder.address.country}
                                                </>
                                            ) || "N/A"}
                                        </div>
                                    </div>
                                </div>

                                {/* Payment Details */}
                                <div className="bg-gradient-to-br from-slate-50 to-white p-5 rounded-xl border border-slate-200">
                                    <h3 className="font-semibold text-slate-800 mb-3 flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                        </svg>
                                        Payment Details
                                    </h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex">
                                            <span className="text-slate-500 w-20">Method:</span> 
                                            <span className={`font-medium px-2 py-0.5 rounded text-xs ${
                                                selectedOrder.paymentMethod === 'STRIPE' 
                                                    ? 'bg-purple-100 text-purple-700' 
                                                    : 'bg-orange-100 text-orange-700'
                                            }`}>{selectedOrder.paymentMethod}</span>
                                        </div>
                                        <div className="flex">
                                            <span className="text-slate-500 w-20">Status:</span> 
                                            <span className={`font-medium px-2 py-0.5 rounded text-xs ${
                                                selectedOrder.isPaid 
                                                    ? 'bg-green-100 text-green-700' 
                                                    : 'bg-red-100 text-red-700'
                                            }`}>{selectedOrder.isPaid ? "Paid" : "Unpaid"}</span>
                                        </div>
                                        {selectedOrder.isCouponUsed && (
                                            <div className="flex">
                                                <span className="text-slate-500 w-20">Coupon:</span> 
                                                <span className="font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded text-xs">
                                                    {selectedOrder.coupon.code} ({selectedOrder.coupon.discount}% off)
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="mt-6">
                                        <h3 className="font-semibold text-slate-800 mb-3 flex items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Order Timeline
                                        </h3>
                                        <div className="space-y-3">
                                            <div className="flex items-center">
                                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                                                    <ClipboardListIcon className="h-4 w-4 text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-500">Ordered</p>
                                                    <p className="text-sm font-medium">
                                                        {new Date(selectedOrder.createdAt).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center">
                                                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
                                                    <RefreshCwIcon className="h-4 w-4 text-indigo-600" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-500">Last Update</p>
                                                    <p className="text-sm font-medium">
                                                        {new Date(selectedOrder.updatedAt || selectedOrder.createdAt).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Products */}
                            <div className="mt-6">
                                <h3 className="font-semibold text-slate-800 mb-4 flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                    </svg>
                                    Order Items
                                </h3>
                                <div className="bg-white rounded-xl overflow-hidden border border-slate-200">
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-slate-200">
                                            <thead className="bg-slate-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Product</th>
                                                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Quantity</th>
                                                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Price</th>
                                                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Subtotal</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200">
                                                {selectedOrder.orderItems.map((item, i) => (
                                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <div className="flex items-center">
                                                                <div className="h-12 w-12 bg-white rounded-lg overflow-hidden mr-3 flex-shrink-0 border border-slate-200">
                                                                    <img
                                                                        src={item.product?.images?.[0]}
                                                                        alt={item.product?.name}
                                                                        className="h-full w-full object-contain"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-medium text-slate-800">{item.product?.name}</p>
                                                                    <p className="text-xs text-slate-500">ID: {item.product?.id?.slice(0, 8)}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-center">
                                                            <span className="px-3 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">
                                                                {item.quantity}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-slate-800">
                                                            ${item.price}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-right font-medium text-slate-800">
                                                            ${(item.price * item.quantity).toFixed(2)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                                                <tr>
                                                    <td colSpan="2" className="px-4 py-3 whitespace-nowrap text-left font-medium text-slate-800">
                                                        {selectedOrder.isCouponUsed ? (
                                                            <div className="text-xs text-green-600 bg-green-50 inline-block px-2 py-1 rounded">
                                                                Coupon applied: {selectedOrder.coupon.code} ({selectedOrder.coupon.discount}% off)
                                                            </div>
                                                        ) : null}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium text-slate-500">Total:</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-right text-base font-bold text-blue-600">${selectedOrder.total}</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col sm:flex-row sm:justify-between gap-4 mt-8 pt-6 border-t border-gray-200">
                                <div className="flex items-center">
                                    <label htmlFor="orderStatus" className="text-sm font-medium text-slate-700 mr-3">Update Status:</label>
                                    <select
                                        id="orderStatus"
                                        value={selectedOrder.status}
                                        onChange={e => updateOrderStatus(selectedOrder.id, e.target.value)}
                                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none shadow-sm"
                                    >
                                        <option value="ORDER_PLACED">Order Placed</option>
                                        <option value="PROCESSING">Processing</option>
                                        <option value="SHIPPED">Shipped</option>
                                        <option value="DELIVERED">Delivered</option>
                                    </select>
                                </div>
                                <div className="flex gap-3">
                                    <button 
                                        onClick={closeModal} 
                                        className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition font-medium"
                                    >
                                        Close
                                    </button>
                                    <button 
                                        onClick={() => printInvoice(selectedOrder)}
                                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition font-medium flex items-center"
                                    >
                                        <FileTextIcon size={16} className="mr-2" />
                                        Print Invoice
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Delete Confirmation Modal */}
            {isDeleteConfirmOpen && orderToDelete && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 p-4">
                    <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 text-center">
                                                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-5">
                            <AlertCircleIcon className="h-8 w-8 text-red-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-3">Delete Order</h3>
                        <p className="text-slate-600 mb-6">
                            Are you sure you want to delete this order? This action cannot be undone and all associated order data will be permanently removed.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center gap-3">
                            <button
                                onClick={closeDeleteConfirm}
                                className="px-5 py-2.5 bg-slate-100 text-slate-800 rounded-lg hover:bg-slate-200 transition font-medium order-2 sm:order-1"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteOrder}
                                className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition font-medium order-1 sm:order-2"
                            >
                                Delete Order
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
