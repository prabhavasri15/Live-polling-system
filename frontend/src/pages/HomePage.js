import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setUser } from '../store/userSlice';

function HomePage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleEnter = (role) => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    setError('');
    dispatch(setUser({ userName: name.trim(), role }));
    navigate(role === 'teacher' ? '/teacher' : '/student');
  };

  return (
    <div className="home-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <h1 style={{ marginBottom: '2rem' }}>Live Polling System</h1>
      <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center' }}>
        <div className="card" style={{ minWidth: 320, maxWidth: 340 }}>
          <h2>Teacher</h2>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            required
            style={{ marginBottom: '1rem', width: '100%' }}
          />
          <button className="primary-btn" style={{ width: '100%' }} onClick={() => handleEnter('teacher')}>Enter as Teacher</button>
        </div>
        <div className="card" style={{ minWidth: 320, maxWidth: 340 }}>
          <h2>Student</h2>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            required
            style={{ marginBottom: '1rem', width: '100%' }}
          />
          <button className="primary-btn" style={{ width: '100%' }} onClick={() => handleEnter('student')}>Enter as Student</button>
        </div>
      </div>
      {error && <div style={{ color: 'red', marginTop: '1rem' }}>{error}</div>}
    </div>
  );
}

export default HomePage;