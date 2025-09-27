import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { submitAnswer, getActivePoll } from '../services/api';
import { setPoll, setResults } from '../store/pollSlice';
import { setAnswered, resetAnswered } from '../store/userSlice';

function StudentDashboard() {
  const dispatch = useDispatch();
  const { currentPoll, results, timer } = useSelector((state) => state.poll);
  const { userId, userName, hasAnswered, selectedAnswer } = useSelector((state) => state.user);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const fetchActivePoll = async () => {
      try {
        const data = await getActivePoll();
        if (data.poll) {
          dispatch(setPoll({ ...data.poll, isActive: true }));
        }
      } catch (error) {
        console.error('Error fetching active poll', error);
      }
    };
    fetchActivePoll();
  }, [dispatch]);

  useEffect(() => {
    if (!currentPoll || !currentPoll.isActive) {
      dispatch(resetAnswered());
      setSelected(null);
    }
  }, [currentPoll, dispatch]);

  const handleSubmitAnswer = async (e) => {
    e.preventDefault();
    if (!selected || !currentPoll) return;
    try {
      const data = await submitAnswer(currentPoll.id, userId, selected, userName);
      dispatch(setResults(data.results));
      dispatch(setAnswered(selected));
    } catch (error) {
      console.error('Error submitting answer', error);
      alert('Error submitting answer');
    }
  };

  return (
    <div className="student-dashboard">
      <header className="header">
        <h1>Student Dashboard</h1>
        <div className="user-info">
          <span>{userName}</span>
        </div>
      </header>

      <div className="content">
        {currentPoll && currentPoll.isActive ? (
          <div className="poll-card">
            <h2>{currentPoll.question}</h2>
            <p>Time left: {timer}s</p>
            {!hasAnswered ? (
              <form onSubmit={handleSubmitAnswer}>
                <div className="options">
                  {currentPoll.options.map((option, index) => (
                    <label key={index} className={`option ${selected === option ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="pollOption"
                        value={option}
                        checked={selected === option}
                        onChange={() => setSelected(option)}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
                <button type="submit" className="primary-btn" disabled={!selected}>Submit Answer</button>
              </form>
            ) : (
              <div className="results-view">
                <h3>Results</h3>
                <ul>
                  {currentPoll.options.map((option, index) => (
                    <li key={index} className={selectedAnswer === option ? 'your-answer' : ''}>
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
            )}
          </div>
        ) : (
          <div className="no-poll">
            <p>No active poll at the moment. Waiting for teacher...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default StudentDashboard;