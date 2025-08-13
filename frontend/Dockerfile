FROM node:18-alpine

# Set working directory
WORKDIR /app

# Declare build-time argument and set it as an environment variable
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL

# Debug: Print the value of REACT_APP_BACKEND_URL during build
RUN echo "DEBUG: REACT_APP_BACKEND_URL = $REACT_APP_BACKEND_URL"

# Install curl for health checks
RUN apk add --no-cache curl

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .




# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000 || exit 1

# Start the application
CMD ["npm", "start"]