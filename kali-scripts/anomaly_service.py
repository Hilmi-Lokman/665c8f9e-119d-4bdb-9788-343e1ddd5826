"""
ONNX Anomaly Detection Microservice
Deploy this on Railway, Render, or any Python hosting service.

Requirements:
pip install flask flask-cors onnxruntime numpy scikit-learn

Run locally:
python anomaly_service.py

Deploy to Railway/Render:
- Upload this file with iforest_model.onnx and scaler.pkl
- Set PORT environment variable (Railway/Render set this automatically)
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import onnxruntime as ort
import numpy as np
import pickle
import os

app = Flask(__name__)
CORS(app)

# Load ONNX model and scaler
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'iforest_model.onnx')
SCALER_PATH = os.path.join(os.path.dirname(__file__), 'scaler.pkl')

print(f"Loading ONNX model from: {MODEL_PATH}")
ort_session = ort.InferenceSession(MODEL_PATH)

print(f"Loading scaler from: {SCALER_PATH}")
with open(SCALER_PATH, 'rb') as f:
    scaler = pickle.load(f)

print("Model and scaler loaded successfully!")
print(f"Model inputs: {ort_session.get_inputs()[0].name}")
print(f"Model outputs: {[output.name for output in ort_session.get_outputs()]}")

# Feature order (must match training data)
FEATURE_ORDER = [
    'duration_total',
    'ap_switches', 
    'frag_count',
    'bytes_total',
    'rssi_mean',
    'rssi_std',
    'invalid_rssi_count',
    'login_hour',
    'weekday',
    'start_minute_of_day'
]

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "model": "loaded"})

@app.route('/predict', methods=['POST'])
def predict():
    """
    Predict anomaly score for WiFi capture features
    
    Request body:
    {
        "duration_total": float,
        "ap_switches": int,
        "frag_count": int,
        "bytes_total": int,
        "rssi_mean": float,
        "rssi_std": float,
        "invalid_rssi_count": int,
        "login_hour": int,
        "weekday": int,
        "start_minute_of_day": int
    }
    
    Response:
    {
        "anomaly_score": float,
        "is_anomaly": bool (1 = anomaly, 0 = normal)
    }
    """
    try:
        data = request.json
        
        # Extract features in correct order
        features = []
        for feature_name in FEATURE_ORDER:
            if feature_name not in data:
                return jsonify({
                    "error": f"Missing feature: {feature_name}",
                    "required_features": FEATURE_ORDER
                }), 400
            features.append(float(data[feature_name]))
        
        # Convert to numpy array
        features_array = np.array([features], dtype=np.float32)
        
        # Scale features
        features_scaled = scaler.transform(features_array).astype(np.float32)
        
        # Run ONNX inference
        input_name = ort_session.get_inputs()[0].name
        outputs = ort_session.run(None, {input_name: features_scaled})
        
        # outputs[0] = predictions (1 for normal, -1 for anomaly)
        # outputs[1] = anomaly scores (negative = more anomalous)
        prediction = int(outputs[0][0])
        anomaly_score = float(outputs[1][0][0])
        
        # Convert: -1 (anomaly) -> 1, 1 (normal) -> 0
        is_anomaly = 1 if prediction == -1 else 0
        
        return jsonify({
            "anomaly_score": anomaly_score,
            "is_anomaly": is_anomaly,
            "prediction": prediction
        })
        
    except Exception as e:
        print(f"Prediction error: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
