import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  currentPoll: null,
  pollHistory: [],
  results: {},
  isLoading: false,
  error: null,
  timer: 60,
  socket: null,
  connectedUsers: 0,
  userList: [],
};

const pollSlice = createSlice({
  name: 'poll',
  initialState,
  reducers: {
    setPoll: (state, action) => {
      state.currentPoll = action.payload;
      state.timer = action.payload?.timer || 60;
      state.error = null;
    },
    clearPoll: (state) => {
      state.currentPoll = null;
      state.timer = 60;
    },
    setResults: (state, action) => {
      state.results = action.payload;
    },
    updateTimer: (state, action) => {
      state.timer = action.payload;
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    setPollHistory: (state, action) => {
      state.pollHistory = action.payload;
    },
    addToPollHistory: (state, action) => {
      state.pollHistory.push(action.payload);
    },
    setSocket: (state, action) => {
      state.socket = action.payload;
    },
    setConnectedUsers: (state, action) => {
      state.connectedUsers = action.payload;
    },
    setUserList: (state, action) => {
      state.userList = action.payload;
    },
    pollAnswered: (state, action) => {
      const { results, totalAnswers } = action.payload;
      state.results = results;
      state.results.totalAnswers = totalAnswers;
    },
    pollEnded: (state, action) => {
      const { results, totalAnswers } = action.payload;
      state.results = results;
      state.results.totalAnswers = totalAnswers;
      if (state.currentPoll) {
        state.currentPoll.isActive = false;
      }
      state.timer = 0;
    },
  },
});

export const {
  setPoll,
  clearPoll,
  setResults,
  updateTimer,
  setLoading,
  setError,
  setPollHistory,
  addToPollHistory,
  setSocket,
  setConnectedUsers,
  setUserList,
  pollAnswered,
  pollEnded,
} = pollSlice.actions;

export default pollSlice.reducer;