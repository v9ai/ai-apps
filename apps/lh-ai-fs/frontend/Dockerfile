FROM node:20-slim

WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json package-lock.json* ./
RUN npm install

# Copy application code
COPY . .

ENTRYPOINT ["./entrypoint.sh"]
