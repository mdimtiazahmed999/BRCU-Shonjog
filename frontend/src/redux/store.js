import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import authReducer from './authSlice';
import chatReducer from './chatSlice';
import socketReducer from './socketSlice';
import rtnReducer from './rtnSlice';
import notificationReducer from './notificationSlice';
import themeReducer from './themeSlice';

const persistConfig = {
  key: 'root',
  storage,
  version: 1,
  whitelist: ['auth', 'theme'],
};

const persistedAuthReducer = persistReducer(persistConfig, authReducer);

const store = configureStore({
  reducer: {
    auth: persistedAuthReducer,
    chat: chatReducer,
    socketio: socketReducer,
    rtn: rtnReducer,
    notification: notificationReducer,
    theme: themeReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // ignore persist actions and the non-serializable socket object in state/actions
        ignoredActions: ['persist/PERSIST'],
        ignoredPaths: ['auth', 'socketio'],
      },
    }),
});

export default store;
