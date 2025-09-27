import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toggleChat } from '../store/chatSlice';

function ChatWidget() {
  const dispatch = useDispatch();
  const { isOpen, messages, unreadCount } = useSelector((state) => state.chat);
  const { userName, role } = useSelector((state) => state.user);
  const { socket } = useSelector((state) => state.poll);

  const [input, setInput] = React.useState('');

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!input.trim() || !socket) return;
    socket.emit('chat-message', {
      message: input.trim(),
      userName: userName || 'Anonymous',
      role: role || 'guest',
      userId: `${role}_${userName}`
    });
    setInput('');
  };

  return (
    <div className={`chat-widget ${isOpen ? 'open' : ''}`}>
      <button className="chat-toggle" onClick={() => dispatch(toggleChat())}>
        Chat {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
      </button>
      {isOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <h3>Class Chat</h3>
            <button onClick={() => dispatch(toggleChat())}>×</button>
          </div>
          <div className="chat-messages">
            {messages.map((msg, index) => (
              <div key={index} className={`chat-message ${msg.role}`}> 
                <strong>{msg.userName}:</strong> {msg.message}
              </div>
            ))}
          </div>
          <form className="chat-input" onSubmit={handleSendMessage}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
            />
            <button type="submit">Send</button>
          </form>
        </div>
      )}
    </div>
  );
}

export default ChatWidget;