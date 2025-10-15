#!/bin/bash

# Deployment script for Synology DSM
# This script deploys the attendance system to a Synology DS223J NAS

set -e

# Configuration
SYNOLOGY_USER=""          # Synology username
SYNOLOGY_HOST=""          # Synology hostname or IP
SYNOLOGY_PORT="22"        # SSH port
SSH_KEY_PATH=""           # Path to SSH private key
REMOTE_APP_DIR="/volume1/docker/attendance-system"  # Remote directory on Synology
REMOTE_DOCKER_DIR="/volume1/docker"                 # Docker directory on Synology
BACKUP_DIR="./backups"     # Local backup directory

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

# Check required parameters
if [ -z "$SYNOLOGY_USER" ] || [ -z "$SYNOLOGY_HOST" ] || [ -z "$SSH_KEY_PATH" ]; then
    print_error "Missing required parameters. Please set SYNOLOGY_USER, SYNOLOGY_HOST, and SSH_KEY_PATH."
    exit 1
fi

# Check if SSH key exists
if [ ! -f "$SSH_KEY_PATH" ]; then
    print_error "SSH key not found at $SSH_KEY_PATH"
    exit 1
fi

# Check if required files exist
if [ ! -f "../docker-compose.yml" ]; then
    print_error "docker-compose.yml not found. Please run this script from the scripts/deploy directory."
    exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Function to execute SSH command
ssh_command() {
    ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i "$SSH_KEY_PATH" -p "$SYNOLOGY_PORT" "$SYNOLOGY_USER@$SYNOLOGY_HOST" "$1"
}

# Function to copy files via SCP
scp_copy() {
    scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i "$SSH_KEY_PATH" -P "$SYNOLOGY_PORT" "$1" "$SYNOLOGY_USER@$SYNOLOGY_HOST:$2"
}

print_status "Starting deployment to Synology DSM at $SYNOLOGY_HOST"

# Check if Docker is installed on Synology
if ! ssh_command "docker --version > /dev/null 2>&1"; then
    print_error "Docker is not installed on the Synology NAS. Please install Docker first."
    exit 1
fi

# Check if docker-compose is installed on Synology
if ! ssh_command "docker-compose --version > /dev/null 2>&1"; then
    print_error "docker-compose is not installed on the Synology NAS. Please install docker-compose first."
    exit 1
fi

# Create remote directories if they don't exist
print_status "Creating remote directories..."
ssh_command "mkdir -p $REMOTE_APP_DIR"
ssh_command "mkdir -p $REMOTE_DOCKER_DIR"

# Backup current deployment if it exists
print_status "Backing up current deployment..."
BACKUP_TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_NAME="attendance-system-backup-$BACKUP_TIMESTAMP.tar.gz"

if ssh_command "[ -d '$REMOTE_APP_DIR' ] && [ -n \"\$(ls -A $REMOTE_APP_DIR 2>/dev/null)\" ]"; then
    ssh_command "cd $REMOTE_DOCKER_DIR && tar -czf $BACKUP_NAME attendance-system/"
    ssh_command "mkdir -p $REMOTE_DOCKER_DIR/backups"
    ssh_command "mv $REMOTE_DOCKER_DIR/$BACKUP_NAME $REMOTE_DOCKER_DIR/backups/"
    print_status "Backup created: $REMOTE_DOCKER_DIR/backups/$BACKUP_NAME"
    
    # Download backup to local machine
    mkdir -p "$BACKUP_DIR"
    scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i "$SSH_KEY_PATH" -P "$SYNOLOGY_PORT" \
        "$SYNOLOGY_USER@$SYNOLOGY_HOST:$REMOTE_DOCKER_DIR/backups/$BACKUP_NAME" \
        "$BACKUP_DIR/"
    print_status "Backup downloaded to $BACKUP_DIR/$BACKUP_NAME"
else
    print_warning "No existing deployment found. Skipping backup."
fi

# Stop and remove existing containers
print_status "Stopping existing containers..."
ssh_command "cd $REMOTE_APP_DIR && docker-compose down --remove-orphans || true"

# Copy docker-compose.yml to Synology
print_status "Copying docker-compose.yml to Synology..."
scp_copy "../docker-compose.yml" "$REMOTE_APP_DIR/"

# Copy .env file if it exists
if [ -f "../.env" ]; then
    print_status "Copying .env file to Synology..."
    scp_copy "../.env" "$REMOTE_APP_DIR/"
fi

# Start the application
print_status "Starting the application..."
ssh_command "cd $REMOTE_APP_DIR && docker-compose up -d --remove-orphans"

# Wait for the application to start
print_status "Waiting for the application to start..."
sleep 30

# Check if the application is running
if ssh_command "cd $REMOTE_APP_DIR && docker-compose ps | grep -q 'Up'"; then
    print_status "Application started successfully"
    
    # Show running containers
    print_status "Running containers:"
    ssh_command "cd $REMOTE_APP_DIR && docker-compose ps"
    
    # Show logs
    print_status "Recent logs:"
    ssh_command "cd $REMOTE_APP_DIR && docker-compose logs --tail=20"
else
    print_error "Application failed to start"
    print_status "Checking logs for errors:"
    ssh_command "cd $REMOTE_APP_DIR && docker-compose logs"
    exit 1
fi

print_status "Deployment completed successfully"
print_status "Application should be accessible at http://$SYNOLOGY_HOST:3000"