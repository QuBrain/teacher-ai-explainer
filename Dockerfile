# 1. Use a lightweight Python image
FROM python:3.11-slim

# 2. Prevent Python from buffering stdout/stderr (better logs in GCP)
ENV PYTHONUNBUFFERED=1

# 3. Set the working directory
WORKDIR /app

# 4. Copy requirements and install
# Note: Make sure 'google-cloud-aiplatform' is in your requirements.txt!
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copy the rest of your code
COPY . .

# 6. Run the app with Uvicorn
# Cloud Run expects the app to listen on port 8080 by default
# Use "exec" so the app receives signals correctly, and bind to 0.0.0.0
CMD exec uvicorn main:app --host 0.0.0.0 --port ${PORT}