import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
});

export const createPoll = async (question, options, createdBy) => {
  const response = await api.post('/polls', { question, options, createdBy });
  return response.data;
};

export const getActivePoll = async () => {
  const response = await api.get('/polls/active');
  return response.data;
};

export const submitAnswer = async (pollId, userId, selectedOption, userName) => {
  const response = await api.post(`/polls/${pollId}/answer`, { userId, selectedOption, userName });
  return response.data;
};

export const getPollResults = async (pollId) => {
  const response = await api.get(`/polls/${pollId}/results`);
  return response.data;
};

export const getPollHistory = async () => {
  const response = await api.get('/polls/history');
  return response.data;
};

export const getChatMessages = async () => {
  const response = await api.get('/chat/messages');
  return response.data;
};

export const updatePoll = async (pollId, question, options) => {
  const response = await api.put(`/polls/${pollId}`, { question, options });
  return response.data;
};

export const deletePoll = async (pollId) => {
  const response = await api.delete(`/polls/${pollId}`);
  return response.data;
};

export default api;