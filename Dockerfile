# Stage 1: Builder
FROM node:18-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Runtime
FROM node:18-alpine

WORKDIR /app

# Встановити необхідні пакети
RUN apk add --no-cache curl

# Копіювати node_modules з builder
COPY --from=builder /app/node_modules ./node_modules

# Копіювати весь проект
COPY . .

# Expose ports
EXPOSE 3001 8080 8081

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start application
CMD ["node", "api-server.js"]
