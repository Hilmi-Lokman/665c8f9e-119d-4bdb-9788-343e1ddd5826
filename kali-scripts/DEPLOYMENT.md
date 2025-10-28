# Deploy Anomaly Detection Microservice

## Files Required
- `anomaly_service.py` - Flask API server
- `iforest_model.onnx` - Trained Isolation Forest model
- `scaler.pkl` - Feature scaler
- `requirements.txt` - Python dependencies

## Option 1: Deploy to Railway (Recommended)

1. Go to [Railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo" or "Empty Project"
3. Upload these files:
   - anomaly_service.py
   - iforest_model.onnx
   - scaler.pkl
   - requirements.txt
4. Railway will auto-detect Python and install dependencies
5. Your service will be available at: `https://your-app.railway.app`
6. Copy this URL

## Option 2: Deploy to Render

1. Go to [Render.com](https://render.com)
2. Click "New" → "Web Service"
3. Connect your GitHub repo or upload files
4. Settings:
   - Environment: Python 3
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `python anomaly_service.py`
5. Your service will be available at: `https://your-app.onrender.com`
6. Copy this URL

## Option 3: Run Locally (Testing)

```bash
cd kali-scripts
pip install -r requirements.txt
python anomaly_service.py
```

Service runs at: `http://localhost:5000`

## Configure Edge Function

After deployment, add the service URL as a Lovable secret:

1. In Lovable, go to Cloud → Secrets
2. Add secret: `ANOMALY_SERVICE_URL`
3. Value: Your deployed URL (e.g., `https://your-app.railway.app`)

## Test the Service

```bash
# Health check
curl https://your-service-url/health

# Test prediction
curl -X POST https://your-service-url/predict \
  -H "Content-Type: application/json" \
  -d '{
    "duration_total": 3600.0,
    "ap_switches": 2,
    "frag_count": 0,
    "bytes_total": 1024,
    "rssi_mean": -65.5,
    "rssi_std": 5.2,
    "invalid_rssi_count": 0,
    "login_hour": 14,
    "weekday": 2,
    "start_minute_of_day": 840
  }'
```

Expected response:
```json
{
  "anomaly_score": -0.123,
  "is_anomaly": 0,
  "prediction": 1
}
```
