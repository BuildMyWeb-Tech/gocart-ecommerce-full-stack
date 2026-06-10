// app/employee/add-product/page.jsx
'use client';
import { useEffect, useState } from 'react';
import { ShieldAlert, PackageOpen, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { PERMISSIONS } from '@/middlewares/authEmployee';

export default function EmployeeAddProductPage() {
  const [employee,  setEmployee]  = useState(null);
  const [allowed,   setAllowed]   = useState(false);
  const [pageReady, setPageReady] = useState(false);

  useEffect(() => {
    const empData = localStorage.getItem('employeeData');
    if (!empData) return;
    const parsed = JSON.parse(empData);
    setEmployee(parsed);
    setAllowed(parsed.isOwner === true || parsed.permissions?.[PERMISSIONS.ADD_PRODUCT] === true);
    setPageReady(true);
  }, []);

  if (!pageReady) return null;

  if (!allowed) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-4">
          <ShieldAlert size={36} className="text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Access Denied</h2>
        <p className="text-slate-500 text-sm max-w-sm">
          Adding products requires permission from your store owner.
        </p>
        <Link href="/employee/manage-product"
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
          <ArrowLeft size={16} /> View Products Instead
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-4">
        <PackageOpen size={36} className="text-amber-500" />
      </div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">Add Product</h2>
      <p className="text-slate-500 text-sm max-w-sm">
        To add new products, please use the <strong>Store Panel</strong>. The employee portal supports viewing products.
      </p>
      <Link href="/employee/manage-product"
        className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
        <ArrowLeft size={16} /> View Products
      </Link>
    </div>
  );
}