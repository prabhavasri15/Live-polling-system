import { configureStore } from '@reduxjs/toolkit';
import pollReducer from './pollSlice';
import userReducer from './userSlice';
import chatReducer from './chatSlice';

export const store = configureStore({
  reducer: {
    poll: pollReducer,
    user: userReducer,
    chat: chatReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['poll/setSocket'],
        ignoredPaths: ['poll.socket'],
      },
    }),
});

// Export store for use in components