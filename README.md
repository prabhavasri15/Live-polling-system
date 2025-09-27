# Live Polling System

A real-time polling application with teacher and student personas, built with React and Express.js using Socket.io.

## Features

### Teacher Features
- Create new polls with multiple-choice questions
- View live polling results in real-time
- Ask new questions (only when no active question or all students answered)
- View past poll results
- Chat with students
- Remove students from polls

### Student Features
- Enter unique name on first visit
- Submit answers to active questions
- View live polling results after submission
- 60-second timer for each question
- Chat with teacher

## Technology Stack
- **Frontend**: React with Redux Toolkit
- **Backend**: Express.js with Socket.io
- **Styling**: CSS3 with responsive design
- **Real-time Communication**: Socket.io

## Project Structure
```
live-polling-system/
├── backend/                 # Express.js server
│   ├── controllers/         # Route controllers
│   ├── models/             # Data models
│   ├── routes/             # API routes
│   ├── socket/             # Socket.io handlers
│   └── server.js           # Main server file
├── frontend/               # React application
│   ├── public/             # Static files
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── store/          # Redux store
│   │   ├── services/       # API services
│   │   └── styles/         # CSS files
└── README.md
```

## Getting Started

### Backend Setup
```bash
cd backend
npm install
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

## API Endpoints
- `POST /api/polls` - Create a new poll
- `GET /api/polls/:id` - Get poll details
- `POST /api/polls/:id/answer` - Submit answer
- `GET /api/polls/:id/results` - Get poll results

## Socket Events
- `poll-created` - New poll created
- `poll-answered` - Student answered
- `poll-results` - Live results update
- `timer-update` - Timer countdown
- `chat-message` - Chat messages

## Design
UI design follows the provided Figma design specifications.

## Deployment

### 1. Docker (Single Container)
Build and run (production):
```bash
docker build -t live-polling .
docker run -p 5000:5000 --env CLIENT_URL=http://localhost:5000 live-polling
```
Then open: http://localhost:5000

Environment overrides:
```bash
docker run -p 8080:5000 \
  -e PORT=5000 \
  -e CLIENT_URL=https://your-domain.com \
  live-polling
```

### 2. Render / Railway (Full Stack in One Service)
1. Push repo to GitHub.
2. Create a new Web Service.
3. Build Command:
	```bash
	npm run build:frontend
	```
4. Start Command:
	```bash
	node backend/server.js
	```
5. Set Environment Variables:
	- `NODE_ENV=production`
	- `CLIENT_URL=https://<your-service-domain>`
6. Expose port 5000.

### 3. Split Deployment (Netlify/Vercel + Backend Host)
Frontend:
1. In `frontend/.env.production` set:
	```
	REACT_APP_SOCKET_URL=https://your-backend-domain
	REACT_APP_API_URL=https://your-backend-domain/api
	```
2. Build locally or via platform build: `npm run build`
3. Deploy `frontend/build` folder to Netlify or Vercel.

Backend:
Deploy `backend` folder to Render/Railway/Heroku:
Start command: `node backend/server.js`
Env:
```
NODE_ENV=production
PORT=5000
CLIENT_URL=https://your-frontend-domain
```
Enable CORS if different domains (already configured via CLIENT_URL variable).

### 4. Manual VPS Deployment
```bash
git clone <repo>
cd live-polling-system
npm run install:all
npm run build:frontend
NODE_ENV=production PORT=5000 CLIENT_URL=https://your-domain node backend/server.js
```
Use a process manager like PM2:
```bash
npm install -g pm2
pm2 start backend/server.js --name live-polling --env production
```

### 5. SSL / Reverse Proxy (Nginx)
Example server block:
```
server {
  listen 80;
  server_name your-domain.com;
  location / {
	 proxy_pass http://127.0.0.1:5000;
	 proxy_set_header Upgrade $http_upgrade;
	 proxy_set_header Connection 'upgrade';
	 proxy_set_header Host $host;
	 proxy_cache_bypass $http_upgrade;
  }
}
```
Add Certbot for HTTPS.

## Environment Variables
| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 5000 | Backend HTTP server port (auto-increments if busy) |
| CLIENT_URL | http://localhost:3000 | Allowed CORS origin for browser clients |
| NODE_ENV | development | Set to production in deployment |
| REACT_APP_SOCKET_URL (frontend) | http://localhost:5000 | Socket.io base URL |
| REACT_APP_API_URL (frontend) | /api | REST API base path |

## Production Notes
- All data is in-memory; restarting loses polls/history.
- For persistence add a database (e.g., Redis, MongoDB).
- Use HTTPS in production; update `CLIENT_URL` accordingly.
- Scale horizontally with a Socket.io adapter (Redis) if you add more instances.

## Future Enhancements
- Authentication & role verification
- Persistent storage (DB)
- Export poll results (CSV / JSON)
- Socket.io clustering with Redis adapter
- Tests and CI pipeline