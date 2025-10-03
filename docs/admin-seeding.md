# Admin User Seeding

This document explains how to create and manage the admin user for the attendance system.

## Overview

The attendance system includes an admin user seeding functionality that allows you to create or update an admin user in both Supabase Auth and the public.users table.

## Methods

### 1. API Endpoint

You can use the `/api/admin/seed` endpoint to create or update the admin user.

#### Request

```bash
curl -X POST http://localhost:3000/api/admin/seed \
  -H "Content-Type: application/json" \
  -H "x-admin-seed-token: your-seed-token" \
  -d '{
    "email": "admin@teknologimaju.com",
    "password": "admin123",
    "name": "Administrator"
  }'
```

#### Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
- `ADMIN_EMAIL`: Default admin email (optional)
- `ADMIN_PASSWORD`: Default admin password (optional)
- `ADMIN_NAME`: Default admin name (optional)
- `ADMIN_SEED_TOKEN`: Token required for seeding in production
- `ALLOW_DEV_ADMIN_SEED`: Set to "true" to allow seeding in development without token

### 2. Script

You can use the provided script to seed the admin user:

```bash
npx tsx scripts/seed-admin.ts
```

This script will use the environment variables or default values to create the admin user.

## Demo Credentials

The system is configured with the following demo credentials:

- **Email**: admin@teknologimaju.com
- **Password**: admin123

These credentials are hardcoded in the `validateDemoCredentials` function for development purposes. In production, you should:

1. Remove the demo credentials validation
2. Create a proper admin user using the seeding functionality
3. Use strong, unique passwords

## Security Notes

1. The admin seeding endpoint requires proper authentication in production
2. The service role key should be kept secure and never exposed to the client
3. Demo credentials should be removed in production
4. Use strong passwords for production admin accounts

## Troubleshooting

### Admin User Not Working

If the admin login is not working, check the following:

1. Verify the admin user exists in Supabase Auth
2. Check the user's metadata includes `role: "admin"`
3. Ensure the user exists in the public.users table with role="admin"
4. Verify the demo credentials validation is working (for development)

### Seeding Fails

If the seeding fails, check:

1. Supabase configuration is correct
2. Service role key has proper permissions
3. Environment variables are set correctly
4. Token is provided (in production)

## Production Deployment

For production deployment:

1. Set up proper environment variables
2. Remove or disable demo credentials
3. Use the seeding endpoint to create the admin user
4. Ensure the admin user has a strong password
5. Test the login functionality before going live