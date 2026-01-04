# API Configuration Guide

## Environment Setup

The app automatically detects the environment and uses the appropriate API URL:

### Automatic Detection:
- **Local Development**: `http://localhost:8000/api/v1`
- **Production**: `https://urbannook.onrender.com/api/v1`

### Manual Override:
Set `VITE_APP_ENV` in your environment file:

```bash
# .env.local (for local development)
VITE_APP_ENV=local

# .env.production (for production)
VITE_APP_ENV=production
```

## Usage

### 1. Automatic (Recommended)
The app will automatically detect:
- `localhost` → Local API
- Production domains → Production API

### 2. Manual Environment Files
- Copy `.env.local` for local development
- Copy `.env.production` for production builds

### 3. Debug Current Configuration
- Click "API Info" button (bottom-left corner)
- Shows current environment and API URL
- Available in development mode

## Available Environments

| Environment | API URL |
|-------------|---------|
| local | http://localhost:8000/api/v1 |
| production | https://urbannook.onrender.com/api/v1 |

## Testing

### Local Server (Port 8000)
```bash
# Start your local server first
cd server
npm start

# Then start client
cd client  
npm run dev
```

### Production API
Just deploy - it will automatically use production URLs.

## Switching Environments

### Method 1: Environment Variable
```bash
# Force local environment
VITE_APP_ENV=local npm run dev

# Force production environment  
VITE_APP_ENV=production npm run dev
```

### Method 2: Edit appUrls.js
Modify the `getEnvironment()` function in `src/config/appUrls.js`

## Current Configuration
Check the API debugger component (bottom-left) to see:
- Current environment
- Active API URL
- Hostname detection
- Dev mode status