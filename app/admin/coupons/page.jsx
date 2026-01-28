'use client'
import { useEffect, useState } from "react"
import { format } from "date-fns"
import toast from "react-hot-toast"
import { 
    DeleteIcon, 
    TicketIcon, 
    PlusIcon, 
    PercentIcon, 
    CalendarIcon, 
    UserIcon, 
    BadgePercentIcon,
    UserPlusIcon
} from "lucide-react"
import { couponDummyData } from "@/assets/assets"
import { useAuth } from "@clerk/nextjs"
import axios from "axios"

export default function AdminCoupons() {
    const { getToken } = useAuth()
    const [coupons, setCoupons] = useState([])
    const [newCoupon, setNewCoupon] = useState({
        code: '',
        description: '',
        discount: '',
        forNewUser: false,
        forMember: false,
        isPublic: false,
        expiresAt: new Date()
    })

    const fetchCoupons = async () => {
        try {
            const token = await getToken()
            const { data } = await axios.get('/api/admin/coupon', {headers: { Authorization: `Bearer ${token}` }})
            setCoupons(data.coupons)
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
    }

    const handleAddCoupon = async (e) => {
        e.preventDefault()
        try {
            const token = await getToken()

            newCoupon.discount = Number(newCoupon.discount)
            newCoupon.expiresAt = new Date(newCoupon.expiresAt)

            const { data } = await axios.post('/api/admin/coupon',{coupon: newCoupon}, {headers: { Authorization: `Bearer ${token}` }})
            toast.success(data.message)
            await fetchCoupons()
            
            // Reset form
            setNewCoupon({
                code: '',
                description: '',
                discount: '',
                forNewUser: false,
                forMember: false,
                isPublic: false,
                expiresAt: new Date()
            })
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
    }

    const handleChange = (e) => {
        setNewCoupon({ ...newCoupon, [e.target.name]: e.target.value })
    }

    const deleteCoupon = async (code) => {
        try {
            const confirm = window.confirm("Are you sure you want to delete this coupon?")
            if(!confirm) return;
            const token = await getToken()
            await axios.delete(`/api/admin/coupon?code=${code}`, {headers: { Authorization: `Bearer ${token}` }})
            await fetchCoupons()
            toast.success("Coupon deleted successfully")
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
    }

    useEffect(() => {
        fetchCoupons();
    }, [])

    return (
        <div className="text-slate-500 mb-40 pt-4 md:p-6">
            <div className="flex flex-col md:flex-row md:gap-10 md:items-start">
                {/* Add Coupon */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 mb-8 md:mb-0 md:w-1/3">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="bg-blue-50 p-2 rounded-md text-blue-600">
                            <TicketIcon size={20} />
                        </span>
                        <h2 className="text-xl md:text-2xl">Add <span className="text-slate-800 font-medium">Coupon</span></h2>
                    </div>
                    
                    <form onSubmit={(e) => toast.promise(handleAddCoupon(e), { loading: "Adding coupon..." })} className="text-sm">
                        <div className="flex gap-2 max-sm:flex-col">
                            <div className="relative w-full">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                                    <BadgePercentIcon size={16} />
                                </div>
                                <input 
                                    type="text" 
                                    placeholder="Coupon Code" 
                                    className="w-full mt-2 p-2 pl-10 border border-slate-200 outline-slate-400 rounded-md"
                                    name="code" 
                                    value={newCoupon.code} 
                                    onChange={handleChange} 
                                    required 
                                />
                            </div>
                            
                            <div className="relative w-full">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                                    <PercentIcon size={16} />
                                </div>
                                <input 
                                    type="number" 
                                    placeholder="Discount (%)" 
                                    min={1} 
                                    max={100} 
                                    className="w-full mt-2 p-2 pl-10 border border-slate-200 outline-slate-400 rounded-md"
                                    name="discount" 
                                    value={newCoupon.discount} 
                                    onChange={handleChange} 
                                    required 
                                />
                            </div>
                        </div>
                        
                        <div className="relative w-full">
                            <textarea 
                                placeholder="Coupon Description" 
                                className="w-full mt-3 p-3 border border-slate-200 outline-slate-400 rounded-md min-h-[80px]"
                                name="description" 
                                value={newCoupon.description} 
                                onChange={handleChange} 
                                required 
                            />
                        </div>

                        <label className="block mt-4">
                            <div className="flex items-center gap-2 mb-2 text-slate-700">
                                <CalendarIcon size={16} />
                                <p>Coupon Expiry Date</p>
                            </div>
                            <input 
                                type="date" 
                                placeholder="Coupon Expires At" 
                                className="w-full p-2 border border-slate-200 outline-slate-400 rounded-md"
                                name="expiresAt" 
                                value={format(newCoupon.expiresAt, 'yyyy-MM-dd')} 
                                onChange={handleChange} 
                            />
                        </label>

                        <div className="mt-5 space-y-4 bg-slate-50 pt-4 rounded-lg">
                            <div className="flex items-center gap-3">
                                <label className="relative inline-flex items-center cursor-pointer text-gray-900 gap-3">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer"
                                        name="forNewUser" 
                                        checked={newCoupon.forNewUser}
                                        onChange={(e) => setNewCoupon({ ...newCoupon, forNewUser: e.target.checked })}
                                    />
                                    <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:bg-blue-600 transition-colors duration-200"></div>
                                    <span className="dot absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out peer-checked:translate-x-5"></span>
                                </label>
                                <div className="flex items-center gap-2">
                                    <UserPlusIcon size={16} className="text-slate-500" />
                                    <p className="font-medium">For New Users</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <label className="relative inline-flex items-center cursor-pointer text-gray-900 gap-3">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer"
                                        name="forMember" 
                                        checked={newCoupon.forMember}
                                        onChange={(e) => setNewCoupon({ ...newCoupon, forMember: e.target.checked })}
                                    />
                                    <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:bg-blue-600 transition-colors duration-200"></div>
                                    <span className="dot absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out peer-checked:translate-x-5"></span>
                                </label>
                                <div className="flex items-center gap-2">
                                    <UserIcon size={16} className="text-slate-500" />
                                    <p className="font-medium">For Members</p>
                                </div>
                            </div>
                        </div>
                        
                        <button className="mt-6 p-3 w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium active:scale-95 transition flex items-center justify-center gap-2">
                            <PlusIcon size={18} />
                            Create Coupon
                        </button>
                    </form>
                </div>

                {/* List Coupons */}
                <div className="md:flex-1">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="bg-purple-50 p-2 rounded-md text-purple-600">
                            <TicketIcon size={20} />
                        </span>
                        <h2 className="text-xl md:text-2xl">Active <span className="text-slate-800 font-medium">Coupons</span></h2>
                        <span className="ml-auto bg-purple-50 text-purple-600 px-3 py-1 rounded-full text-xs font-medium">{coupons.length} Total</span>
                    </div>
                    
                    <div className="overflow-x-auto mt-4 rounded-xl border border-slate-200 shadow-sm bg-white">
                        {coupons.length > 0 ? (
                            <table className="min-w-full bg-white text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="py-3 px-4 text-left font-semibold text-slate-600">Code</th>
                                        <th className="py-3 px-4 text-left font-semibold text-slate-600">Description</th>
                                        <th className="py-3 px-4 text-left font-semibold text-slate-600">Discount</th>
                                        <th className="py-3 px-4 text-left font-semibold text-slate-600">Expires At</th>
                                        <th className="py-3 px-4 text-left font-semibold text-slate-600">New User</th>
                                        <th className="py-3 px-4 text-left font-semibold text-slate-600">For Member</th>
                                        <th className="py-3 px-4 text-left font-semibold text-slate-600">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {coupons.map((coupon) => (
                                        <tr key={coupon.code} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-3 px-4 font-medium text-blue-600">{coupon.code}</td>
                                            <td className="py-3 px-4 text-slate-700 max-w-[200px] truncate">{coupon.description}</td>
                                            <td className="py-3 px-4">
                                                <span className="bg-green-50 text-green-600 py-1 px-2 rounded-md font-medium">
                                                    {coupon.discount}%
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-slate-700">{format(coupon.expiresAt, 'yyyy-MM-dd')}</td>
                                            <td className="py-3 px-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${coupon.forNewUser ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                                                    {coupon.forNewUser ? 'Yes' : 'No'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${coupon.forMember ? 'bg-purple-50 text-purple-600' : 'bg-slate-100 text-slate-500'}`}>
                                                    {coupon.forMember ? 'Yes' : 'No'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <button 
                                                    onClick={() => toast.promise(deleteCoupon(coupon.code), { loading: "Deleting coupon..." })}
                                                    className="bg-red-50 text-red-500 p-2 rounded-full hover:bg-red-100 transition-colors"
                                                >
                                                    <DeleteIcon className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-10">
                                <TicketIcon size={40} className="text-slate-300 mb-2" />
                                <p className="text-slate-500">No coupons available</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
