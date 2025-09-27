import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Routes, Route, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import HomePage from './pages/HomePage';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import { setPoll, updateTimer, pollAnswered, pollEnded, setSocket, setConnectedUsers, setUserList } from './store/pollSlice';
import { addMessage } from './store/chatSlice';
import ChatWidget from './components/ChatWidget';

function App() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { socket } = useSelector((state) => state.poll);
  const { userId, userName, role, isAuthenticated } = useSelector((state) => state.user);

  useEffect(() => {
    if (!socket) {
      const newSocket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000');
      dispatch(setSocket(newSocket));

      newSocket.on('connect', () => {
        console.log('Connected to socket server');
        // Join as anonymous until user sets name and role
        newSocket.emit('join', { userId, userName: userName || 'Guest', role: role || 'guest' });
      });

      newSocket.on('poll-created', (pollData) => {
        dispatch(setPoll({ ...pollData, isActive: true }));
      });

      newSocket.on('timer-update', ({ pollId, timeLeft }) => {
        dispatch(updateTimer(timeLeft));
      });

      newSocket.on('poll-answered', (data) => {
        dispatch(pollAnswered(data));
      });

      newSocket.on('poll-ended', (data) => {
        dispatch(pollEnded(data));
      });

      newSocket.on('users-update', ({ connectedCount }) => {
        dispatch(setConnectedUsers(connectedCount));
      });

      newSocket.on('users-list', ({ users }) => {
        dispatch(setUserList(users));
      });

      newSocket.on('chat-message', (message) => {
        dispatch(addMessage(message));
      });

      newSocket.on('removed-by-teacher', () => {
        alert('You have been removed by the teacher.');
        navigate('/');
      });

      return () => {
        newSocket.disconnect();
      };
    }
  }, [dispatch, socket, userId, userName, role, navigate]);

  // Re-emit join when user authenticates (sets name/role)
  useEffect(() => {
    if (socket && isAuthenticated) {
      socket.emit('join', { userId, userName: userName || 'Guest', role: role || 'guest' });
    }
  }, [socket, isAuthenticated, userId, userName, role]);

  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/teacher" element={<TeacherDashboard />} />
        <Route path="/student" element={<StudentDashboard />} />
      </Routes>
      <ChatWidget />
    </div>
  );
}

export default App;