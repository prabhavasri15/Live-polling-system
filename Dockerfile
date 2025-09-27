# Multi-stage build: build frontend then run backend server serving static assets

# ---------- Frontend Build Stage ----------
FROM node:18-alpine AS frontend-build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json* ./frontend/
# Copy only package manifests first for caching
WORKDIR /app/frontend
RUN npm install --legacy-peer-deps || npm install
COPY frontend/ /app/frontend/
RUN npm run build

# ---------- Backend Build Stage ----------
FROM node:18-alpine AS backend-deps
WORKDIR /app
COPY backend/package.json backend/package-lock.json* ./backend/
WORKDIR /app/backend
RUN npm install --production --legacy-peer-deps || npm install --production

# ---------- Final Runtime Stage ----------
FROM node:18-alpine
ENV NODE_ENV=production
WORKDIR /app
# Copy backend source
COPY --from=backend-deps /app/backend /app/backend
# Copy frontend build into backend expected path (../frontend/build)
COPY --from=frontend-build /app/frontend/build /app/frontend/build
# Copy .env if you want defaults (optionally override at runtime)
# COPY backend/.env /app/backend/.env

EXPOSE 5000
WORKDIR /app/backend
CMD ["node", "server.js"]
