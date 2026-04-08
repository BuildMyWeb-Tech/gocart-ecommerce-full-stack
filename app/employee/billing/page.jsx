'use client';
/**
 * /app/employee/billing/page.jsx
 * ─────────────────────────────────────────────────────────────
 * Employee POS Billing — v5
 *
 * ✅ All v4 features preserved (barcode, offline, IndexedDB, sync)
 * ✅ QZ TRAY THERMAL PRINT INTEGRATION (NEW)
 *    - Direct USB thermal print via QZ Tray (no browser dialog)
 *    - ESC/POS commands for 80mm paper
 *    - Auto-connect to QZ Tray on mount
 *    - Printer selector (lists all Windows printers)
 *    - Saves selected printer to localStorage
 *    - QZ status indicator in top bar (green/red/yellow)
 *    - Graceful fallback to browser print if QZ not running
 *    - Reprint works with same QZ → browser fallback logic
 *    - Print settings modal (printer name, test print button)
 * ─────────────────────────────────────────────────────────────
 *
 * SETUP:
 * 1. npm install qz-tray
 * 2. Download QZ Tray from https://qz.io/download/ and install on Windows
 * 3. Run QZ Tray (look for icon in system tray)
 * 4. Select your printer in the Print Settings modal (⚙ icon in top bar)
 * ─────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  Barcode,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Printer,
  CheckCircle,
  Wifi,
  WifiOff,
  RefreshCw,
  X,
  Tag,
  Receipt,
  AlertCircle,
  Zap,
  CreditCard,
  Banknote,
  Smartphone,
  Clock,
  Maximize,
  Minimize,
  ShieldAlert,
  History,
  TrendingUp,
  Filter,
  ChevronDown,
  Eye,
  AlertTriangle,
  ScanLine,
  PackagePlus,
  Settings,
  Plug,
  PlugZap,
  CheckSquare,
  Square,
} from 'lucide-react';
import { calculateTax, formatCurrency } from '@/lib/storeSettings';

// ─── localStorage keys ────────────────────────────────────────────────────────
const LS_PRODUCTS = 'emp_pos_products_cache';
const LS_PRODUCTS_TS = 'emp_pos_products_cache_ts';
const LS_PRINTER_NAME = 'emp_pos_printer_name';
const PRODUCT_CACHE_TTL = 10 * 60 * 1000;

// ─── IndexedDB ────────────────────────────────────────────────────────────────
const DB_NAME = 'emp_pos_billing_db';
const DB_VERSION = 2;
const STORE_LOCAL = 'bills_local';
const STORE_QUEUE = 'bills_queue';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_LOCAL)) {
        const s = db.createObjectStore(STORE_LOCAL, { keyPath: 'localId' });
        s.createIndex('createdAt', 'createdAt');
      }
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { keyPath: 'localId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(storeName, value) {
  const db = await openDB();
  const tx = db.transaction(storeName, 'readwrite');
  const st = tx.objectStore(storeName);
  return new Promise((res, rej) => {
    const r = st.put(value);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function idbGetAll(storeName) {
  const db = await openDB();
  const tx = db.transaction(storeName, 'readonly');
  const st = tx.objectStore(storeName);
  return new Promise((res, rej) => {
    const r = st.getAll();
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function idbDelete(storeName, key) {
  const db = await openDB();
  const tx = db.transaction(storeName, 'readwrite');
  const st = tx.objectStore(storeName);
  return new Promise((res, rej) => {
    const r = st.delete(key);
    r.onsuccess = () => res();
    r.onerror = () => rej(r.error);
  });
}

async function idbCount(storeName) {
  const db = await openDB();
  const tx = db.transaction(storeName, 'readonly');
  const st = tx.objectStore(storeName);
  return new Promise((res, rej) => {
    const r = st.count();
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

// ─── Product cache ────────────────────────────────────────────────────────────
function saveProductsToCache(products) {
  try {
    localStorage.setItem(LS_PRODUCTS, JSON.stringify(products));
    localStorage.setItem(LS_PRODUCTS_TS, String(Date.now()));
  } catch (_) {}
}

function getProductsFromCache() {
  try {
    const ts = Number(localStorage.getItem(LS_PRODUCTS_TS) || 0);
    if (Date.now() - ts > PRODUCT_CACHE_TTL) return null;
    const raw = localStorage.getItem(LS_PRODUCTS);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function searchLocal(products, query) {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return products
    .filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q)
    )
    .slice(0, 8);
}

function findProductByBarcode(products, barcode) {
  if (!barcode) return null;
  const b = barcode.trim().toLowerCase();
  return products.find((p) => p.barcode?.toLowerCase() === b) || null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateBillNumber() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const ms = String(now.getTime()).slice(-5);
  return `EBILL-${date}-${ms}`;
}

function getEmpToken() {
  return localStorage.getItem('empToken') || localStorage.getItem('employeeToken') || '';
}

const PAYMENT_MODES = [
  { id: 'CASH', label: 'Cash', icon: Banknote },
  { id: 'CARD', label: 'Card', icon: CreditCard },
  { id: 'UPI', label: 'UPI', icon: Smartphone },
  { id: 'OTHER', label: 'Other', icon: Receipt },
];

const PM_COLORS = {
  CASH: 'bg-green-100 text-green-700',
  CARD: 'bg-blue-100 text-blue-700',
  UPI: 'bg-purple-100 text-purple-700',
  OTHER: 'bg-slate-100 text-slate-600',
};

// ─────────────────────────────────────────────────────────────────────────────
// ══ QZ TRAY PRINT ENGINE ════════════════════════════════════════════════════
// ─────────────────────────────────────────────────────────────────────────────

const ESC = '\x1B';
const GS = '\x1D';

const ESCPOS = {
  INIT: ESC + '@',
  ALIGN_LEFT: ESC + 'a\x00',
  ALIGN_CENTER: ESC + 'a\x01',
  BOLD_ON: ESC + 'E\x01',
  BOLD_OFF: ESC + 'E\x00',
  DOUBLE_SIZE: GS + '!\x11',
  NORMAL_SIZE: GS + '!\x00',
  CUT: GS + 'V\x41\x00',
  FEED_3: ESC + 'd\x03',
  FEED_1: ESC + 'd\x01',
  LINE_SPACING: ESC + '3\x20',
};

const PAPER_COLS = 48;

function padR(str, w) {
  return String(str ?? '')
    .slice(0, w)
    .padEnd(w);
}
function padL(str, w) {
  return String(str ?? '')
    .slice(0, w)
    .padStart(w);
}
function centerStr(str, w) {
  const s = String(str ?? '').slice(0, w);
  const sp = Math.max(0, Math.floor((w - s.length) / 2));
  return ' '.repeat(sp) + s;
}
function twoCol(label, val, w = PAPER_COLS) {
  const v = String(val);
  const maxL = w - v.length - 1;
  return String(label).slice(0, maxL).padEnd(maxL) + ' ' + v;
}

function fmtMoney(n, currency = 'INR') {
  const num = parseFloat(n || 0);
  return currency === 'INR' ? `Rs.${num.toFixed(2)}` : `${currency}${num.toFixed(2)}`;
}

function buildESCPOS(bill, settings = {}) {
  const s = { ...settings, ...(bill.settings || {}) };
  const cur = s.currency || 'INR';
  const fmt = (n) => fmtMoney(n, cur);
  const W = PAPER_COLS;
  const div = (c = '-') => c.repeat(W);

  const dateStr = new Date(bill.createdAt || Date.now()).toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  let out = '';
  out += ESCPOS.INIT;
  out += ESCPOS.LINE_SPACING;

  // Header
  out += ESCPOS.ALIGN_CENTER;
  if (s.showStoreName !== false && s.storeName) {
    out += ESCPOS.BOLD_ON + ESCPOS.DOUBLE_SIZE;
    out += s.storeName + '\n';
    out += ESCPOS.NORMAL_SIZE + ESCPOS.BOLD_OFF;
  }
  if (s.address) out += s.address + '\n';
  if (s.showGST && s.gstNumber) out += 'GST: ' + s.gstNumber + '\n';
  out += '\n';

  // Bill info
  out += ESCPOS.ALIGN_LEFT;
  out += div() + '\n';
  out += ESCPOS.BOLD_ON + 'Bill No : ' + bill.billNumber + '\n' + ESCPOS.BOLD_OFF;
  out += 'Date    : ' + dateStr + '\n';
  out += 'Payment : ' + bill.paymentMode + '\n';
  if (bill.note) out += 'Note    : ' + String(bill.note).slice(0, 36) + '\n';
  out += div() + '\n';

  // Items header
  out += ESCPOS.BOLD_ON;
  out += padR('Item', 22) + padR('Qty', 4) + padL('Price', 10) + padL('Total', 10) + '\n';
  out += ESCPOS.BOLD_OFF;
  out += div() + '\n';

  // Items
  (bill.items || []).forEach((item) => {
    const name = padR(item.name, 22);
    const qty = padR(String(item.quantity), 4);
    const price = padL(fmt(item.price), 10);
    const total = padL(fmt(item.total), 10);
    out += name + qty + price + total + '\n';
    if (item.name.length > 22) out += '  ' + item.name.slice(22, 46) + '\n';
  });

  out += div() + '\n';

  // Totals
  out += twoCol('Subtotal:', fmt(bill.subtotal)) + '\n';
  if (parseFloat(bill.discount) > 0) {
    out += ESCPOS.BOLD_ON + twoCol('Discount:', '-' + fmt(bill.discount)) + '\n' + ESCPOS.BOLD_OFF;
  }
  if (parseFloat(bill.taxAmount) > 0) {
    if (s.taxType === 'GST_SPLIT') {
      out += twoCol(`CGST (${s.cgst}%):`, fmt(bill.taxAmount / 2)) + '\n';
      out += twoCol(`SGST (${s.sgst}%):`, fmt(bill.taxAmount / 2)) + '\n';
    } else {
      out += twoCol(`Tax (${s.taxPercent || 0}%):`, fmt(bill.taxAmount)) + '\n';
    }
  }

  out += div('=') + '\n';
  out += ESCPOS.BOLD_ON + ESCPOS.ALIGN_CENTER + ESCPOS.DOUBLE_SIZE;
  out += 'TOTAL: ' + fmt(bill.total) + '\n';
  out += ESCPOS.NORMAL_SIZE + ESCPOS.BOLD_OFF;

  // Footer
  out += ESCPOS.ALIGN_CENTER;
  out += div() + '\n';
  out += (s.footerMessage || 'Thank You! Visit Again') + '\n';
  out += '\n';
  out += ESCPOS.FEED_3;
  out += ESCPOS.CUT;

  return out;
}

// ─── QZ Tray helpers ──────────────────────────────────────────────────────────
let _qz = null;
let _qzConn = false;
let _qzConnecting = false;

async function loadQZ() {
  if (typeof window === 'undefined') return null;
  if (_qz) return _qz;
  try {
    const mod = await import('qz-tray');
    _qz = mod.default || mod;
    return _qz;
  } catch (_) {}
  // CDN fallback
  return new Promise((resolve) => {
    if (window.qz) {
      _qz = window.qz;
      return resolve(_qz);
    }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/qz-tray@2.2.4/qz-tray.js';
    s.onload = () => {
      _qz = window.qz;
      resolve(_qz);
    };
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
}

async function connectQZ() {
  if (_qzConn) return { ok: true };
  if (_qzConnecting) {
    await new Promise((r) => setTimeout(r, 2000));
    return _qzConn ? { ok: true } : { ok: false, error: 'Timeout' };
  }
  _qzConnecting = true;
  try {
    const qz = await loadQZ();
    if (!qz) throw new Error('QZ Tray library unavailable');
    if (!qz.websocket.isActive()) await qz.websocket.connect({ retries: 2, delay: 1 });
    _qzConn = true;
    qz.websocket.setClosedCallbacks(() => {
      _qzConn = false;
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  } finally {
    _qzConnecting = false;
  }
}

async function getQZPrinters() {
  const conn = await connectQZ();
  if (!conn.ok) return [];
  try {
    const qz = await loadQZ();
    return (await qz.printers.find()) || [];
  } catch {
    return [];
  }
}

async function qzPrintRaw(data, printerName) {
  const conn = await connectQZ();
  if (!conn.ok) return { ok: false, error: conn.error };
  try {
    const qz = await loadQZ();
    const config = qz.configs.create(printerName, { encoding: 'Cp1252', copies: 1 });
    await qz.print(config, [{ type: 'raw', format: 'plain', data }]);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ─── Browser print fallback (styled HTML) ─────────────────────────────────────
function browserPrintFallback(bill, settings = {}) {
  const s = { ...settings, ...(bill.settings || {}) };
  const cur = s.currency || 'INR';
  const fmtN = (n) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: 2,
    }).format(parseFloat(n || 0));

  const dateStr = new Date(bill.createdAt || Date.now()).toLocaleString('en-IN');

  const itemRows = (bill.items || [])
    .map(
      (it) => `
      <tr>
        <td style="padding:3px 2px;border-bottom:1px dotted #ddd">${it.name}</td>
        <td style="padding:3px 2px;border-bottom:1px dotted #ddd;text-align:center">${it.quantity}</td>
        <td style="padding:3px 2px;border-bottom:1px dotted #ddd;text-align:right">${fmtN(it.price)}</td>
        <td style="padding:3px 2px;border-bottom:1px dotted #ddd;text-align:right">${fmtN(it.total)}</td>
      </tr>`
    )
    .join('');

  let taxRows = '';
  if (s.taxType === 'GST_SPLIT' && parseFloat(bill.taxAmount) > 0) {
    taxRows = `
      <tr><td colspan="3" style="padding:2px">CGST (${s.cgst}%)</td><td style="text-align:right;padding:2px">${fmtN(bill.taxAmount / 2)}</td></tr>
      <tr><td colspan="3" style="padding:2px">SGST (${s.sgst}%)</td><td style="text-align:right;padding:2px">${fmtN(bill.taxAmount / 2)}</td></tr>`;
  } else if (parseFloat(bill.taxAmount) > 0) {
    taxRows = `<tr><td colspan="3" style="padding:2px">Tax (${s.taxPercent || 0}%)</td><td style="text-align:right;padding:2px">${fmtN(bill.taxAmount)}</td></tr>`;
  }

  const html = `<!DOCTYPE html><html><head><title>${bill.billNumber}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Courier New',monospace;font-size:12px;max-width:302px;margin:0 auto;padding:6px 4px}
      h2{text-align:center;font-size:15px;margin:4px 0}
      .c{text-align:center}.m{text-align:center;font-size:11px;color:#555;margin:2px 0}
      .d{border-top:1px dashed #aaa;margin:5px 0}.ds{border-top:2px solid #111;margin:5px 0}
      table{width:100%;border-collapse:collapse}
      th{font-size:10px;border-bottom:1px solid #aaa;padding:3px 2px;text-align:left}
      .tr td{font-weight:bold;font-size:14px;border-top:2px solid #111;padding:5px 2px}
      .foot{text-align:center;margin-top:8px;font-size:11px;color:#777;border-top:1px dashed #aaa;padding-top:6px}
      @media print{body{max-width:100%}@page{margin:2mm;size:80mm auto}}
    </style></head><body>
    ${s.showStoreName !== false && s.storeName ? `<h2>${s.storeName}</h2>` : ''}
    ${s.address ? `<p class="m">${s.address}</p>` : ''}
    ${s.showGST && s.gstNumber ? `<p class="m">GST: ${s.gstNumber}</p>` : ''}
    <div class="d"></div>
    <p class="m"><strong>${bill.billNumber}</strong></p>
    <p class="m">${dateStr}</p>
    <p class="m">Payment: <strong>${bill.paymentMode}</strong></p>
    ${bill.note ? `<p class="m">Note: ${bill.note}</p>` : ''}
    <div class="d"></div>
    <table>
      <thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Rate</th><th style="text-align:right">Amt</th></tr></thead>
      <tbody>${itemRows}</tbody>
      <tfoot>
        <tr><td colspan="3" style="padding:2px">Subtotal</td><td style="text-align:right;padding:2px">${fmtN(bill.subtotal)}</td></tr>
        ${parseFloat(bill.discount) > 0 ? `<tr><td colspan="3" style="padding:2px;color:#c00">Discount</td><td style="text-align:right;padding:2px;color:#c00">-${fmtN(bill.discount)}</td></tr>` : ''}
        ${taxRows}
        <tr class="tr"><td colspan="3">TOTAL</td><td style="text-align:right">${fmtN(bill.total)}</td></tr>
      </tfoot>
    </table>
    ${s.footerMessage ? `<div class="foot">${s.footerMessage}</div>` : '<div class="foot">Thank You! Visit Again</div>'}
    <script>window.onload=function(){window.print();setTimeout(function(){window.close();},600);}<\/script>
    </body></html>`;

  const win = window.open('', '_blank', 'width=380,height=620');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

// ─── Main print dispatcher ────────────────────────────────────────────────────
// Returns: { method: 'qz' | 'browser', ok: boolean, error?: string }
async function printBillAuto(bill, settings, printerName) {
  if (!printerName) {
    browserPrintFallback(bill, settings);
    return { method: 'browser', ok: true };
  }
  const escData = buildESCPOS(bill, settings);
  const result = await qzPrintRaw(escData, printerName);
  if (result.ok) return { method: 'qz', ok: true };
  // QZ failed → fallback
  console.warn('QZ print failed, browser fallback:', result.error);
  browserPrintFallback(bill, settings);
  return { method: 'browser', ok: true, error: result.error };
}

// ─────────────────────────────────────────────────────────────────────────────
// ── BARCODE INPUT COMPONENT ──────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
function BarcodeInput({ onScan, disabled = false }) {
  const inputRef = useRef(null);
  const [value, setValue] = useState('');
  const lockRef = useRef(null);

  useEffect(() => {
    if (disabled) return;
    const focus = () => {
      if (document.activeElement !== inputRef.current) inputRef.current?.focus();
    };
    focus();
    lockRef.current = setInterval(focus, 500);
    const onClick = (e) => {
      const tag = e.target.tagName.toLowerCase();
      const interactive = ['input', 'textarea', 'button', 'select', 'a'];
      if (!interactive.includes(tag) && !e.target.closest('[role="dialog"]'))
        setTimeout(() => inputRef.current?.focus(), 0);
    };
    document.addEventListener('click', onClick);
    return () => {
      clearInterval(lockRef.current);
      document.removeEventListener('click', onClick);
    };
  }, [disabled]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const barcode = value.trim();
      if (barcode) {
        onScan(barcode);
        setValue('');
      }
    }
  };

  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500">
        <ScanLine size={16} />
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Scan barcode (auto-focused)…"
        className="w-full pl-9 pr-4 py-2.5 rounded-xl border-2 border-blue-300 bg-blue-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 placeholder:text-blue-400 font-mono disabled:opacity-50"
        autoComplete="off"
        spellCheck={false}
        data-barcode-input="true"
      />
      {value && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-blue-500 font-mono bg-blue-100 px-1.5 py-0.5 rounded">
          {value.length}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── useBarcodeScanner hook ───────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
function useBarcodeScanner({
  localProducts,
  cartItems,
  addToCart,
  setDuplicateModal,
  setCreateProductModal,
}) {
  const handleScan = useCallback(
    (barcode) => {
      const product = findProductByBarcode(localProducts, barcode);
      if (!product) {
        setCreateProductModal({ barcode });
        return;
      }
      const existingIdx = cartItems.findIndex((i) => i.productId === product.id);
      if (existingIdx >= 0) setDuplicateModal({ product, existingIdx });
      else addToCart(product);
    },
    [localProducts, cartItems, addToCart, setDuplicateModal, setCreateProductModal]
  );
  return { handleScan };
}

// ─────────────────────────────────────────────────────────────────────────────
// ── CREATE PRODUCT MODAL ──────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
function CreateProductModal({ barcode, onClose, onCreated, settings }) {
  const [form, setForm] = useState({
    name: '',
    price: '',
    mrp: '',
    sku: '',
    quantity: '1',
    barcode: barcode || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const nameRef = useRef(null);

  useEffect(() => {
    setTimeout(() => nameRef.current?.focus(), 100);
  }, []);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.price) {
      setError('Name and price are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const token = getEmpToken();
      const res = await fetch('/api/store/product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: form.name.trim(),
          price: parseFloat(form.price),
          mrp: parseFloat(form.mrp || form.price),
          sku: form.sku.trim() || undefined,
          barcode: form.barcode.trim() || undefined,
          quantity: parseInt(form.quantity) || 1,
          description: '',
          images: [],
          category: [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create product');
      onCreated(data.product);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onKeyDown={handleKey}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <PackagePlus size={20} className="text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Create new product</h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">Barcode: {barcode}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X size={16} />
          </button>
        </div>
        {error && (
          <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
              Product Name *
            </label>
            <input
              ref={nameRef}
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Coconut Oil 500ml"
              className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                Selling Price *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                placeholder="0.00"
                className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                MRP
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.mrp}
                onChange={(e) => setForm((p) => ({ ...p, mrp: e.target.value }))}
                placeholder="Same as price"
                className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                SKU
              </label>
              <input
                type="text"
                value={form.sku}
                onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))}
                placeholder="Optional"
                className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                Opening Stock
              </label>
              <input
                type="number"
                min="0"
                value={form.quantity}
                onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
                className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
              Barcode
            </label>
            <input
              type="text"
              value={form.barcode}
              onChange={(e) => setForm((p) => ({ ...p, barcode: e.target.value }))}
              className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 font-mono focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <PackagePlus size={16} />
                Create &amp; Add to Cart
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-3 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl text-sm"
          >
            Cancel
          </button>
        </div>
        <p className="text-center text-[10px] text-slate-400 mt-3">
          Press Enter to save · Esc to cancel
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ══ PRINT SETTINGS MODAL (NEW) ═══════════════════════════════════════════════
// ─────────────────────────────────────────────────────────────────────────────
function PrintSettingsModal({
  onClose,
  printerName,
  onPrinterChange,
  qzStatus,
  settings,
  onTestPrint,
}) {
  const [printers, setPrinters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(printerName || '');
  const [testMsg, setTestMsg] = useState('');

  useEffect(() => {
    fetchPrinters();
  }, []);

  const fetchPrinters = async () => {
    setLoading(true);
    try {
      const list = await getQZPrinters();
      setPrinters(list);
    } catch (_) {
      setPrinters([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    onPrinterChange(selected);
    onClose();
  };

  
  const qzColors = {
    connected: 'bg-green-100 text-green-700 border-green-300',
    connecting: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    disconnected: 'bg-red-100 text-red-700 border-red-300',
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
            <Printer size={20} className="text-slate-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Print Settings</h3>
            <p className="text-xs text-slate-400">Thermal printer via QZ Tray</p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X size={16} />
          </button>
        </div>

        {/* QZ Status */}
        <div
          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium mb-4 ${qzColors[qzStatus] || qzColors.disconnected}`}
        >
          {qzStatus === 'connected' ? (
            <>
              <PlugZap size={15} /> QZ Tray connected — direct print ready
            </>
          ) : qzStatus === 'connecting' ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-current/40 border-t-current rounded-full animate-spin" />{' '}
              Connecting to QZ Tray…
            </>
          ) : (
            <>
              <Plug size={15} /> QZ Tray not running — will use browser print
            </>
          )}
        </div>

       

        {/* Printer selector */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
              Select Printer
            </label>
            <button
              onClick={fetchPrinters}
              disabled={loading}
              className="text-[10px] text-blue-600 hover:underline flex items-center gap-1"
            >
              <RefreshCw size={10} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
          {loading ? (
            <div className="text-sm text-slate-400 py-3 text-center">Loading printers…</div>
          ) : printers.length > 0 ? (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {/* Manual entry option */}
              <button
                onClick={() => setSelected('')}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm text-left transition-all ${!selected ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}
              >
                {!selected ? (
                  <CheckSquare size={15} />
                ) : (
                  <Square size={15} className="text-slate-300" />
                )}
                <span className="italic text-slate-400">None (use browser print)</span>
              </button>
              {printers.map((p) => (
                <button
                  key={p}
                  onClick={() => setSelected(p)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm text-left transition-all ${selected === p ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-slate-300 text-slate-700'}`}
                >
                  {selected === p ? (
                    <CheckSquare size={15} />
                  ) : (
                    <Square size={15} className="text-slate-300" />
                  )}
                  <Printer size={13} className="flex-shrink-0 text-slate-400" />
                  <span className="truncate">{p}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-slate-400 text-center py-2">
                {qzStatus !== 'connected' ? 'Connect QZ Tray to see printers' : 'No printers found'}
              </p>
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">
                  Or enter printer name manually:
                </label>
                <input
                  type="text"
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                  placeholder="e.g. TVS MSP 250 STAR"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 font-mono"
                />
              </div>
            </div>
          )}
        </div>

        

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold text-sm"
          >
            Save Settings
          </button>
          <button
            onClick={onClose}
            className="px-4 py-3 text-slate-500 hover:bg-slate-100 rounded-xl text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ══ MAIN COMPONENT ═══════════════════════════════════════════════════════════
// ─────────────────────────────────────────────────────────────────────────────
export default function EmployeeBillingPage() {
  // ── Auth/settings ──────────────────────────────────────────────
  const [employee, setEmployee] = useState(null);
  const [hasPermission, setHasPermission] = useState(null);
  const [settings, setSettings] = useState(null);

  // ── Tab ────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('billing');

  // ── Billing state ──────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [billDiscount, setBillDiscount] = useState(0);
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [successBill, setSuccessBill] = useState(null);
  const [queueCount, setQueueCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [duplicateModal, setDuplicateModal] = useState(null);
  const [activeSuggIdx, setActiveSuggIdx] = useState(-1);
  const [editingQty, setEditingQty] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [localProducts, setLocalProducts] = useState([]);

  // ── Barcode state ──────────────────────────────────────────────
  const [createProductModal, setCreateProductModal] = useState(null);
  const [lastScanFeedback, setLastScanFeedback] = useState(null);
  const [scanMode, setScanMode] = useState(true);

  // ── Print state (NEW) ─────────────────────────────────────────
  const [printerName, setPrinterName] = useState('');
  const [qzStatus, setQzStatus] = useState('disconnected'); // 'connected'|'connecting'|'disconnected'
  const [showPrintSettings, setShowPrintSettings] = useState(false);
  const [lastPrintMethod, setLastPrintMethod] = useState(null); // 'qz' | 'browser'

  // ── History state ──────────────────────────────────────────────
  const [historyBills, setHistoryBills] = useState([]);
  const [localBills, setLocalBills] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [todayStats, setTodayStats] = useState({ count: 0, revenue: 0 });
  const [historySearch, setHistorySearch] = useState('');
  const [historyPM, setHistoryPM] = useState('');
  const [historyDateFrom, setHistoryDateFrom] = useState('');
  const [historyDateTo, setHistoryDateTo] = useState('');
  const [expandedBill, setExpandedBill] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [queueBillIds, setQueueBillIds] = useState(new Set());

  // ── Refs ───────────────────────────────────────────────────────
  const searchRef = useRef(null);
  const syncTimerRef = useRef(null);
  const searchTimer = useRef(null);
  const apiCache = useRef({});
  const historyTimer = useRef(null);
  const feedbackTimer = useRef(null);

  // ── Computed ───────────────────────────────────────────────────
  const subtotal = cartItems.reduce((s, i) => s + i.price * i.quantity - (i.itemDiscount || 0), 0);
  const discounted = Math.max(0, subtotal - Number(billDiscount || 0));
  const taxResult = calculateTax(discounted, settings);
  const grandTotal = taxResult.total;
  const fmt = (n) => formatCurrency(n, settings);

  // ─────────────────────────────────────────────────────────────
  // Scan feedback
  // ─────────────────────────────────────────────────────────────
  const showScanFeedback = useCallback((type, message) => {
    clearTimeout(feedbackTimer.current);
    setLastScanFeedback({ type, message });
    feedbackTimer.current = setTimeout(() => setLastScanFeedback(null), 2000);
  }, []);

  // ─────────────────────────────────────────────────────────────
  // Init
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    // Auth
    const empRaw = localStorage.getItem('empData') || localStorage.getItem('employeeData');
    if (empRaw) {
      try {
        const emp = JSON.parse(empRaw);
        setEmployee(emp);
        const canBill = emp?.role === 'STORE_OWNER' || emp?.permissions?.billing === true;
        setHasPermission(canBill);
      } catch {
        setHasPermission(false);
      }
    } else {
      setHasPermission(false);
    }

    // Settings
    const token = getEmpToken();
    if (token) {
      fetch('/api/settings', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => setSettings(d.settings || null))
        .catch(console.error);
    }

    // Network
    const onOnline = () => {
      setIsOnline(true);
      triggerSync();
      refreshProductCache();
    };
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    setIsOnline(navigator.onLine);

    // Queue + local bills
    refreshQueueCount();
    idbGetAll(STORE_LOCAL).then((bills) =>
      setLocalBills(bills.sort((a, b) => b.createdAt - a.createdAt))
    );
    idbGetAll(STORE_QUEUE).then((q) => setQueueBillIds(new Set(q.map((b) => b.localId))));

    // Fullscreen
    const onFS = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFS);

    // Product cache
    const cached = getProductsFromCache();
    if (cached) setLocalProducts(cached);
    if (navigator.onLine) refreshProductCache();

    // ── QZ Tray init (NEW) ──────────────────────────────────────
    const savedPrinter = localStorage.getItem(LS_PRINTER_NAME) || '';
    setPrinterName(savedPrinter);
    initQZConnection();

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('fullscreenchange', onFS);
      clearTimeout(syncTimerRef.current);
      clearTimeout(feedbackTimer.current);
    };
  }, []); // eslint-disable-line

  // ── QZ connection init ────────────────────────────────────────
  const initQZConnection = async () => {
    setQzStatus('connecting');
    const result = await connectQZ();
    setQzStatus(result.ok ? 'connected' : 'disconnected');
  };

  // Save printer name to localStorage when changed
  const handlePrinterChange = (name) => {
    setPrinterName(name);
    try {
      localStorage.setItem(LS_PRINTER_NAME, name);
    } catch (_) {}
  };

  // ESC handler
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        setSuggestions([]);
        setShowSuggestions(false);
        if (createProductModal) setCreateProductModal(null);
        if (showPrintSettings) setShowPrintSettings(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [createProductModal, showPrintSettings]);

  useEffect(() => {
    if (hasPermission) setTimeout(() => searchRef.current?.focus(), 100);
  }, [hasPermission]);

  useEffect(() => {
    if (activeTab === 'history') loadHistory(1);
  }, [activeTab, historyPM, historyDateFrom, historyDateTo]); // eslint-disable-line

  useEffect(() => {
    if (activeTab !== 'history') return;
    clearTimeout(historyTimer.current);
    historyTimer.current = setTimeout(() => loadHistory(1), 400);
    return () => clearTimeout(historyTimer.current);
  }, [historySearch]); // eslint-disable-line

  // ─────────────────────────────────────────────────────────────
  // Product cache
  // ─────────────────────────────────────────────────────────────
  const refreshProductCache = async () => {
    try {
      const token = getEmpToken();
      const res = await fetch('/api/products?limit=500', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      const products = data.products || [];
      setLocalProducts(products);
      saveProductsToCache(products);
    } catch (e) {
      console.warn('Product cache refresh failed:', e);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // History
  // ─────────────────────────────────────────────────────────────
  const loadHistory = async (page = 1) => {
    setHistoryLoading(true);
    try {
      const token = getEmpToken();
      const params = new URLSearchParams({
        page: String(page),
        limit: '50',
        ...(historySearch && { search: historySearch }),
        ...(historyPM && { paymentMode: historyPM }),
        ...(historyDateFrom && { dateFrom: historyDateFrom }),
        ...(historyDateTo && { dateTo: historyDateTo }),
      });
      const res = await fetch(`/api/store/billing?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      setHistoryBills(data.bills || []);
      setHistoryTotal(data.total || 0);
      setHistoryPage(page);
      setTodayStats(data.todayStats || { count: 0, revenue: 0 });
    } catch (e) {
      console.warn('History load failed:', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Search (text mode)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (scanMode) return;
    clearTimeout(searchTimer.current);
    const q = searchQuery.trim();
    if (!q) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    if (!isOnline) {
      const results = searchLocal(localProducts, q);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setActiveSuggIdx(-1);
      return;
    }
    if (apiCache.current[q]) {
      setSuggestions(apiCache.current[q]);
      setShowSuggestions(apiCache.current[q].length > 0);
      setActiveSuggIdx(-1);
    }
    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const token = getEmpToken();
        const res = await fetch(`/api/products?search=${encodeURIComponent(q)}&limit=8`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        const results = data.products || [];
        apiCache.current[q] = results;
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
        setActiveSuggIdx(-1);
      } catch {
        const results = searchLocal(localProducts, q);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } finally {
        setSearchLoading(false);
      }
    }, 150);
    return () => clearTimeout(searchTimer.current);
  }, [searchQuery, isOnline, scanMode]); // eslint-disable-line

  // ─────────────────────────────────────────────────────────────
  // Fullscreen
  // ─────────────────────────────────────────────────────────────
  const toggleFullscreen = () => {
    if (!document.fullscreenElement)
      document.documentElement.requestFullscreen().catch(console.error);
    else document.exitFullscreen().catch(console.error);
  };

  // ─────────────────────────────────────────────────────────────
  // Keyboard nav
  // ─────────────────────────────────────────────────────────────
  const handleSearchKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && showSuggestions && suggestions.length) {
      e.preventDefault();
      const idx = activeSuggIdx >= 0 ? activeSuggIdx : 0;
      if (suggestions[idx]) addToCart(suggestions[idx]);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Cart
  // ─────────────────────────────────────────────────────────────
  const addToCart = useCallback(
    (product) => {
      const existing = cartItems.findIndex((i) => i.productId === product.id);
      if (existing >= 0) {
        setDuplicateModal({ product, existingIdx: existing });
        setSearchQuery('');
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }
      setCartItems((prev) => [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          itemDiscount: 0,
          total: product.price,
          sku: product.sku || '',
          barcode: product.barcode || '',
          stock: product.quantity || 0,
        },
      ]);
      setSearchQuery('');
      setSuggestions([]);
      setShowSuggestions(false);
      setActiveSuggIdx(-1);
      showScanFeedback('success', `✓ ${product.name}`);
      if (!scanMode) searchRef.current?.focus();
    },
    [cartItems, scanMode, showScanFeedback]
  );

  const { handleScan } = useBarcodeScanner({
    localProducts,
    cartItems,
    addToCart,
    setDuplicateModal,
    setCreateProductModal,
  });

  const handleBarcodeScanned = useCallback(
    (barcode) => {
      const product = findProductByBarcode(localProducts, barcode);
      if (!product) showScanFeedback('error', `Unknown: ${barcode}`);
      handleScan(barcode);
    },
    [localProducts, handleScan, showScanFeedback]
  );

  const handleDuplicateIncreaseQty = () => {
    if (!duplicateModal) return;
    updateQuantity(duplicateModal.existingIdx, cartItems[duplicateModal.existingIdx].quantity + 1);
    showScanFeedback('success', `+1 qty: ${duplicateModal.product.name}`);
    setDuplicateModal(null);
  };

  const handleDuplicateNewRow = () => {
    if (!duplicateModal) return;
    const p = duplicateModal.product;
    setCartItems((prev) => [
      ...prev,
      {
        productId: p.id + '_' + Date.now(),
        name: p.name,
        price: p.price,
        quantity: 1,
        itemDiscount: 0,
        total: p.price,
        sku: p.sku || '',
        barcode: p.barcode || '',
        stock: p.quantity || 0,
        _originalId: p.id,
      },
    ]);
    showScanFeedback('success', `New row: ${p.name}`);
    setDuplicateModal(null);
  };

  const handleProductCreated = useCallback(
    (product) => {
      setCreateProductModal(null);
      setLocalProducts((prev) => {
        const u = [...prev, product];
        saveProductsToCache(u);
        return u;
      });
      apiCache.current = {};
      setCartItems((prev) => [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          itemDiscount: 0,
          total: product.price,
          sku: product.sku || '',
          barcode: product.barcode || '',
          stock: product.quantity || 0,
        },
      ]);
      showScanFeedback('success', `Created & added: ${product.name}`);
      setTimeout(refreshProductCache, 1000);
    },
    [showScanFeedback]
  ); // eslint-disable-line

  const updateQuantity = (idx, qty) => {
    const item = cartItems[idx];
    const newQty = Math.max(1, Math.min(qty, item.stock || 9999));
    setCartItems((prev) =>
      prev.map((it, i) =>
        i === idx
          ? { ...it, quantity: newQty, total: it.price * newQty - (it.itemDiscount || 0) }
          : it
      )
    );
  };

  const updateItemDiscount = (idx, disc) => {
    const item = cartItems[idx];
    const d = Math.max(0, Math.min(Number(disc || 0), item.price * item.quantity));
    setCartItems((prev) =>
      prev.map((it, i) =>
        i === idx ? { ...it, itemDiscount: d, total: it.price * it.quantity - d } : it
      )
    );
  };

  const removeItem = (idx) => setCartItems((prev) => prev.filter((_, i) => i !== idx));
  const clearCart = () => {
    setCartItems([]);
    setBillDiscount(0);
    setNote('');
    setPaymentMode('CASH');
  };

  // ─────────────────────────────────────────────────────────────
  // Complete bill
  // ─────────────────────────────────────────────────────────────
  const completeBill = async () => {
    if (!cartItems.length) return;
    setLoading(true);

    const localId = `ebill_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const billNumber = generateBillNumber();
    const now = Date.now();

    const billData = {
      localId,
      billNumber,
      subtotal: parseFloat(subtotal.toFixed(2)),
      discount: parseFloat(Number(billDiscount || 0).toFixed(2)),
      taxAmount: parseFloat(taxResult.taxAmount.toFixed(2)),
      total: parseFloat(grandTotal.toFixed(2)),
      paymentMode,
      note: note || null,
      createdAt: now,
      synced: false,
      items: cartItems.map((it) => ({
        productId: it._originalId || it.productId,
        name: it.name,
        price: it.price,
        quantity: it.quantity,
        discount: it.itemDiscount || 0,
        total: parseFloat((it.price * it.quantity - (it.itemDiscount || 0)).toFixed(2)),
      })),
      settings: {
        storeName: settings?.storeName,
        gstNumber: settings?.gstNumber,
        address: settings?.address,
        taxType: settings?.taxType,
        taxPercent: settings?.taxPercent,
        cgst: settings?.cgst,
        sgst: settings?.sgst,
        footerMessage: settings?.footerMessage,
        currency: settings?.currency,
        showGST: settings?.showGST,
        showStoreName: settings?.showStoreName,
      },
    };

    try {
      await idbPut(STORE_LOCAL, billData);
      await idbPut(STORE_QUEUE, billData);
      setLocalBills((prev) => [billData, ...prev].slice(0, 200));
      setQueueBillIds((prev) => new Set([...prev, localId]));

      if (isOnline) {
        const token = getEmpToken();
        fetch('/api/inventory/deduct', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            billId: billNumber,
            items: cartItems.map((it) => ({
              productId: it._originalId || it.productId,
              quantity: it.quantity,
            })),
          }),
        }).catch(console.error);
      }

      setSuccessBill(billData);
      await refreshQueueCount();
      clearCart();
      triggerSync();

      // ── PRINT (QZ Tray → browser fallback) ─────────────────
      setTimeout(async () => {
        const result = await printBillAuto(billData, settings, printerName);
        setLastPrintMethod(result.method);
        if (!result.ok) {
          console.warn('Print failed:', result.error);
        }
      }, 400);

      if (activeTab === 'history') loadHistory(1);
    } catch (err) {
      console.error('completeBill error:', err);
      alert('Failed to save bill. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Sync
  // ─────────────────────────────────────────────────────────────
  const triggerSync = useCallback(() => {
    clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(runSync, 1500);
  }, []); // eslint-disable-line

  const runSync = async () => {
    if (syncing) return;
    const queue = await idbGetAll(STORE_QUEUE);
    if (!queue.length) return;
    setSyncing(true);
    try {
      const token = getEmpToken();
      const res = await fetch('/api/store/billing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(queue),
      });
      if (!res.ok) throw new Error('sync failed');
      const { saved = [] } = await res.json();
      for (const { localId } of saved) {
        await idbDelete(STORE_QUEUE, localId);
        const allLocal = await idbGetAll(STORE_LOCAL);
        const bill = allLocal.find((b) => b.localId === localId);
        if (bill) await idbPut(STORE_LOCAL, { ...bill, synced: true });
      }
      const remaining = await idbGetAll(STORE_QUEUE);
      setQueueBillIds(new Set(remaining.map((b) => b.localId)));
      idbGetAll(STORE_LOCAL).then((bills) =>
        setLocalBills(bills.sort((a, b) => b.createdAt - a.createdAt))
      );
      await refreshQueueCount();
      if (activeTab === 'history') loadHistory(historyPage);
    } catch {
      syncTimerRef.current = setTimeout(runSync, 30000);
    } finally {
      setSyncing(false);
    }
  };

  const refreshQueueCount = async () => {
    const c = await idbCount(STORE_QUEUE).catch(() => 0);
    setQueueCount(c);
  };

  // ─────────────────────────────────────────────────────────────
  // Merged history
  // ─────────────────────────────────────────────────────────────
  const mergedHistoryBills = () => {
    const dbSet = new Set(historyBills.map((b) => b.billNumber));
    const unsyncedLocal = localBills.filter((b) => !dbSet.has(b.billNumber));
    return [
      ...unsyncedLocal.map((b) => ({
        ...b,
        _source: 'local',
        _synced: !queueBillIds.has(b.localId),
      })),
      ...historyBills.map((b) => ({ ...b, _source: 'db', _synced: true })),
    ];
  };

  const taxLabel =
    settings?.taxType === 'GST_SPLIT'
      ? `GST (CGST ${settings.cgst}% + SGST ${settings.sgst}%)`
      : `Tax (${settings?.taxPercent || 0}%)`;

  // ─── QZ status indicator config ──────────────────────────────
  const qzIndicator = {
    connected: {
      cls: 'bg-green-50 text-green-700 border-green-200',
      dot: 'bg-green-500',
      label: 'QZ Ready',
    },
    connecting: {
      cls: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      dot: 'bg-yellow-400 animate-pulse',
      label: 'QZ Connecting…',
    },
    disconnected: {
      cls: 'bg-slate-50 text-slate-500 border-slate-200',
      dot: 'bg-slate-300',
      label: 'Browser Print',
    },
  }[qzStatus] || {
    cls: 'bg-slate-50 text-slate-500 border-slate-200',
    dot: 'bg-slate-300',
    label: 'Browser Print',
  };

  // ─────────────────────────────────────────────────────────────
  // Permission gate
  // ─────────────────────────────────────────────────────────────
  if (hasPermission === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
          <ShieldAlert size={32} className="text-red-500" />
        </div>
        <div>
          <h2 className="font-bold text-slate-800 text-lg">Access Denied</h2>
          <p className="text-slate-500 text-sm mt-1">
            You don't have permission to access billing.
          </p>
          <p className="text-slate-400 text-xs mt-1">
            Ask your store owner to enable billing permission.
          </p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      {/* ── TOP BAR ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-200 shadow-sm z-20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Receipt size={20} className="text-blue-500" />
            <span className="font-bold text-slate-800 text-base tracking-tight">POS Billing</span>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
              EMPLOYEE
            </span>
          </div>

          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 ml-2">
            <button
              onClick={() => setActiveTab('billing')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'billing' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <ShoppingCart size={12} /> New Bill
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'history' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <History size={12} /> History
              {localBills.length > 0 && (
                <span className="bg-blue-400 text-white text-[9px] px-1.5 rounded-full ml-0.5">
                  {localBills.length}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isOnline && (
            <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-1 rounded-lg font-semibold border border-orange-200">
              ⚡ Offline — {localProducts.length} cached
            </span>
          )}

          {/* ── QZ STATUS + PRINT SETTINGS BUTTON (NEW) ── */}
          <button
            onClick={() => setShowPrintSettings(true)}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium border transition-all ${qzIndicator.cls}`}
            title="Print settings"
          >
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${qzIndicator.dot}`} />
            {qzIndicator.label}
            <Settings size={11} />
          </button>

          {printerName && (
            <span
              className="hidden md:flex items-center gap-1 text-[10px] text-slate-400 border border-slate-200 px-2 py-1.5 rounded-lg bg-slate-50 max-w-[120px] truncate"
              title={printerName}
            >
              <Printer size={10} /> {printerName}
            </span>
          )}

          <button
            onClick={runSync}
            disabled={syncing || queueCount === 0}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all ${queueCount > 0 ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}
          >
            <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
            {queueCount > 0 ? `${queueCount} unsynced` : 'Synced'}
          </button>

          <div
            className={`flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-lg ${isOnline ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50'}`}
          >
            {isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
            {isOnline ? 'Online' : 'Offline'}
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
          >
            {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
          </button>
        </div>
      </div>

      {/* ── CONTENT ─────────────────────────────────────────────── */}
      {activeTab === 'billing' ? (
        <div className="flex flex-1 overflow-hidden">
          {/* LEFT */}
          <div className="flex flex-col w-full lg:w-[58%] xl:w-[62%] border-r border-slate-200 bg-white overflow-hidden">
            {/* Input area */}
            <div className="p-4 border-b border-slate-100 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                  <button
                    onClick={() => setScanMode(true)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${scanMode ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <ScanLine size={12} /> Scanner
                  </button>
                  <button
                    onClick={() => {
                      setScanMode(false);
                      setTimeout(() => searchRef.current?.focus(), 50);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${!scanMode ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <Search size={12} /> Search
                  </button>
                </div>

                {lastScanFeedback && (
                  <span
                    className={`text-xs font-medium px-3 py-1 rounded-full transition-all ${lastScanFeedback.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                  >
                    {lastScanFeedback.message}
                  </span>
                )}

                <div className="text-[10px] text-slate-400">
                  {localProducts.length} products cached
                </div>
              </div>

              {scanMode && (
                <BarcodeInput
                  onScan={handleBarcodeScanned}
                  disabled={
                    !!duplicateModal ||
                    !!createProductModal ||
                    !!showPrintSettings ||
                    activeTab !== 'billing'
                  }
                />
              )}

              {!scanMode && (
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {searchLoading ? (
                      <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
                    ) : (
                      <Search size={15} />
                    )}
                  </div>
                  <input
                    ref={searchRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    onFocus={() => suggestions.length && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
                    placeholder={
                      isOnline
                        ? 'Type product name / SKU / barcode…'
                        : '🔌 Offline — searching local cache…'
                    }
                    className="w-full pl-9 pr-20 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder:text-slate-400"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-300">
                    <Barcode size={14} />
                    <span className="text-[10px] font-mono">TYPE</span>
                  </div>

                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-40 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden mt-1">
                      {suggestions.map((p, i) => (
                        <button
                          key={p.id}
                          onMouseDown={() => addToCart(p)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-blue-50 ${i === activeSuggIdx ? 'bg-blue-50' : ''} ${i !== 0 ? 'border-t border-slate-100' : ''}`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {p.sku && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  SKU: {p.sku}
                                </span>
                              )}
                              {p.barcode && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  <Barcode size={9} className="inline" />
                                  {p.barcode}
                                </span>
                              )}
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${p.quantity > 10 ? 'bg-green-100 text-green-700' : p.quantity > 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}
                              >
                                {p.quantity > 0 ? `${p.quantity} in stock` : 'Out of stock'}
                              </span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-bold text-slate-800">{fmt(p.price)}</p>
                            {p.mrp > p.price && (
                              <p className="text-[10px] text-slate-400 line-through">
                                {fmt(p.mrp)}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Cart */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                  <ShoppingCart size={52} strokeWidth={1} className="text-slate-200" />
                  <div>
                    <p className="font-medium text-slate-500">Cart is empty</p>
                    <p className="text-sm text-slate-400 mt-1">
                      {scanMode
                        ? 'Scan a product barcode to add it'
                        : 'Search or type a product name'}
                    </p>
                  </div>
                  {scanMode ? (
                    <div className="flex items-center gap-2 text-xs bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                      <ScanLine size={12} className="text-blue-500" />
                      <span className="text-blue-700">
                        Scanner is ready — barcode input is always focused
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                      <Zap size={12} className="text-blue-500" />
                      <span className="text-blue-700">
                        Press{' '}
                        <kbd className="bg-white border border-blue-300 rounded px-1 font-mono text-[10px]">
                          Enter
                        </kbd>{' '}
                        to add first result
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                cartItems.map((item, idx) => (
                  <div
                    key={item.productId}
                    className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-500">{fmt(item.price)} each</span>
                        {item.barcode && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            <Barcode size={9} className="inline mr-0.5" />
                            {item.barcode}
                          </span>
                        )}
                        {item.stock !== undefined && item.stock <= 10 && (
                          <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 rounded-full">
                            Low: {item.stock}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1.5">
                        <Tag size={9} className="text-slate-400" />
                        <span className="text-[10px] text-slate-400">Discount:</span>
                        <input
                          type="number"
                          min="0"
                          value={item.itemDiscount || ''}
                          placeholder="0"
                          onChange={(e) => updateItemDiscount(idx, e.target.value)}
                          className="w-16 text-[11px] border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-300"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => updateQuantity(idx, item.quantity - 1)}
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
                      >
                        <Minus size={13} />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={editingQty?.idx === idx ? editingQty.value : item.quantity}
                        onChange={(e) => setEditingQty({ idx, value: e.target.value })}
                        onBlur={() => {
                          if (editingQty?.idx === idx) {
                            updateQuantity(idx, parseInt(editingQty.value) || 1);
                            setEditingQty(null);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            updateQuantity(idx, parseInt(editingQty?.value || item.quantity) || 1);
                            setEditingQty(null);
                          }
                        }}
                        className="w-12 text-center text-sm font-bold border border-slate-200 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-blue-300"
                      />
                      <button
                        onClick={() => updateQuantity(idx, item.quantity + 1)}
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                    <div className="text-right flex-shrink-0 w-20">
                      <p className="text-sm font-bold text-slate-800">
                        {fmt(item.price * item.quantity - (item.itemDiscount || 0))}
                      </p>
                    </div>
                    <button
                      onClick={() => removeItem(idx)}
                      className="w-7 h-7 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center flex-shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="p-3 border-t border-slate-100 flex-shrink-0">
                <button
                  onClick={clearCart}
                  className="w-full text-xs text-slate-400 hover:text-red-500 hover:bg-red-50 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={12} /> Clear all items
                </button>
              </div>
            )}
          </div>

          {/* RIGHT */}
          <div className="flex flex-col w-full lg:w-[42%] xl:w-[38%] bg-white overflow-y-auto">
            <div className="flex-1 p-4 space-y-4">
              {/* Summary */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Bill Summary
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">
                      Items ({cartItems.reduce((s, i) => s + i.quantity, 0)})
                    </span>
                    <span className="font-medium">{fmt(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Tag size={12} className="text-slate-400" />
                      <span className="text-sm text-slate-600">Bill discount</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-slate-500">-</span>
                      <input
                        type="number"
                        min="0"
                        value={billDiscount || ''}
                        onChange={(e) => setBillDiscount(e.target.value)}
                        placeholder="0.00"
                        className="w-24 text-right text-sm border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                      />
                    </div>
                  </div>
                  {Number(billDiscount) > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>After discount</span>
                      <span className="font-medium">{fmt(discounted)}</span>
                    </div>
                  )}
                  {taxResult.taxAmount > 0 && (
                    <div className="flex justify-between text-sm text-slate-500">
                      <span>{taxLabel}</span>
                      <span>+{fmt(taxResult.taxAmount)}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-200 pt-2 flex justify-between">
                    <span className="font-bold text-slate-800">Total</span>
                    <span className="font-bold text-xl text-slate-900">{fmt(grandTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Payment */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Payment Mode
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {PAYMENT_MODES.map((pm) => (
                    <button
                      key={pm.id}
                      onClick={() => setPaymentMode(pm.id)}
                      className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all text-xs font-medium ${paymentMode === pm.id ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'}`}
                    >
                      <pm.icon size={18} />
                      {pm.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Note
                </h3>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Customer name, phone, or any note…"
                  rows={2}
                  className="w-full text-sm border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-slate-50 resize-none placeholder:text-slate-400"
                />
              </div>

              {/* Print method indicator (NEW) */}
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs border ${qzStatus === 'connected' && printerName ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
              >
                <Printer size={13} />
                {qzStatus === 'connected' && printerName ? (
                  <>
                    <span className="font-medium">Direct print:</span> {printerName}
                  </>
                ) : (
                  <>
                    <span>Will use browser print dialog</span>
                    <button
                      onClick={() => setShowPrintSettings(true)}
                      className="ml-auto underline hover:text-blue-600"
                    >
                      Set printer
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Complete button */}
            <div className="p-4 border-t border-slate-200 flex-shrink-0">
              <button
                onClick={completeBill}
                disabled={!cartItems.length || loading}
                className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-lg ${cartItems.length && !loading ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 hover:shadow-xl active:scale-[0.98]' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}`}
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />{' '}
                    Saving…
                  </>
                ) : (
                  <>
                    <CheckCircle size={20} /> Complete Bill · {fmt(grandTotal)}
                  </>
                )}
              </button>
              <p className="text-center text-xs text-slate-400 mt-2">
                {qzStatus === 'connected' && printerName
                  ? '⚡ Prints directly to thermal printer'
                  : isOnline
                    ? 'Saves & syncs instantly · Opens print dialog'
                    : '⚡ Saves offline · Syncs when online'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* ══════════════════ HISTORY TAB ══════════════════ */
        <div className="flex flex-col flex-1 overflow-hidden bg-slate-50">
          <div className="bg-white border-b border-slate-200 px-5 py-4 flex-shrink-0">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
                <TrendingUp size={16} className="text-blue-600" />
                <div>
                  <p className="text-[10px] text-blue-600 font-medium uppercase tracking-wide">
                    Today's Revenue
                  </p>
                  <p className="text-base font-bold text-blue-700">{fmt(todayStats.revenue)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
                <Receipt size={16} className="text-slate-600" />
                <div>
                  <p className="text-[10px] text-slate-600 font-medium uppercase tracking-wide">
                    Today's Bills
                  </p>
                  <p className="text-base font-bold text-slate-700">{todayStats.count}</p>
                </div>
              </div>
              {queueCount > 0 && (
                <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5">
                  <AlertTriangle size={16} className="text-orange-600" />
                  <div>
                    <p className="text-[10px] text-orange-600 font-medium uppercase tracking-wide">
                      Unsynced
                    </p>
                    <p className="text-base font-bold text-orange-700">{queueCount}</p>
                  </div>
                </div>
              )}
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => loadHistory(1)}
                  disabled={historyLoading}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-100 border border-slate-200 transition-colors"
                >
                  <RefreshCw size={12} className={historyLoading ? 'animate-spin' : ''} /> Refresh
                </button>
                <button
                  onClick={() => setShowFilters((v) => !v)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition-colors ${showFilters ? 'bg-blue-50 text-blue-700 border-blue-200' : 'text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                >
                  <Filter size={12} /> Filters
                  <ChevronDown
                    size={11}
                    className={`transition-transform ${showFilters ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>
            </div>

            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search bills by number, note…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
            </div>

            {showFilters && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                <div>
                  <label className="text-[10px] text-slate-500 font-medium uppercase tracking-wide block mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={historyPM}
                    onChange={(e) => setHistoryPM(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    <option value="">All modes</option>
                    {PAYMENT_MODES.map((pm) => (
                      <option key={pm.id} value={pm.id}>
                        {pm.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-medium uppercase tracking-wide block mb-1">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={historyDateFrom}
                    onChange={(e) => setHistoryDateFrom(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-medium uppercase tracking-wide block mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={historyDateTo}
                    onChange={(e) => setHistoryDateTo(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setHistorySearch('');
                      setHistoryPM('');
                      setHistoryDateFrom('');
                      setHistoryDateTo('');
                    }}
                    className="w-full text-sm text-slate-500 hover:text-red-500 border border-slate-200 rounded-lg px-3 py-2 hover:bg-red-50 transition-colors"
                  >
                    Clear filters
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {historyLoading && historyBills.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <div className="w-8 h-8 border-3 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
                <p className="text-sm text-slate-400">Loading bills…</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {mergedHistoryBills().map((bill) => {
                    const isSynced = bill._synced !== false;
                    const isExpanded = expandedBill === (bill.id || bill.localId);
                    const createdAt =
                      bill.createdAt instanceof Date ? bill.createdAt : new Date(bill.createdAt);
                    return (
                      <div
                        key={bill.id || bill.localId}
                        className={`bg-white rounded-xl border transition-all ${isExpanded ? 'border-blue-200 shadow-md' : 'border-slate-200 hover:border-slate-300'}`}
                      >
                        <div className="flex items-center gap-3 p-3.5">
                          <div
                            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isSynced ? 'bg-green-400' : 'bg-orange-400 animate-pulse'}`}
                            title={isSynced ? 'Synced' : 'Pending sync'}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-bold text-slate-800">{bill.billNumber}</p>
                              {!isSynced && (
                                <span className="text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-medium">
                                  OFFLINE
                                </span>
                              )}
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${PM_COLORS[bill.paymentMode] || PM_COLORS.OTHER}`}
                              >
                                {bill.paymentMode}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5">
                              <p className="text-xs text-slate-400">
                                {createdAt.toLocaleString('en-IN')}
                              </p>
                              <span className="text-xs text-slate-400">
                                {bill.items?.length || 0} item(s)
                              </span>
                              {bill.note && (
                                <span className="text-xs text-slate-400 truncate max-w-[120px]">
                                  "{bill.note}"
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <p className="font-bold text-slate-800 text-sm">{fmt(bill.total)}</p>
                            <button
                              onClick={() => printBillAuto(bill, settings, printerName)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Print"
                            >
                              <Printer size={14} />
                            </button>
                            <button
                              onClick={() =>
                                setExpandedBill(isExpanded ? null : bill.id || bill.localId)
                              }
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                              title="View items"
                            >
                              <Eye size={14} />
                            </button>
                          </div>
                        </div>

                        {isExpanded && bill.items?.length > 0 && (
                          <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                            <div className="bg-slate-50 rounded-lg overflow-hidden">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-slate-200">
                                    <th className="text-left py-2 px-3 text-slate-500 font-medium">
                                      Item
                                    </th>
                                    <th className="text-center py-2 px-3 text-slate-500 font-medium">
                                      Qty
                                    </th>
                                    <th className="text-right py-2 px-3 text-slate-500 font-medium">
                                      Price
                                    </th>
                                    <th className="text-right py-2 px-3 text-slate-500 font-medium">
                                      Total
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {bill.items.map((item, i) => (
                                    <tr
                                      key={i}
                                      className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                                    >
                                      <td className="py-2 px-3 text-slate-700 font-medium">
                                        {item.name}
                                      </td>
                                      <td className="py-2 px-3 text-center text-slate-600">
                                        {item.quantity}
                                      </td>
                                      <td className="py-2 px-3 text-right text-slate-600">
                                        {fmt(item.price)}
                                      </td>
                                      <td className="py-2 px-3 text-right font-medium text-slate-800">
                                        {fmt(item.total)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot className="border-t border-slate-200">
                                  {bill.discount > 0 && (
                                    <tr>
                                      <td
                                        colSpan={3}
                                        className="py-1.5 px-3 text-slate-500 text-right"
                                      >
                                        Discount
                                      </td>
                                      <td className="py-1.5 px-3 text-right text-green-600">
                                        -{fmt(bill.discount)}
                                      </td>
                                    </tr>
                                  )}
                                  {bill.taxAmount > 0 && (
                                    <tr>
                                      <td
                                        colSpan={3}
                                        className="py-1.5 px-3 text-slate-500 text-right"
                                      >
                                        Tax
                                      </td>
                                      <td className="py-1.5 px-3 text-right text-slate-600">
                                        +{fmt(bill.taxAmount)}
                                      </td>
                                    </tr>
                                  )}
                                  <tr>
                                    <td
                                      colSpan={3}
                                      className="py-2 px-3 text-right font-bold text-slate-700"
                                    >
                                      Grand Total
                                    </td>
                                    <td className="py-2 px-3 text-right font-bold text-blue-600">
                                      {fmt(bill.total)}
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {mergedHistoryBills().length === 0 && !historyLoading && (
                    <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
                      <Receipt size={40} strokeWidth={1} />
                      <p className="text-sm font-medium">No bills found</p>
                      <p className="text-xs">Bills you create will appear here</p>
                    </div>
                  )}
                </div>

                {historyTotal > 50 && (
                  <div className="flex items-center justify-center gap-3 mt-6">
                    <button
                      onClick={() => loadHistory(historyPage - 1)}
                      disabled={historyPage <= 1 || historyLoading}
                      className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-slate-500">
                      Page {historyPage} · {historyTotal} total
                    </span>
                    <button
                      onClick={() => loadHistory(historyPage + 1)}
                      disabled={historyPage * 50 >= historyTotal || historyLoading}
                      className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── SUCCESS TOAST ─────────────────────────────────────── */}
      {successBill && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-medium">
          <CheckCircle size={18} />
          <div className="flex flex-col">
            <span>Bill {successBill.billNumber} saved!</span>
            {lastPrintMethod && (
              <span className="text-[10px] text-green-200 mt-0.5">
                {lastPrintMethod === 'qz' ? '🖨 Printed via QZ Tray' : '🌐 Opened browser print'}
              </span>
            )}
          </div>
          <button
            onClick={() => printBillAuto(successBill, settings, printerName)}
            className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-lg text-xs"
          >
            <Printer size={12} /> Reprint
          </button>
          <button onClick={() => setSuccessBill(null)} className="ml-1 hover:text-white/70">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── DUPLICATE MODAL ───────────────────────────────────── */}
      {duplicateModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          role="dialog"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertCircle size={20} className="text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Already in cart</h3>
                <p className="text-sm text-slate-500">{duplicateModal.product.name}</p>
                {duplicateModal.product.barcode && (
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    <Barcode size={9} className="inline mr-0.5" />
                    {duplicateModal.product.barcode}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <button
                onClick={handleDuplicateIncreaseQty}
                className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium text-sm"
              >
                + Increase qty (→ {cartItems[duplicateModal.existingIdx]?.quantity + 1})
              </button>
              <button
                onClick={handleDuplicateNewRow}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-sm"
              >
                Add as new line
              </button>
              <button
                onClick={() => setDuplicateModal(null)}
                className="w-full py-2.5 text-slate-400 hover:text-slate-600 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE PRODUCT MODAL ──────────────────────────────── */}
      {createProductModal && (
        <CreateProductModal
          barcode={createProductModal.barcode}
          onClose={() => setCreateProductModal(null)}
          onCreated={handleProductCreated}
          settings={settings}
        />
      )}

      {/* ── PRINT SETTINGS MODAL (NEW) ────────────────────────── */}
      {showPrintSettings && (
        <PrintSettingsModal
          onClose={() => setShowPrintSettings(false)}
          printerName={printerName}
          onPrinterChange={handlePrinterChange}
          qzStatus={qzStatus}
          settings={settings}
          onTestPrint={() => {}}
        />
      )}
    </div>
  );
}
