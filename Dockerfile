# Multi-stage Dockerfile for Med connect - Hospital appointment booking system
FROM node:20-alpine AS builder

WORKDIR /app

# Copy and build frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Production runner image
FROM node:20-alpine AS runner

WORKDIR /app

# Copy backend dependencies and source
COPY backend/package*.json ./
RUN npm install --only=production

COPY backend/ ./

# Copy compiled frontend build to container
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/frontend/dist ../frontend/dist

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "src/server.js"]
