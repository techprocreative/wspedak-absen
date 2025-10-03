#!/bin/bash

# Download face-api.js models for face recognition
# These models are required for the face recognition feature to work

echo "Starting face-api.js models download..."

# Create models directory
mkdir -p public/models

cd public/models

echo "Downloading TinyFaceDetector model..."
curl -L -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-weights_manifest.json
curl -L -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-shard1

echo "Downloading Face Landmark model..."
curl -L -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-weights_manifest.json
curl -L -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-shard1

echo "Downloading Face Recognition model..."
curl -L -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-weights_manifest.json
curl -L -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard1
curl -L -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard2

echo "Downloading SSD MobileNet model (optional, for better accuracy)..."
curl -L -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/ssd_mobilenetv1_model-weights_manifest.json
curl -L -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/ssd_mobilenetv1_model-shard1
curl -L -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/ssd_mobilenetv1_model-shard2

echo ""
echo "✅ Models downloaded successfully!"
echo ""
echo "Downloaded files:"
ls -lh

echo ""
echo "Models location: public/models/"
echo "These models will be loaded by the face recognition system."
