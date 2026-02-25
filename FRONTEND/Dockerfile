# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

# Accept backend URL as build argument
ARG VITE_BACKEND_URL

# Set as environment variable for build process
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}

# Copy package files first (for caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source files
COPY . .

# Build the app (Vite outputs to /app/dist)
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine

# Copy build output
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
