// lib/features/cart/cartSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Load initial state from localStorage
const loadState = () => {
    try {
        const serializedState = localStorage.getItem('redux-state');
        if (serializedState === null) {
            return undefined;
        }
        const state = JSON.parse(serializedState);
        return state.cart; // Return only cart part of state
    } catch (err) {
        return undefined;
    }
};

// =========================
// 🔥 ASYNC THUNKS
// =========================

export const fetchCartThunk = createAsyncThunk(
    'cart/fetchCart',
    async({ getToken }) => {
        const token = await getToken();
        const response = await fetch('/api/cart', {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return await response.json();
    }
);

export const uploadCartThunk = createAsyncThunk(
    'cart/uploadCart',
    async({ getToken }, { getState }) => {
        const token = await getToken();
        const state = getState();
        const cartData = state.cart.items;

        const response = await fetch('/api/cart', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ items: cartData }),
        });

        return await response.json();
    }
);

// =========================
// 🔥 INITIAL STATE
// =========================

const savedState = loadState();

const initialState = savedState || {
    items: [],
    totalPrice: 0,
    total: 0,
    loading: false,
};

// =========================
// 🔥 SLICE
// =========================

const cartSlice = createSlice({
    name: 'cart',
    initialState,
    reducers: {
        addToCart: (state, action) => {
            const { product } = action.payload;
            const existingItem = state.items.find(item => item.id === product.id);

            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                state.items.push({...product, quantity: 1 });
            }

            state.totalPrice = state.items.reduce(
                (total, item) => total + item.price * item.quantity, 0
            );
            state.total = state.items.length;

            // Save to localStorage
            try {
                const serializedState = JSON.stringify({ cart: state });
                localStorage.setItem('redux-state', serializedState);
            } catch (err) {
                // Handle errors
                console.error("Could not save state to localStorage", err);
            }
        },

        removeFromCart: (state, action) => {
            const productId = action.payload;
            state.items = state.items.filter(item => item.id !== productId);

            state.totalPrice = state.items.reduce(
                (total, item) => total + item.price * item.quantity, 0
            );
            state.total = state.items.length;

            // Save to localStorage
            try {
                const serializedState = JSON.stringify({ cart: state });
                localStorage.setItem('redux-state', serializedState);
            } catch (err) {
                // Handle errors
                console.error("Could not save state to localStorage", err);
            }
        },

        updateCartQuantity: (state, action) => {
            const { id, quantity } = action.payload;
            const item = state.items.find(item => item.id === id);

            if (item) item.quantity = quantity;

            state.totalPrice = state.items.reduce(
                (total, item) => total + item.price * item.quantity, 0
            );

            // Save to localStorage
            try {
                const serializedState = JSON.stringify({ cart: state });
                localStorage.setItem('redux-state', serializedState);
            } catch (err) {
                // Handle errors
                console.error("Could not save state to localStorage", err);
            }
        },

        clearCart: (state) => {
            state.items = [];
            state.totalPrice = 0;
            state.total = 0;

            // Save to localStorage
            try {
                const serializedState = JSON.stringify({ cart: state });
                localStorage.setItem('redux-state', serializedState);
            } catch (err) {
                // Handle errors
                console.error("Could not save state to localStorage", err);
            }
        }
    },

    extraReducers: (builder) => {
        builder
            .addCase(fetchCartThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchCartThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.items = action.payload.items || [];
                state.totalPrice = action.payload.totalPrice || 0;
                state.total = state.items.length;

                // Save to localStorage
                try {
                    const serializedState = JSON.stringify({ cart: state });
                    localStorage.setItem('redux-state', serializedState);
                } catch (err) {
                    // Handle errors
                    console.error("Could not save state to localStorage", err);
                }
            })
            .addCase(uploadCartThunk.fulfilled, (state) => {
                state.loading = false;
            });
    }
});

// =========================
// 🔥 EXPORTS
// =========================

export const { addToCart, removeFromCart, updateCartQuantity, clearCart } = cartSlice.actions;
export default cartSlice.reducer;