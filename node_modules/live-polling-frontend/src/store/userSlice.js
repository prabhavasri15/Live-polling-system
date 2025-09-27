import { createSlice } from '@reduxjs/toolkit';

const generateUserId = () => {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

let persisted = null;
try {
  persisted = JSON.parse(window.sessionStorage.getItem('lp_user'));
} catch {}

const initialState = persisted || {
  userId: generateUserId(),
  userName: '',
  role: '', // 'teacher' or 'student'
  isAuthenticated: false,
  hasAnswered: false,
  selectedAnswer: null,
};

const persist = (state) => {
  const toStore = {
    userId: state.userId,
    userName: state.userName,
    role: state.role,
    isAuthenticated: state.isAuthenticated,
    hasAnswered: state.hasAnswered,
    selectedAnswer: state.selectedAnswer,
  };
  try { window.sessionStorage.setItem('lp_user', JSON.stringify(toStore)); } catch {}
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action) => {
      const { userName, role } = action.payload;
      state.userName = userName;
      state.role = role;
      state.isAuthenticated = true;
      persist(state);
    },
    clearUser: (state) => {
      state.userName = '';
      state.role = '';
      state.isAuthenticated = false;
      state.hasAnswered = false;
      state.selectedAnswer = null;
      persist(state);
    },
    setAnswered: (state, action) => {
      state.hasAnswered = true;
      state.selectedAnswer = action.payload;
      persist(state);
    },
    resetAnswered: (state) => {
      state.hasAnswered = false;
      state.selectedAnswer = null;
      persist(state);
    },
    generateNewUserId: (state) => {
      state.userId = generateUserId();
      persist(state);
    },
  },
});

export const {
  setUser,
  clearUser,
  setAnswered,
  resetAnswered,
  generateNewUserId,
} = userSlice.actions;

export default userSlice.reducer;