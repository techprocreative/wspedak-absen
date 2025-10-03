#!/bin/bash

# Build script for Docker image optimized for Synology DS223J
# This script builds the Docker image for the attendance system

set -e

# Configuration
IMAGE_NAME="attendance-system"
IMAGE_TAG="latest"
REGISTRY_URL=""  # Set your registry URL if using one, e.g., "your-registry.com"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    print_error "Docker is not running. Please start Docker."
    exit 1
fi

# Build the Docker image
print_status "Building Docker image for $IMAGE_NAME:$IMAGE_TAG..."

# Build with buildkit for better caching and performance
DOCKER_BUILDKIT=1 docker build \
    --target runtime \
    --tag "$IMAGE_NAME:$IMAGE_TAG" \
    --tag "$IMAGE_NAME:$(date +%Y%m%d-%H%M%S)" \
    --build-arg NODE_ENV=production \
    --file ../Dockerfile \
    ..

# Check if build was successful
if [ $? -eq 0 ]; then
    print_status "Docker image built successfully: $IMAGE_NAME:$IMAGE_TAG"
    
    # Optionally push to registry if URL is provided
    if [ -n "$REGISTRY_URL" ]; then
        print_status "Pushing image to registry: $REGISTRY_URL"
        docker tag "$IMAGE_NAME:$IMAGE_TAG" "$REGISTRY_URL/$IMAGE_NAME:$IMAGE_TAG"
        docker push "$REGISTRY_URL/$IMAGE_NAME:$IMAGE_TAG"
        print_status "Image pushed to registry successfully"
    fi
    
    # Show image size
    print_status "Image information:"
    docker images "$IMAGE_NAME:$IMAGE_TAG" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
else
    print_error "Docker image build failed"
    exit 1
fi

print_status "Build process completed"