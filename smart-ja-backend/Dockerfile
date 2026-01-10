FROM node:18-alpine
WORKDIR /app
COPY smart-ja-backend/package*.json ./
RUN npm install
COPY smart-ja-backend/ .
EXPOSE 3000
CMD ["node", "index.js"]
