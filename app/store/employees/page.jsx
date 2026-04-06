// app/store/employees/page.jsx
'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  ShieldCheck,
  ShieldAlert,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  UserCheck,
  UserX,
} from 'lucide-react';

const ALL_PERMISSIONS = [
  { key: 'billing',            label: 'Billing',             desc: 'Create bills & process payments' },
  { key: 'inventory',          label: 'Inventory',           desc: 'View stock levels' },
  { key: 'orders',             label: 'Orders',              desc: 'View & update order status' },
  { key: 'reports',            label: 'Reports',             desc: 'View sales analytics & reports' },
  { key: 'product_categories', label: 'Product Categories',  desc: 'View product categories' },
  { key: 'manage_product',     label: 'Manage Products',     desc: 'View all listed products' },
];

const DEFAULT_PERMS = {
  billing: false,
  inventory: false,
  orders: false,
  reports: false,
  settings: false,
  product_categories: false,
  manage_product: false,
};

function PermissionBadge({ permissions }) {
  const granted = Object.entries(permissions || {})
    .filter(([, v]) => v)
    .map(([k]) => k);
  if (!granted.length) return <span className="text-xs text-slate-400">No permissions</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {granted.map((p) => (
        <span
          key={p}
          className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full capitalize"
        >
          {p.replace(/_/g, ' ')}
        </span>
      ))}
    </div>
  );
}

export default function EmployeesPage() {
  const { getToken } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'EMPLOYEE',
    permissions: { ...DEFAULT_PERMS },
  });

  const getAuthHeader = async () => {
    const empToken = typeof window !== 'undefined' ? localStorage.getItem('employeeToken') : null;
    if (empToken) return { Authorization: `Bearer ${empToken}` };
    const token = await getToken();
    return { Authorization: `Bearer ${token}` };
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeader();
      const { data } = await axios.get('/api/employee/list', { headers });
      setEmployees(data.employees || []);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const openCreate = () => {
    setEditingEmployee(null);
    setForm({
      name: '',
      email: '',
      password: '',
      role: 'EMPLOYEE',
      permissions: { ...DEFAULT_PERMS },
    });
    setShowPassword(false);
    setModalOpen(true);
  };

  const openEdit = (emp) => {
    setEditingEmployee(emp);
    setForm({
      name: emp.name,
      email: emp.email,
      password: '',
      role: emp.role,
      permissions: { ...DEFAULT_PERMS, ...(emp.permissions || {}) },
    });
    setShowPassword(false);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.email) {
      toast.error('Name and email are required');
      return;
    }
    if (!editingEmployee && !form.password) {
      toast.error('Password is required');
      return;
    }

    try {
      setSaving(true);
      const headers = await getAuthHeader();

      if (editingEmployee) {
        const payload = {
          id: editingEmployee.id,
          name: form.name,
          email: form.email,
          role: form.role,
          permissions: form.permissions,
        };
        if (form.password) payload.password = form.password;
        const { data } = await axios.put('/api/employee/update', payload, { headers });
        setEmployees((prev) => prev.map((e) => (e.id === editingEmployee.id ? data.employee : e)));
        toast.success('Employee updated');
      } else {
        const { data } = await axios.post(
          '/api/employee/create',
          {
            name: form.name,
            email: form.email,
            password: form.password,
            role: form.role,
            permissions: form.permissions,
          },
          { headers }
        );
        setEmployees((prev) => [data.employee, ...prev]);
        toast.success('Employee created');
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (emp) => {
    try {
      const headers = await getAuthHeader();
      const { data } = await axios.put(
        '/api/employee/update',
        { id: emp.id, isActive: !emp.isActive },
        { headers }
      );
      setEmployees((prev) => prev.map((e) => (e.id === emp.id ? data.employee : e)));
      toast.success(data.employee.isActive ? 'Employee activated' : 'Employee deactivated');
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const headers = await getAuthHeader();
      await axios.delete(`/api/employee/delete?id=${deleteId}`, { headers });
      setEmployees((prev) => prev.filter((e) => e.id !== deleteId));
      toast.success('Employee deleted');
      setDeleteId(null);
    } catch {
      toast.error('Failed to delete employee');
    }
  };

  const togglePerm = (key) => {
    setForm((prev) => ({
      ...prev,
      permissions: { ...prev.permissions, [key]: !prev.permissions[key] },
    }));
  };

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users size={22} className="text-green-600" /> Employee Management
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage staff access and permissions</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchEmployees}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm"
          >
            <Plus size={16} /> Add Employee
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-slate-400">
          <Loader2 size={20} className="animate-spin" /> Loading...
        </div>
      ) : employees.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-slate-200 shadow-sm">
          <Users size={48} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-600 font-medium">No employees yet</p>
          <p className="text-slate-400 text-sm mt-1">Add your first employee to get started</p>
          <button
            onClick={openCreate}
            className="mt-4 inline-flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700"
          >
            <Plus size={16} /> Add Employee
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Employee', 'Role', 'Permissions', 'Status', 'Joined', 'Actions'].map((h) => (
                    <th
                      key={h}
                      className="text-left px-5 py-3.5 font-medium text-slate-500 text-xs uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-medium text-slate-800">{emp.name}</p>
                        <p className="text-xs text-slate-400">{emp.email}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          emp.role === 'STORE_OWNER'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {emp.role === 'STORE_OWNER' ? <ShieldCheck size={11} /> : <ShieldAlert size={11} />}
                        {emp.role === 'STORE_OWNER' ? 'Store Owner' : 'Employee'}
                      </span>
                    </td>
                    <td className="px-5 py-4 max-w-[220px]">
                      <PermissionBadge permissions={emp.permissions} />
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => handleToggleActive(emp)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                          emp.isActive
                            ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                            : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                        }`}
                      >
                        {emp.isActive ? <><UserCheck size={11} /> Active</> : <><UserX size={11} /> Inactive</>}
                      </button>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-400">
                      {new Date(emp.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(emp)}
                          className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 border border-blue-200 transition"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteId(emp.id)}
                          className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 border border-red-200 transition"
                          title="Delete"
                        >
                          <Trash2 size={14} />
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

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <h2 className="text-lg font-semibold text-slate-800">
                {editingEmployee ? 'Edit Employee' : 'Add Employee'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ravi Kumar"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="ravi@store.com"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Password{' '}
                  {editingEmployee && (
                    <span className="text-slate-400 font-normal text-xs">(leave blank to keep current)</span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-3.5 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100 bg-white"
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="STORE_OWNER">Store Owner</option>
                </select>
              </div>

              {/* Permissions — only for EMPLOYEE role */}
              {form.role === 'EMPLOYEE' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">Permissions</label>
                  <div className="grid grid-cols-1 gap-2.5">
                    {ALL_PERMISSIONS.map((perm) => (
                      <div
                        key={perm.key}
                        onClick={() => togglePerm(perm.key)}
                        className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer select-none transition-all ${
                          form.permissions[perm.key]
                            ? 'border-green-400 bg-green-50 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {/* Checkbox */}
                        <div
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            form.permissions[perm.key]
                              ? 'bg-green-600 border-green-600'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {form.permissions[perm.key] && <Check size={12} className="text-white" />}
                        </div>
                        {/* Text */}
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-700">{perm.label}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{perm.desc}</p>
                        </div>
                        {/* Status pill */}
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                            form.permissions[perm.key]
                              ? 'bg-green-100 text-green-700'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {form.permissions[perm.key] ? 'Allowed' : 'Denied'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-white rounded-b-2xl">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-60 flex items-center gap-2 transition"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {editingEmployee ? 'Save Changes' : 'Create Employee'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={28} className="text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Delete Employee?</h3>
            <p className="text-slate-500 text-sm mb-6">This action cannot be undone.</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-5 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}