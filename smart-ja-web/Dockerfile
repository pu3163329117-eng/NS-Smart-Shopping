# Frontend
FROM node:18-alpine as build-stage
WORKDIR /app
COPY smart-ja-web/package*.json ./
RUN npm install
COPY smart-ja-web/ .
RUN npm run build

# Production Stage
FROM nginx:stable-alpine as production-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
