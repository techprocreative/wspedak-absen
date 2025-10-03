# Docker Configuration for Synology DS223J Deployment

This document provides instructions for deploying the Attendance System on a Synology DS223J NAS using Docker.

## Prerequisites

1. Synology DS223J NAS with DSM 7.0 or later
2. Docker package installed on the Synology NAS
3. SSH access enabled on the Synology NAS
4. A computer with SSH client for deployment

## Hardware Considerations

The Synology DS223J has the following hardware specifications:
- CPU: Realtek RTD1296 (ARMv8)
- RAM: 512MB
- Storage: 2 x 3.5" SATA HDD/SSD bays

The Docker configuration has been optimized for these hardware constraints:
- Memory limits set to 512MB
- CPU limits set to 0.5 cores
- Optimized Node.js runtime for ARM architecture
- Multi-stage build for reduced image size

## Configuration Files

### Dockerfile
The [`Dockerfile`](./Dockerfile) is optimized for the DS223J hardware with:
- Multi-stage build for optimized image size
- Node.js runtime optimized for low-memory ARM architecture
- Security hardening with non-root user
- Health check endpoint for DSM monitoring
- Resource limits appropriate for DS223J

### docker-compose.yml
The [`docker-compose.yml`](./docker-compose.yml) file includes:
- Application service with proper networking
- Environment variable configuration
- Volume mounts for persistent data
- Resource constraints for DS223J
- Health checks and restart policies

### .dockerignore
The [`.dockerignore`](./.dockerignore) file optimizes the build context by excluding unnecessary files.

### Environment Configuration
- [`.env.example`](./.env.example) - Example environment variables
- [`.env.production`](./.env.production) - Production environment configuration
- [`.env.synology`](./.env.synology) - Synology-specific environment variables

### Monitoring and Logging
- [`config/logging.js`](./config/logging.js) - Logging configuration
- [`config/monitoring.js`](./config/monitoring.js) - Monitoring configuration
- [`config/error-reporting.js`](./config/error-reporting.js) - Error reporting configuration

## Deployment Steps

### 1. Prepare the Environment

Copy the appropriate environment file and configure it:

```bash
cp .env.synology .env
```

Edit the `.env` file with your specific configuration:
- Set your Synology NAS hostname/IP
- Configure your database connection
- Set up your Supabase credentials
- Configure any other required settings

### 2. Build the Docker Image

Run the build script to create the Docker image:

```bash
./scripts/deploy/build-image.sh
```

This script will:
- Build the Docker image with optimizations for the DS223J
- Tag the image appropriately
- Optionally push to a registry if configured

### 3. Deploy to Synology NAS

Run the deployment script:

```bash
./scripts/deploy/deploy-to-synology.sh
```

This script will:
- Connect to your Synology NAS via SSH
- Create necessary directories
- Back up any existing deployment
- Copy the docker-compose.yml and environment files
- Start the application
- Verify that the application is running correctly

### 4. Verify Deployment

After deployment, you can verify that the application is running:

1. Open a web browser and navigate to `http://<your-synology-ip>:3000`
2. Check the application logs:
   ```bash
   ssh <your-synology-user>@<your-synology-ip>
   cd /volume1/docker/attendance-system
   docker-compose logs
   ```
3. Check the health status:
   ```bash
   curl http://<your-synology-ip>:3000/api/health
   ```

## Backup and Restore

### Backup

To create a backup of the application:

```bash
./scripts/deploy/backup-restore.sh backup
```

This will:
- Stop the application
- Create a backup of the application data
- Download the backup to your local machine
- Restart the application

### Restore

To restore from a backup:

```bash
./scripts/deploy/backup-restore.sh restore <backup-file>
```

This will:
- Stop the application
- Create a backup of the current state
- Restore the application from the specified backup
- Restart the application

### List Backups

To list available backups:

```bash
./scripts/deploy/backup-restore.sh list
```

## Monitoring

### Health Checks

The application includes a health check endpoint at `/api/health` that returns the current status of the application.

### Metrics

The application exposes metrics at `/api/metrics` that can be used for monitoring.

### Logs

Application logs are stored in `/volume1/docker/attendance-system/logs` on the Synology NAS.

## Troubleshooting

### Application Won't Start

1. Check the application logs:
   ```bash
   ssh <your-synology-user>@<your-synology-ip>
   cd /volume1/docker/attendance-system
   docker-compose logs
   ```

2. Check resource usage:
   ```bash
   docker stats
   ```

3. Verify environment variables:
   ```bash
   docker-compose config
   ```

### Performance Issues

1. Monitor resource usage:
   ```bash
   docker stats
   ```

2. Check for memory issues:
   ```bash
   docker exec -it attendance-system cat /proc/meminfo
   ```

3. Adjust resource limits in `docker-compose.yml` if necessary.

### Network Issues

1. Check port availability:
   ```bash
   netstat -tlnp | grep :3000
   ```

2. Verify firewall settings on the Synology NAS.

## Security Considerations

1. Use strong passwords for all services.
2. Keep the application and dependencies up to date.
3. Use HTTPS in production (configure reverse proxy).
4. Restrict access to the application as needed.
5. Regularly back up your data.

## Maintenance

### Updates

To update the application:

1. Build a new image:
   ```bash
   ./scripts/deploy/build-image.sh
   ```

2. Deploy the update:
   ```bash
   ./scripts/deploy/deploy-to-synology.sh
   ```

### Log Rotation

Logs are automatically rotated based on the configuration in `docker-compose.yml`. Old logs are compressed and retained for a specified period.

### System Updates

Keep your Synology DSM and Docker package up to date for security and performance improvements.

## Support

For issues or questions:
1. Check the logs for error messages.
2. Review this documentation.
3. Contact your system administrator.