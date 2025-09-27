import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createPoll, getPollHistory, updatePoll, deletePoll } from '../services/api';
import { setPoll, setPollHistory } from '../store/pollSlice';

function TeacherDashboard() {
  const dispatch = useDispatch();
  const { currentPoll, results, timer, connectedUsers, socket, pollHistory, userList } = useSelector((state) => state.poll);
  const { userName } = useSelector((state) => state.user);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [editPollId, setEditPollId] = useState(null);
  const [editQuestion, setEditQuestion] = useState('');
  const [editOptions, setEditOptions] = useState([]);
  const handleEditPoll = (poll) => {
    setEditPollId(poll.id);
    setEditQuestion(poll.question);
    setEditOptions([...poll.options]);
  };

  const handleUpdatePoll = async (pollId) => {
    if (!editQuestion.trim() || editOptions.filter(opt => opt.trim()).length < 2) return;
    try {
      await updatePoll(pollId, editQuestion.trim(), editOptions.filter(opt => opt.trim()));
      setEditPollId(null);
      setEditQuestion('');
      setEditOptions([]);
      // Refresh history
      const data = await getPollHistory();
      dispatch(setPollHistory(data.history));
    } catch (error) {
      alert('Error updating poll');
    }
  };

  const handleDeletePoll = async (pollId) => {
    if (!window.confirm('Delete this poll?')) return;
    try {
      await deletePoll(pollId);
      // Refresh history
      const data = await getPollHistory();
      dispatch(setPollHistory(data.history));
    } catch (error) {
      alert('Error deleting poll');
    }
  };

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await getPollHistory();
        dispatch(setPollHistory(data.history));
      } catch (error) {
        console.error('Error fetching poll history', error);
      }
    };
    fetchHistory();
  }, [dispatch]);

  const handleAddOption = () => {
    setOptions([...options, '']);
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleCreatePoll = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    const validOptions = options.filter(opt => opt.trim() !== '');
    if (validOptions.length < 2) return;
    try {
      const data = await createPoll(question.trim(), validOptions, userName);
      dispatch(setPoll({ ...data.poll, isActive: true }));
      setQuestion('');
      setOptions(['', '']);
    } catch (error) {
      console.error('Error creating poll', error);
      alert('Error creating poll');
    }
  };

  const handleEndPoll = () => {
    if (currentPoll && currentPoll.isActive && window.confirm('End current poll?')) {
      if (socket) {
        socket.emit('end-poll', { pollId: currentPoll.id });
      }
    }
  };

  return (
    <div className="teacher-dashboard">
      <header className="header">
        <h1>Teacher Dashboard</h1>
        <div className="stats">
          <span>Connected: {connectedUsers}</span>
        </div>
      </header>

      <div className="dashboard-grid">
        <div className="panel poll-creation">
          <h2>Create New Poll</h2>
          {currentPoll && currentPoll.isActive ? (
            <div className="active-poll-info">
              <p><strong>Active Poll:</strong> {currentPoll.question}</p>
              <p>Time left: {timer}s</p>
              <button className="danger-btn" onClick={handleEndPoll}>End Poll</button>
            </div>
          ) : (
            <form onSubmit={handleCreatePoll}>
              <div className="form-group">
                <label>Question</label>
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Enter poll question"
                  required
                />
              </div>
              <div className="form-group">
                <label>Options</label>
                {options.map((opt, index) => (
                  <input
                    key={index}
                    type="text"
                    value={opt}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    required={index < 2}
                  />
                ))}
                <button type="button" className="secondary-btn" onClick={handleAddOption}>Add Option</button>
              </div>
              <button type="submit" className="primary-btn">Create Poll</button>
            </form>
          )}
        </div>

        <div className="panel results-panel">
          <h2>Live Results</h2>
          {currentPoll ? (
            <div className="results">
              <h3>{currentPoll.question}</h3>
              <ul>
                {currentPoll.options.map((option, index) => (
                  <li key={index}>
                    <span>{option}</span>
                    <div className="bar-container">
                      <div
                        className="bar"
                        style={{ width: `${results[option] ? (results[option] / (results.totalAnswers || 1)) * 100 : 0}%` }}
                      ></div>
                    </div>
                    <span>{results[option] || 0} votes</span>
                  </li>
                ))}
              </ul>
              <p>Total Answers: {results.totalAnswers || 0}</p>
            </div>
          ) : (
            <p>No active poll. Create one above.</p>
          )}
        </div>

        <div className="panel history-panel">
          <h2 onClick={() => setHistoryVisible(!historyVisible)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Poll History</span> <span>{historyVisible ? '▲' : '▼'}</span>
          </h2>
          {historyVisible && (
            <div className="history-list" style={{ maxHeight: '260px', overflowY: 'auto' }}>
              {pollHistory.length === 0 && <p>No past polls yet.</p>}
              {pollHistory.map((p) => (
                <div key={p.id} className="history-item" style={{ borderBottom: '1px solid #eee', padding: '0.5rem 0' }}>
                  {editPollId === p.id ? (
                    <div>
                      <input
                        type="text"
                        value={editQuestion}
                        onChange={e => setEditQuestion(e.target.value)}
                        style={{ width: '100%', marginBottom: '0.5rem' }}
                      />
                      {editOptions.map((opt, idx) => (
                        <input
                          key={idx}
                          type="text"
                          value={opt}
                          onChange={e => {
                            const newOpts = [...editOptions];
                            newOpts[idx] = e.target.value;
                            setEditOptions(newOpts);
                          }}
                          style={{ width: '100%', marginBottom: '0.3rem' }}
                        />
                      ))}
                      <button className="secondary-btn" style={{ marginRight: 8 }} onClick={() => setEditOptions([...editOptions, ''])}>Add Option</button>
                      <button className="primary-btn" style={{ marginRight: 8 }} onClick={() => handleUpdatePoll(p.id)}>Save</button>
                      <button className="danger-btn" onClick={() => setEditPollId(null)}>Cancel</button>
                    </div>
                  ) : (
                    <>
                      <strong>{p.question}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#555' }}>
                        {new Date(p.createdAt).toLocaleTimeString()} → {p.endedAt ? new Date(p.endedAt).toLocaleTimeString() : ''}
                      </div>
                      <ul style={{ listStyle: 'none', padding: 0, margin: '0.25rem 0' }}>
                        {Object.entries(p.results || {}).map(([opt, count]) => (
                          <li key={opt} style={{ fontSize: '0.8rem' }}>{opt}: {count}</li>
                        ))}
                      </ul>
                      <div style={{ fontSize: '0.7rem', color: '#666' }}>Answers: {p.totalAnswers}</div>
                      <button className="secondary-btn" style={{ marginRight: 8 }} onClick={() => handleEditPoll(p)}>Edit</button>
                      <button className="danger-btn" onClick={() => handleDeletePoll(p.id)}>Delete</button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel participants-panel">
          <h2>Participants</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {userList.filter(u => u.role !== 'teacher').map(u => (
              <li key={u.socketId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid #f0f0f0' }}>
                <span>{u.userName || 'Unnamed'} <span style={{ fontSize: '0.7rem', color: '#666' }}>({u.role})</span></span>
                <button
                  className="danger-btn"
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.65rem' }}
                  onClick={() => socket && socket.emit('remove-student', { studentSocketId: u.socketId })}
                >Remove</button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default TeacherDashboard;