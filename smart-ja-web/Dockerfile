FROM node:18-alpine

WORKDIR /app

# Install native tools required for better-sqlite3 and Prisma
RUN apk add --no-cache python3 make g++ sqlite

# Copy package configurations
COPY package*.json ./
COPY server/package*.json ./server/
COPY server/prisma/ ./server/prisma/

# Install dependencies (will run postinstall script)
RUN npm install

# Copy project files
COPY . .

# Build the frontend (dist)
RUN npm run build

# Set environment
ENV PORT=3002
ENV NODE_ENV=production
ENV DATABASE_URL="file:./dev.db"
ENV JWT_SECRET="your_fallback_secret_for_production"

EXPOSE 3002

# Start the Node.js Express server
CMD ["npm", "start"]
