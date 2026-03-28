// lib/features/cart/cartSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// =========================
// ASYNC THUNKS
// =========================

// Fetch cart from DB
export const fetchCartThunk = createAsyncThunk(
  'cart/fetchCart',
  async ({ getToken }, { rejectWithValue }) => {
    try {
      const token = await getToken();
      const response = await fetch('/api/cart', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch cart');
      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Upload cart to DB
export const uploadCartThunk = createAsyncThunk(
  'cart/uploadCart',
  async ({ getToken }, { getState, rejectWithValue }) => {
    try {
      const token = await getToken();
      const items = getState().cart.items;

      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        // ✅ send as "items" — matches what cart route accepts
        body: JSON.stringify({ items }),
      });
      if (!response.ok) throw new Error('Failed to upload cart');
      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// =========================
// INITIAL STATE
// =========================

const initialState = {
  items: [],
  totalPrice: 0,
  total: 0,
  loading: false,
  error: null,
};

// =========================
// HELPERS
// =========================

function recalculate(state) {
  state.totalPrice = state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  state.total = state.items.length;
}

// =========================
// SLICE
// =========================

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action) => {
      const { product } = action.payload;
      const existing = state.items.find((item) => item.id === product.id);
      if (existing) {
        existing.quantity += 1;
      } else {
        state.items.push({ ...product, quantity: 1 });
      }
      recalculate(state);
    },

    removeFromCart: (state, action) => {
      state.items = state.items.filter((item) => item.id !== action.payload);
      recalculate(state);
    },

    updateCartQuantity: (state, action) => {
      const { id, quantity } = action.payload;
      const item = state.items.find((item) => item.id === id);
      if (item) item.quantity = Math.max(1, quantity);
      recalculate(state);
    },

    clearCart: (state) => {
      state.items = [];
      state.totalPrice = 0;
      state.total = 0;
    },
  },

  extraReducers: (builder) => {
    // fetchCart
    builder
      .addCase(fetchCartThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCartThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.items || [];
        recalculate(state);
      })
      .addCase(fetchCartThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // uploadCart
    builder
      .addCase(uploadCartThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(uploadCartThunk.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(uploadCartThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { addToCart, removeFromCart, updateCartQuantity, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
