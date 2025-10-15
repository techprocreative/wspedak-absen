#!/bin/bash

# Backup and restore script for the attendance system on Synology DSM
# This script handles backing up and restoring the application data

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

# Function to execute SSH command
ssh_command() {
    ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i "$SSH_KEY_PATH" -p "$SYNOLOGY_PORT" "$SYNOLOGY_USER@$SYNOLOGY_HOST" "$1"
}

# Function to copy files via SCP
scp_copy() {
    scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i "$SSH_KEY_PATH" -P "$SYNOLOGY_PORT" "$1" "$SYNOLOGY_USER@$SYNOLOGY_HOST:$2"
}

# Function to copy files from remote via SCP
scp_copy_from() {
    scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i "$SSH_KEY_PATH" -P "$SYNOLOGY_PORT" "$SYNOLOGY_USER@$SYNOLOGY_HOST:$1" "$2"
}

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Backup function
backup() {
    print_status "Starting backup process..."
    
    # Check if the application directory exists
    if ! ssh_command "[ -d '$REMOTE_APP_DIR' ]"; then
        print_error "Application directory not found at $REMOTE_APP_DIR"
        exit 1
    fi
    
    # Create backup timestamp
    BACKUP_TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    BACKUP_NAME="attendance-system-backup-$BACKUP_TIMESTAMP.tar.gz"
    REMOTE_BACKUP_PATH="$REMOTE_DOCKER_DIR/backups/$BACKUP_NAME"
    
    # Create backup directory on Synology if it doesn't exist
    ssh_command "mkdir -p $REMOTE_DOCKER_DIR/backups"
    
    # Stop the application
    print_status "Stopping the application..."
    ssh_command "cd $REMOTE_APP_DIR && docker-compose down || true"
    
    # Create backup
    print_status "Creating backup..."
    ssh_command "cd $REMOTE_DOCKER_DIR && tar -czf $BACKUP_NAME attendance-system/"
    
    # Move backup to backups directory
    ssh_command "mv $REMOTE_DOCKER_DIR/$BACKUP_NAME $REMOTE_DOCKER_DIR/backups/"
    
    # Download backup to local machine
    print_status "Downloading backup to local machine..."
    mkdir -p "$BACKUP_DIR"
    scp_copy_from "$REMOTE_BACKUP_PATH" "$BACKUP_DIR/"
    
    # Start the application
    print_status "Starting the application..."
    ssh_command "cd $REMOTE_APP_DIR && docker-compose up -d"
    
    # Wait for the application to start
    print_status "Waiting for the application to start..."
    sleep 30
    
    # Check if the application is running
    if ssh_command "cd $REMOTE_APP_DIR && docker-compose ps | grep -q 'Up'"; then
        print_status "Application started successfully"
    else
        print_error "Application failed to start"
        print_status "Checking logs for errors:"
        ssh_command "cd $REMOTE_APP_DIR && docker-compose logs"
        exit 1
    fi
    
    print_status "Backup completed successfully"
    print_status "Backup saved to: $BACKUP_DIR/$BACKUP_NAME"
    print_status "Remote backup saved to: $REMOTE_BACKUP_PATH"
}

# Restore function
restore() {
    if [ -z "$1" ]; then
        print_error "Please specify the backup file to restore"
        print_status "Usage: $0 restore <backup-file>"
        exit 1
    fi
    
    BACKUP_FILE="$1"
    
    if [ ! -f "$BACKUP_FILE" ]; then
        print_error "Backup file not found: $BACKUP_FILE"
        exit 1
    fi
    
    print_status "Starting restore process from $BACKUP_FILE"
    
    # Confirm restore
    read -p "Are you sure you want to restore from $BACKUP_FILE? This will replace the current application data. (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Restore cancelled"
        exit 0
    fi
    
    # Create backup directory on Synology if it doesn't exist
    ssh_command "mkdir -p $REMOTE_DOCKER_DIR/backups"
    
    # Upload backup file to Synology
    print_status "Uploading backup file to Synology..."
    scp_copy "$BACKUP_FILE" "$REMOTE_DOCKER_DIR/backups/"
    
    BACKUP_FILENAME=$(basename "$BACKUP_FILE")
    REMOTE_BACKUP_PATH="$REMOTE_DOCKER_DIR/backups/$BACKUP_FILENAME"
    
    # Stop the application
    print_status "Stopping the application..."
    ssh_command "cd $REMOTE_APP_DIR && docker-compose down || true"
    
    # Create a backup of the current state before restore
    print_status "Creating a backup of the current state before restore..."
    CURRENT_BACKUP_TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    CURRENT_BACKUP_NAME="attendance-system-pre-restore-$CURRENT_BACKUP_TIMESTAMP.tar.gz"
    ssh_command "cd $REMOTE_DOCKER_DIR && tar -czf $CURRENT_BACKUP_NAME attendance-system/ && mv $CURRENT_BACKUP_NAME $REMOTE_DOCKER_DIR/backups/"
    
    # Remove current application directory
    print_status "Removing current application directory..."
    ssh_command "rm -rf $REMOTE_APP_DIR"
    
    # Create application directory
    ssh_command "mkdir -p $REMOTE_APP_DIR"
    
    # Extract backup
    print_status "Extracting backup..."
    ssh_command "cd $REMOTE_DOCKER_DIR && tar -xzf $REMOTE_BACKUP_PATH"
    
    # Start the application
    print_status "Starting the application..."
    ssh_command "cd $REMOTE_APP_DIR && docker-compose up -d"
    
    # Wait for the application to start
    print_status "Waiting for the application to start..."
    sleep 30
    
    # Check if the application is running
    if ssh_command "cd $REMOTE_APP_DIR && docker-compose ps | grep -q 'Up'"; then
        print_status "Application started successfully"
    else
        print_error "Application failed to start"
        print_status "Checking logs for errors:"
        ssh_command "cd $REMOTE_APP_DIR && docker-compose logs"
        exit 1
    fi
    
    print_status "Restore completed successfully"
}

# List backups function
list_backups() {
    print_status "Available backups:"
    
    # List local backups
    print_status "Local backups:"
    if [ -d "$BACKUP_DIR" ] && [ -n "$(ls -A "$BACKUP_DIR" 2>/dev/null)" ]; then
        ls -lah "$BACKUP_DIR" | grep -E "attendance-system-backup-.*\.tar\.gz"
    else
        print_warning "No local backups found"
    fi
    
    # List remote backups
    print_status "Remote backups:"
    if ssh_command "[ -d '$REMOTE_DOCKER_DIR/backups' ] && [ -n \"\$(ls -A $REMOTE_DOCKER_DIR/backups 2>/dev/null)\" ]"; then
        ssh_command "ls -lah $REMOTE_DOCKER_DIR/backups | grep -E 'attendance-system-backup-.*\.tar\.gz'"
    else
        print_warning "No remote backups found"
    fi
}

# Main script logic
case "${1:-}" in
    "backup")
        backup
        ;;
    "restore")
        restore "$2"
        ;;
    "list")
        list_backups
        ;;
    *)
        echo "Usage: $0 {backup|restore|list}"
        echo "  backup              - Create a backup of the application"
        echo "  restore <file>      - Restore the application from a backup file"
        echo "  list                - List available backups"
        exit 1
        ;;
esac