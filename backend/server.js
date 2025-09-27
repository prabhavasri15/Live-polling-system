require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

let BASE_PORT = parseInt(process.env.PORT, 10) || 5000;
let PORT = BASE_PORT;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory data storage (in production, use a proper database)
const polls = new Map();
const pollHistory = [];
const connectedUsers = new Map();
const chatMessages = [];

// Poll model structure
class Poll {
  constructor(question, options, createdBy) {
    this.id = uuidv4();
    this.question = question;
    this.options = options; // Array of option strings
    this.createdBy = createdBy;
    this.createdAt = new Date();
    this.isActive = true;
    this.answers = new Map(); // userId -> selectedOption
    this.timer = 60; // 60 seconds
    this.timerInterval = null;
    this.results = this.calculateResults();
  }

  calculateResults() {
    const results = {};
    this.options.forEach(option => {
      results[option] = 0;
    });

    this.answers.forEach(answer => {
      if (results.hasOwnProperty(answer)) {
        results[answer]++;
      }
    });

    return results;
  }

  addAnswer(userId, selectedOption) {
    if (this.isActive && this.options.includes(selectedOption)) {
      this.answers.set(userId, selectedOption);
      this.results = this.calculateResults();
      return true;
    }
    return false;
  }

  getAllStudentsAnswered() {
    const connectedStudents = Array.from(connectedUsers.values())
      .filter(user => user.role === 'student').length;
    return this.answers.size >= connectedStudents && connectedStudents > 0;
  }

  startTimer(io) {
    this.timerInterval = setInterval(() => {
      this.timer--;
      io.emit('timer-update', { pollId: this.id, timeLeft: this.timer });
      
      if (this.timer <= 0 || this.getAllStudentsAnswered()) {
        this.endPoll(io);
      }
    }, 1000);
  }

  endPoll(io) {
    this.isActive = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    
    // Add to history
    pollHistory.push({
      ...this,
      endedAt: new Date(),
      totalAnswers: this.answers.size
    });

    io.emit('poll-ended', { 
      pollId: this.id, 
      results: this.results,
      totalAnswers: this.answers.size 
    });
  }
}

// REST API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Create a new poll
app.post('/api/polls', (req, res) => {
  try {
    const { question, options, createdBy } = req.body;
    
    if (!question || !options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ 
        error: 'Question and at least 2 options are required' 
      });
    }

    // Check if there's an active poll
    const activePoll = Array.from(polls.values()).find(poll => poll.isActive);
    if (activePoll) {
      return res.status(400).json({ 
        error: 'There is already an active poll. Please wait for it to end.' 
      });
    }

    const poll = new Poll(question, options, createdBy || 'Teacher');
    polls.set(poll.id, poll);
    
    // Start the timer
    poll.startTimer(io);
    
    // Notify all connected clients
    io.emit('poll-created', {
      id: poll.id,
      question: poll.question,
      options: poll.options,
      timer: poll.timer,
      createdAt: poll.createdAt
    });

    res.status(201).json({ 
      success: true, 
      poll: {
        id: poll.id,
        question: poll.question,
        options: poll.options,
        timer: poll.timer
      }
    });
  } catch (error) {
    console.error('Error creating poll:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a poll (only if not active)
app.put('/api/polls/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { question, options } = req.body;
    const poll = polls.get(id);
    if (!poll) return res.status(404).json({ error: 'Poll not found' });
    if (poll.isActive) return res.status(400).json({ error: 'Cannot update active poll' });
    if (question) poll.question = question;
    if (options && Array.isArray(options) && options.length >= 2) poll.options = options;
    poll.results = poll.calculateResults();
    res.json({ success: true, poll });
  } catch (error) {
    console.error('Error updating poll:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a poll (only if not active)
app.delete('/api/polls/:id', (req, res) => {
  try {
    const { id } = req.params;
    const poll = polls.get(id);
    if (!poll) return res.status(404).json({ error: 'Poll not found' });
    if (poll.isActive) return res.status(400).json({ error: 'Cannot delete active poll' });
    polls.delete(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting poll:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current active poll
app.get('/api/polls/active', (req, res) => {
  try {
    const activePoll = Array.from(polls.values()).find(poll => poll.isActive);
    
    if (!activePoll) {
      return res.json({ poll: null });
    }

    res.json({
      poll: {
        id: activePoll.id,
        question: activePoll.question,
        options: activePoll.options,
        timer: activePoll.timer,
        isActive: activePoll.isActive,
        createdAt: activePoll.createdAt
      }
    });
  } catch (error) {
    console.error('Error getting active poll:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit answer to a poll
app.post('/api/polls/:id/answer', (req, res) => {
  try {
    const { id } = req.params;
    const { userId, selectedOption, userName } = req.body;

    if (!userId || !selectedOption) {
      return res.status(400).json({ 
        error: 'User ID and selected option are required' 
      });
    }

    const poll = polls.get(id);
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    if (!poll.isActive) {
      return res.status(400).json({ error: 'Poll is no longer active' });
    }

    const success = poll.addAnswer(userId, selectedOption);
    if (!success) {
      return res.status(400).json({ error: 'Invalid option selected' });
    }

    // Notify all clients of the new answer
    io.emit('poll-answered', {
      pollId: id,
      userId,
      userName: userName || 'Anonymous',
      selectedOption,
      results: poll.results,
      totalAnswers: poll.answers.size
    });

    // Check if all students have answered
    if (poll.getAllStudentsAnswered()) {
      poll.endPoll(io);
    }

    res.json({ 
      success: true, 
      results: poll.results,
      totalAnswers: poll.answers.size
    });
  } catch (error) {
    console.error('Error submitting answer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get poll results
app.get('/api/polls/:id/results', (req, res) => {
  try {
    const { id } = req.params;
    const poll = polls.get(id);
    
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    res.json({
      results: poll.results,
      totalAnswers: poll.answers.size,
      isActive: poll.isActive,
      question: poll.question,
      options: poll.options
    });
  } catch (error) {
    console.error('Error getting poll results:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get poll history
app.get('/api/polls/history', (req, res) => {
  try {
    const history = pollHistory.map(poll => ({
      id: poll.id,
      question: poll.question,
      results: poll.results,
      totalAnswers: poll.totalAnswers,
      createdAt: poll.createdAt,
      endedAt: poll.endedAt
    }));

    res.json({ history });
  } catch (error) {
    console.error('Error getting poll history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get chat messages
app.get('/api/chat/messages', (req, res) => {
  try {
    res.json({ messages: chatMessages });
  } catch (error) {
    console.error('Error getting chat messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve frontend build in production
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '..', 'frontend', 'build');
  app.use(express.static(buildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Helper to broadcast current users list (excluding guests)
  const broadcastUsersList = () => {
    const users = Array.from(connectedUsers.values()).map(u => ({
      userId: u.userId,
      userName: u.userName,
      role: u.role,
      socketId: u.socketId,
      joinedAt: u.joinedAt
    }));
    io.emit('users-list', { users });
  };

  // Handle user joining
  socket.on('join', (userData) => {
    const { userId, userName, role } = userData;
    
    connectedUsers.set(socket.id, {
      userId,
      userName,
      role,
      socketId: socket.id,
      joinedAt: new Date()
    });

    // Send current active poll to the new user
    const activePoll = Array.from(polls.values()).find(poll => poll.isActive);
    if (activePoll) {
      socket.emit('poll-created', {
        id: activePoll.id,
        question: activePoll.question,
        options: activePoll.options,
        timer: activePoll.timer,
        createdAt: activePoll.createdAt
      });
    }

    // Send current connected users count to teachers
    const connectedCount = connectedUsers.size;
    io.emit('users-update', { connectedCount });
  broadcastUsersList();

    console.log(`${userName} (${role}) joined`);
  });

  // Handle chat messages
  socket.on('chat-message', (messageData) => {
    const { message, userId, userName, role } = messageData;
    
    const chatMessage = {
      id: uuidv4(),
      message,
      userId,
      userName,
      role,
      timestamp: new Date(),
      socketId: socket.id
    };

    chatMessages.push(chatMessage);
    
    // Keep only last 100 messages
    if (chatMessages.length > 100) {
      chatMessages.shift();
    }

    // Broadcast to all connected clients
    io.emit('chat-message', chatMessage);
  });

  // Handle manual poll end by teacher
  socket.on('end-poll', (data) => {
    const user = connectedUsers.get(socket.id);
    if (user && user.role === 'teacher') {
      const { pollId } = data;
      const poll = polls.get(pollId);
      if (poll && poll.isActive) {
        poll.endPoll(io);
      }
    }
  });

  // Handle student removal by teacher
  socket.on('remove-student', (data) => {
    const user = connectedUsers.get(socket.id);
    if (user && user.role === 'teacher') {
      const { studentSocketId } = data;
      const studentSocket = io.sockets.sockets.get(studentSocketId);
      if (studentSocket) {
        studentSocket.emit('removed-by-teacher');
        studentSocket.disconnect();
      }
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      console.log(`${user.userName} (${user.role}) disconnected`);
      connectedUsers.delete(socket.id);
      
      // Update connected users count
      const connectedCount = connectedUsers.size;
      io.emit('users-update', { connectedCount });
      broadcastUsersList();
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const startServer = () => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      if (PORT < BASE_PORT + 10) {
        console.warn(`Port ${PORT} in use, trying ${PORT + 1}`);
        PORT += 1;
        setTimeout(startServer, 300);
      } else {
        console.error('Unable to find free port after multiple attempts');
        process.exit(1);
      }
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });
};

startServer();