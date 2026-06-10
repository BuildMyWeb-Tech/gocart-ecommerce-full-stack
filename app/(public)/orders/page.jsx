// C:\Users\Siddharathan\Desktop\gocart-ecommerce-full-stack\app\(public)\orders\page.jsx
'use client';
import { useEffect, useState } from 'react';
import OrderItem from '@/components/OrderItem';
import { useAuth, useUser } from '@clerk/nextjs';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import Loading from '@/components/Loading';
import { ShoppingBagIcon, FilterIcon } from 'lucide-react';
import Link from 'next/link';

const STATUS_FILTERS = [
  { key: 'all',       label: 'All Orders' },
  { key: 'active',    label: 'Active' },
  { key: 'shipped',   label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];

export default function Orders() {
  const { getToken }        = useAuth();
  const { user, isLoaded }  = useUser();
  const router              = useRouter();
  const [orders,       setOrders]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) { router.push('/'); return; }

    const fetchOrders = async () => {
      try {
        const token = await getToken();
        const { data } = await axios.get('/api/orders', { headers: { Authorization: `Bearer ${token}` } });
        setOrders(data.orders || []);
      } catch (error) {
        toast.error(error?.response?.data?.error || error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [isLoaded, user, getToken, router]);

  const filteredOrders = orders.filter((o) => {
    switch (activeFilter) {
      case 'active':    return ['PENDING', 'CONFIRMED', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY'].includes(o.status);
      case 'shipped':   return ['SHIPPED', 'OUT_FOR_DELIVERY'].includes(o.status);
      case 'delivered': return o.status === 'DELIVERED';
      case 'cancelled': return ['CANCELLED', 'RETURNED'].includes(o.status);
      default:          return true;
    }
  });

  if (!isLoaded || loading) return <Loading />;

  if (orders.length === 0) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-6">
        <div className="bg-slate-100 p-5 rounded-full mb-6"><ShoppingBagIcon size={48} className="text-slate-300" /></div>
        <h1 className="text-2xl font-semibold mb-3 text-slate-700">No orders yet</h1>
        <p className="text-slate-500 mb-8 max-w-md">Your order history will appear here once you make your first purchase.</p>
        <Link href="/shop" className="flex items-center gap-2 bg-slate-800 text-white px-6 py-3 rounded-lg hover:bg-slate-700">Start Shopping</Link>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] mx-6">
      <div className="my-10 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">My Orders</h1>
            <p className="text-slate-500 text-sm mt-1">Showing {filteredOrders.length} of {orders.length} orders</p>
          </div>

          <div className="hidden md:flex bg-white shadow-sm rounded-lg overflow-hidden border border-slate-200">
            {STATUS_FILTERS.map((f) => (
              <button key={f.key} onClick={() => setActiveFilter(f.key)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${activeFilter === f.key ? 'bg-slate-800 text-white' : 'hover:bg-slate-50 text-slate-600'}`}>
                {f.label}
              </button>
            ))}
          </div>

          <div className="md:hidden flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm border border-slate-200">
            <FilterIcon size={16} className="text-slate-500" />
            <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)} className="text-sm border-none bg-transparent focus:outline-none w-full">
              {STATUS_FILTERS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-hidden bg-white rounded-xl shadow-sm border border-slate-200">
          <table className="w-full text-slate-500 table-auto">
            <thead className="bg-slate-50 text-slate-700 text-xs uppercase">
              <tr>
                <th className="text-left px-6 py-4 font-semibold">Order</th>
                <th className="text-center px-6 py-4 font-semibold max-md:hidden">Total</th>
                <th className="text-left px-6 py-4 font-semibold max-md:hidden">Address</th>
                <th className="text-left px-6 py-4 font-semibold max-md:hidden">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((order) => <OrderItem key={order.id} order={order} />)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}