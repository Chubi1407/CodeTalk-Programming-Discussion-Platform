# Use official Node.js image
FROM node:16

# Create app directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of your app
COPY . .

# Build the React app
RUN npm run build

# Install a lightweight server to serve the built app
RUN npm install -g serve

# Serve the app
CMD ["serve", "-s", "build", "-l", "3000"]
