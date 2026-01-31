'use client';

import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '@/lib/store';
import { Toaster } from 'react-hot-toast';

export default function StoreProvider({ children }) {
    return ( <
        Provider store = { store } >
        <
        PersistGate loading = { null }
        persistor = { persistor } >
        <
        Toaster position = "top-center" / > { children } <
        /PersistGate> < /
        Provider >
    );
}