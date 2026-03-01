# Use official Python slim image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set working directory
WORKDIR /app

# Install only minimal tools we need (curl + dos2unix)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    dos2unix \
    xz-utils \
    && rm -rf /var/lib/apt/lists/*

# Download static ffmpeg + ffprobe
RUN curl -fL https://github.com/BtbN/FFmpeg-Builds/releases/latest/download/ffmpeg-master-latest-linux64-lgpl.tar.xz \
    | tar -xJ \
    && mv ffmpeg-*/bin/ffmpeg /usr/local/bin/ffmpeg \
    && mv ffmpeg-*/bin/ffprobe /usr/local/bin/ffprobe \
    && rm -rf ffmpeg-*

# Verify ffmpeg is available (for build fail-fast)
RUN ffmpeg -version && ffprobe -version

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy the backend code
COPY . .

# Expose port
EXPOSE 8000

# Copy entrypoint script and fix line endings
COPY entrypoint.sh .
RUN dos2unix entrypoint.sh || sed -i 's/\r$//' entrypoint.sh
RUN chmod +x entrypoint.sh

# Use the script as CMD
CMD ["sh", "./entrypoint.sh"]
