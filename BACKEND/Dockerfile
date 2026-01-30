# Use official Python slim image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install -r  requirements.txt

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
