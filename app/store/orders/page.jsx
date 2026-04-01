// C:\Users\Siddharathan\Desktop\gocart-ecommerce-full-stack\app\store\orders\page.jsx
'use client';
import { useEffect, useState, useRef } from 'react';
import Loading from '@/components/Loading';
import { useAuth } from '@clerk/nextjs';
import axios from 'axios';
import toast from 'react-hot-toast';
import Image from 'next/image';
import {
  Eye,
  Trash2,
  AlertCircle,
  Package,
  Truck,
  CheckCircle,
  IndianRupee,
  ClipboardList,
  Download,
  RefreshCw,
  FileText,
  FileSpreadsheet,
  File,
  Printer,
  X,
  MapPin,
  User,
  CreditCard,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Ban,
} from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function StoreOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [filterValue, setFilterValue] = useState('all');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const invoiceRef = useRef(null);
  const { getToken } = useAuth();

  const handlePrint = useReactToPrint({
    content: () => invoiceRef.current,
    documentTitle: `Invoice-${selectedOrder?.id?.slice(0, 8) || 'order'}`,
    onAfterPrint: () => toast.success('Invoice printed successfully!'),
  });

  const generatePDF = (order) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`INVOICE #${order.id.slice(0, 8)}`, 20, 20);
    doc.setFontSize(12);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 20, 35);
    doc.text(`Customer: ${order.user?.name || 'N/A'}`, 20, 45);
    doc.text(`Email: ${order.user?.email || 'N/A'}`, 20, 55);
    const tableColumn = ['Product', 'Qty', 'Price', 'Subtotal'];
    const tableRows = order.orderItems.map((item) => [
      item.product?.name || 'Unknown',
      item.quantity,
      `₹${item.price}`,
      `₹${(item.price * item.quantity).toFixed(2)}`,
    ]);
    autoTable(doc, { head: [tableColumn], body: tableRows, startY: 70, theme: 'grid' });
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.text(`Total Amount: ₹${order.total}`, 20, finalY);
    doc.save(`Invoice-${order.id.slice(0, 8)}.pdf`);
    toast.success('Invoice downloaded!');
  };

  const fetchOrders = async () => {
    try {
      const token = await getToken();
      const { data } = await axios.get('/api/store/orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(data.orders);
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      const token = await getToken();
      await axios.post(
        '/api/store/orders',
        { orderId, status },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
      if (selectedOrder?.id === orderId) setSelectedOrder((prev) => ({ ...prev, status }));
      toast.success('Order status updated!');
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    }
  };

  const openModal = (order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setSelectedOrder(null);
    setIsModalOpen(false);
  };
  const openDeleteConfirm = (e, order) => {
    e.stopPropagation();
    setOrderToDelete(order);
    setIsDeleteConfirmOpen(true);
  };
  const closeDeleteConfirm = () => {
    setOrderToDelete(null);
    setIsDeleteConfirmOpen(false);
  };

  const handleDeleteOrder = async () => {
    setOrders((prev) => prev.filter((o) => o.id !== orderToDelete.id));
    toast.success('Order deleted successfully');
    closeDeleteConfirm();
  };

  const exportToExcel = () => {
    const exportData = orders.map((order) => ({
      'Order ID': order.id,
      Date: new Date(order.createdAt).toLocaleDateString(),
      Customer: order.user?.name || 'Unknown',
      Email: order.user?.email || 'N/A',
      Items: order.orderItems?.length || 0,
      'Total Amount': order.total,
      'Payment Method': order.paymentMethod || 'N/A',
      Status: order.status,
      'Coupon Used': order.isCouponUsed ? order.coupon?.code : 'No',
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');
    XLSX.writeFile(workbook, 'Store_Orders.xlsx');
    toast.success('Excel downloaded!');
    setExportMenuOpen(false);
  };

  const exportToPDF = () => {
    const doc = new jsPDF('landscape');
    doc.setFontSize(18);
    doc.text('Store Orders Report', 14, 15);
    const tableColumn = ['Order ID', 'Date', 'Customer', 'Items', 'Total', 'Status'];
    const tableRows = orders.map((order) => [
      order.id.slice(0, 8),
      new Date(order.createdAt).toLocaleDateString(),
      order.user?.name || 'Unknown',
      order.orderItems?.length || 0,
      `₹${order.total}`,
      order.status,
    ]);
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 25,
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [59, 130, 246] },
    });
    doc.save('Store_Orders_Report.pdf');
    toast.success('PDF downloaded!');
    setExportMenuOpen(false);
  };

  const getStatusBadge = (status) => {
    const cfg = {
      ORDER_PLACED: {
        color: 'bg-blue-100 text-blue-700 border border-blue-200',
        icon: <ClipboardList size={14} className="mr-1" />,
        text: 'Order Placed',
      },
      PROCESSING: {
        color: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
        icon: <Package size={14} className="mr-1" />,
        text: 'Processing',
      },
      SHIPPED: {
        color: 'bg-indigo-100 text-indigo-700 border border-indigo-200',
        icon: <Truck size={14} className="mr-1" />,
        text: 'Shipped',
      },
      DELIVERED: {
        color: 'bg-green-100 text-green-700 border border-green-200',
        icon: <CheckCircle size={14} className="mr-1" />,
        text: 'Delivered',
      },
      CANCELLED: {
        color: 'bg-red-100 text-red-700 border border-red-200',
        icon: <Ban size={14} className="mr-1" />,
        text: 'Cancelled',
      },
    };
    const c = cfg[status] || cfg.ORDER_PLACED;
    return (
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${c.color}`}
      >
        {c.icon}
        {c.text}
      </span>
    );
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  if (loading) return <Loading />;

  const filteredOrders =
    filterValue === 'all'
      ? orders
      : filterValue === 'recent'
        ? [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10)
        : filterValue === 'pending'
          ? orders.filter((o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED')
          : filterValue === 'completed'
            ? orders.filter((o) => o.status === 'DELIVERED')
            : orders.filter((o) => o.status === 'CANCELLED');

  const totalPages = Math.ceil(filteredOrders.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, filteredOrders.length);
  const currentOrders = filteredOrders.slice(startIndex, endIndex);

  return (
    <>
      {/* ── Page Header ─────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl text-slate-800 font-bold flex items-center">
          <Package className="mr-3 h-7 w-7 text-blue-600" />
          Order Management
        </h1>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none shadow-sm"
            value={filterValue}
            onChange={(e) => {
              setFilterValue(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">All Orders</option>
            <option value="recent">Recent Orders</option>
            <option value="pending">Pending Orders</option>
            <option value="completed">Completed Orders</option>
            <option value="cancelled">Cancelled Orders</option>
          </select>

          <div className="relative">
            <button
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg text-sm hover:from-blue-700 hover:to-blue-800 transition shadow-sm flex items-center justify-center"
            >
              <Download size={16} className="mr-2" />
              Export
            </button>
            {exportMenuOpen && (
              <div className="absolute right-0 mt-2 w-36 bg-white rounded-lg shadow-lg z-10 border border-gray-200 py-1">
                <button
                  onClick={exportToPDF}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                >
                  <File size={16} className="mr-2 text-red-500" />
                  PDF
                </button>
                <button
                  onClick={exportToExcel}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                >
                  <FileSpreadsheet size={16} className="mr-2 text-green-500" />
                  Excel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Showing count ────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <p className="text-xs text-gray-500 bg-white rounded-lg py-2 px-4 shadow-sm border border-gray-200">
          Showing {filteredOrders.length > 0 ? startIndex + 1 : 0}–{endIndex} of{' '}
          {filteredOrders.length} orders
        </p>
        <button
          onClick={fetchOrders}
          className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 transition"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* ── Empty State ──────────────────────────────────── */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-10 text-center border border-gray-100">
          <div className="flex justify-center mb-6">
            <div className="bg-slate-100 p-6 rounded-full">
              <Package size={50} className="text-slate-400" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-3">No orders found</h3>
          <p className="text-slate-500 max-w-md mx-auto mb-6">
            Orders will appear here when customers make purchases.
          </p>
          <button
            onClick={fetchOrders}
            className="inline-flex items-center px-5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg font-medium transition"
          >
            <RefreshCw size={16} className="mr-2" />
            Refresh Orders
          </button>
        </div>
      ) : (
        <>
          {/* ── Orders Table ──────────────────────────────── */}
          <div className="overflow-hidden bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-600">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 text-xs uppercase tracking-wider border-b border-gray-200">
                  <tr>
                    {[
                      'Product',
                      'Customer',
                      'Date',
                      'Total',
                      'Payment',
                      'Coupon',
                      'Status',
                      'Actions',
                    ].map((h, i) => (
                      <th key={i} className="px-4 py-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {currentOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-blue-50/30 transition-colors cursor-pointer"
                      onClick={() => openModal(order)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {order.orderItems?.[0]?.product?.images?.[0] && (
                            <div className="h-10 w-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                              <Image
                                src={order.orderItems[0].product.images[0]}
                                alt={order.orderItems[0].product.name || 'Product'}
                                width={40}
                                height={40}
                                className="object-cover h-full w-full"
                              />
                            </div>
                          )}
                          <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            {order.orderItems?.length || 0} item
                            {order.orderItems?.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {order.user?.name || 'Unknown'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {new Date(order.createdAt).toLocaleDateString('en-US', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        ₹{order.total.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            order.paymentMethod === 'STRIPE'
                              ? 'bg-purple-100 text-purple-700 border border-purple-200'
                              : 'bg-orange-100 text-orange-700 border border-orange-200'
                          }`}
                        >
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
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="relative inline-block w-full">
                          <select
                            value={order.status}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                            className="appearance-none w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer shadow-sm"
                          >
                            <option value="ORDER_PLACED">ORDER_PLACED</option>
                            <option value="PROCESSING">PROCESSING</option>
                            <option value="SHIPPED">SHIPPED</option>
                            <option value="DELIVERED">DELIVERED</option>
                            <option value="CANCELLED">CANCELLED</option>
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                            <svg className="fill-current h-4 w-4" viewBox="0 0 20 20">
                              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                            </svg>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className="flex items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => openModal(order)}
                            className="p-2 bg-blue-50 rounded-lg text-blue-600 hover:bg-blue-100 transition border border-blue-200"
                            title="View"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => generatePDF(order)}
                            className="p-2 bg-green-50 rounded-lg text-green-600 hover:bg-green-100 transition border border-green-200"
                            title="Invoice"
                          >
                            <FileText size={16} />
                          </button>
                          <button
                            onClick={(e) => openDeleteConfirm(e, order)}
                            className="p-2 bg-red-50 rounded-lg text-red-600 hover:bg-red-100 transition border border-red-200"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Pagination ────────────────────────────────── */}
          <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Rows per page:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
              >
                {[5, 10, 25, 50].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1 border border-gray-300 rounded-lg bg-white disabled:opacity-50"
              >
                <ChevronsLeft size={18} />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-1 border border-gray-300 rounded-lg bg-white disabled:opacity-50"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg">
                {currentPage}
              </div>
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1 border border-gray-300 rounded-lg bg-white disabled:opacity-50"
              >
                <ChevronRight size={18} />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1 border border-gray-300 rounded-lg bg-white disabled:opacity-50"
              >
                <ChevronsRight size={18} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Order Detail Modal ───────────────────────────── */}
      {isModalOpen && selectedOrder && (
        <div
          onClick={closeModal}
          className="fixed inset-0 flex items-center justify-center bg-black/50 text-slate-700 text-sm backdrop-blur-sm z-50 p-7"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl shadow-xl max-w-3xl w-full relative overflow-y-auto max-h-[90vh] mx-5"
          >
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white pl-3 pr-3 pb-3 pt-11 px-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Order #{selectedOrder.id.slice(0, 8)}
                </h2>
                <button
                  onClick={closeModal}
                  className="bg-white/20 p-1.5 rounded-full hover:bg-white/30 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-2 flex items-center">
                {getStatusBadge(selectedOrder.status)}
                <span className="text-xs text-white/70 ml-3">
                  Placed on{' '}
                  {new Date(selectedOrder.createdAt).toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>

            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gradient-to-br from-slate-50 to-white p-5 rounded-xl border border-slate-200">
                  <h3 className="font-semibold text-slate-800 mb-3 flex items-center">
                    <User className="h-5 w-5 mr-2 text-blue-600" />
                    Customer Details
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex">
                      <span className="text-slate-500 w-20">Name:</span>
                      <span className="font-medium text-slate-800">
                        {selectedOrder.user?.name || 'N/A'}
                      </span>
                    </div>
                    <div className="flex">
                      <span className="text-slate-500 w-20">Email:</span>
                      <span className="font-medium text-slate-800">
                        {selectedOrder.user?.email || 'N/A'}
                      </span>
                    </div>
                    <div className="flex">
                      <span className="text-slate-500 w-20">Phone:</span>
                      <span className="font-medium text-slate-800">
                        {selectedOrder.address?.phone || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-6">
                    <h3 className="font-semibold text-slate-800 mb-3 flex items-center">
                      <MapPin className="h-5 w-5 mr-2 text-blue-600" />
                      Shipping Address
                    </h3>
                    <div className="p-3 bg-white rounded-lg border border-slate-200 text-sm">
                      {selectedOrder.address?.street
                        ? `${selectedOrder.address.street}, ${selectedOrder.address.city}, ${selectedOrder.address.state}, ${selectedOrder.address.zip}, ${selectedOrder.address.country}`
                        : 'N/A'}
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-slate-50 to-white p-5 rounded-xl border border-slate-200">
                  <h3 className="font-semibold text-slate-800 mb-3 flex items-center">
                    <CreditCard className="h-5 w-5 mr-2 text-blue-600" />
                    Payment Details
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex">
                      <span className="text-slate-500 w-20">Method:</span>
                      <span
                        className={`font-medium px-2 py-0.5 rounded text-xs ${selectedOrder.paymentMethod === 'STRIPE' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}
                      >
                        {selectedOrder.paymentMethod}
                      </span>
                    </div>
                    <div className="flex">
                      <span className="text-slate-500 w-20">Status:</span>
                      <span
                        className={`font-medium px-2 py-0.5 rounded text-xs ${selectedOrder.isPaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                      >
                        {selectedOrder.isPaid ? 'Paid' : 'Unpaid'}
                      </span>
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
                      <Clock className="h-5 w-5 mr-2 text-blue-600" />
                      Order Timeline
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                          <ClipboardList className="h-4 w-4 text-blue-600" />
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
                          <RefreshCw className="h-4 w-4 text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Last Update</p>
                          <p className="text-sm font-medium">
                            {new Date(
                              selectedOrder.updatedAt || selectedOrder.createdAt
                            ).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="mt-2">
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center">
                  <Package className="h-5 w-5 mr-2 text-blue-600" />
                  Order Items
                </h3>
                <div className="bg-white rounded-xl overflow-hidden border border-slate-200">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          {['Product', 'Quantity', 'Price', 'Subtotal'].map((h, i) => (
                            <th
                              key={i}
                              className={`px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider ${i === 0 ? 'text-left' : i < 2 ? 'text-center' : 'text-right'}`}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {selectedOrder.orderItems.map((item, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center">
                                <div className="h-12 w-12 bg-white rounded-lg overflow-hidden mr-3 flex-shrink-0 border border-slate-200">
                                  <img
                                    src={item.product?.images?.[0]}
                                    alt={item.product?.name}
                                    className="h-full w-full object-contain"
                                  />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-slate-800">
                                    {item.product?.name}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    ID: {item.product?.id?.slice(0, 8)}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="px-3 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">
                                {item.quantity}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-slate-800">
                              ₹{item.price}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-slate-800">
                              ₹{(item.price * item.quantity).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                        <tr>
                          <td colSpan="2" className="px-4 py-3">
                            {selectedOrder.isCouponUsed && (
                              <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                                Coupon: {selectedOrder.coupon.code} ({selectedOrder.coupon.discount}
                                % off)
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-slate-500">
                            Total:
                          </td>
                          <td className="px-4 py-3 text-right text-base font-bold text-blue-600">
                            ₹{selectedOrder.total}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex flex-col sm:flex-row sm:justify-between gap-4 mt-8 pt-6 border-t border-gray-200">
                <div className="flex items-center">
                  <label className="text-sm font-medium text-slate-700 mr-3">Update Status:</label>
                  <select
                    value={selectedOrder.status}
                    onChange={(e) => updateOrderStatus(selectedOrder.id, e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-200 outline-none shadow-sm"
                  >
                    <option value="ORDER_PLACED">Order Placed</option>
                    <option value="PROCESSING">Processing</option>
                    <option value="SHIPPED">Shipped</option>
                    <option value="DELIVERED">Delivered</option>
                    <option value="CANCELLED">Cancelled</option>
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
                    onClick={handlePrint}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition font-medium flex items-center"
                  >
                    <Printer size={16} className="mr-2" />
                    Print Invoice
                  </button>
                  <button
                    onClick={() => generatePDF(selectedOrder)}
                    className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition font-medium flex items-center"
                  >
                    <Download size={16} className="mr-2" />
                    Download
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Hidden Invoice for Print ─────────────────────── */}
      <div className="hidden">
        <div ref={invoiceRef} className="p-8 bg-white max-w-3xl mx-auto text-slate-800">
          {selectedOrder && (
            <div>
              <div className="flex justify-between items-start border-b border-gray-200 pb-6 mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-blue-700 mb-1">INVOICE</h1>
                  <p className="text-xs text-gray-500">Order #{selectedOrder.id.slice(0, 8)}</p>
                </div>
                <div className="text-right">
                  <h2 className="text-xl font-bold">GoCart Store</h2>
                </div>
              </div>
              <table className="min-w-full mb-8">
                <thead>
                  <tr className="border-b border-gray-200">
                    {['Item Description', 'Qty', 'Unit Price', 'Amount'].map((h, i) => (
                      <th
                        key={i}
                        className={`py-3 px-2 text-sm font-semibold text-gray-600 ${i === 0 ? 'text-left' : 'text-right'}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.orderItems.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="py-3 px-2">
                        <p className="text-sm font-medium">{item.product?.name}</p>
                      </td>
                      <td className="py-3 px-2 text-right text-sm">{item.quantity}</td>
                      <td className="py-3 px-2 text-right text-sm">₹{item.price}</td>
                      <td className="py-3 px-2 text-right text-sm">
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-end">
                <div className="w-64 border-t border-gray-200 pt-3">
                  <div className="flex justify-between text-base font-bold">
                    <p>Total:</p>
                    <p>₹{selectedOrder.total}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Delete Confirm Modal ─────────────────────────── */}
      {isDeleteConfirmOpen && orderToDelete && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-5">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Delete Order</h3>
            <p className="text-slate-600 mb-6">Are you sure? This action cannot be undone.</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={closeDeleteConfirm}
                className="px-5 py-2.5 bg-slate-100 text-slate-800 rounded-lg hover:bg-slate-200 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteOrder}
                className="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
              >
                Delete Order
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
