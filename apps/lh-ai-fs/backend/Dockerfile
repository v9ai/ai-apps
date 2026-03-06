FROM python:3.11-slim

WORKDIR /app

# Install Node.js (needed for npx/promptfoo in evals)
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    rm -rf /var/lib/apt/lists/*

# Install promptfoo globally for evals
RUN npm install -g promptfoo

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

ENTRYPOINT ["./entrypoint.sh"]
