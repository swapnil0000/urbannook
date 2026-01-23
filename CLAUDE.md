# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Urban Nook is a full-stack e-commerce platform built with the MERN stack (MongoDB, Express, React, Node.js). The repository is a monorepo with separate `client` and `server` directories.

## Development Commands

### Server (Node.js/Express)
```bash
cd server
npm install
npm run dev          # Development with nodemon
npm start            # Production mode
```

### Client (React/Vite)
```bash
cd client
npm install
npm run dev          # Vite dev server (localhost:5173)
npm run build        # Production build
npm run lint         # ESLint
npm run preview      # Preview production build
```

## Architecture

### Backend (`server/src/`)
- **MVC Pattern** with service layer separation
- **Entry Points**: `server.js` (bootstrap), `app.js` (Express setup)
- **Database**: MongoDB Atlas (DB name: "un")
- **Authentication**: JWT with HttpOnly cookies, dual-token system (access + refresh)
- **Payment**: Razorpay integration with webhook verification

**Key Directories:**
- `controller/` - Route handlers (user, cart, wishlist, address, community, product, admin, payment)
- `services/` - Business logic and auth middleware (`authGuardService(role)` for JWT verification)
- `model/` - Mongoose schemas (User, Product, Order, Cart, Wishlist, Address, Community)
- `routes/` - API endpoints aggregated in `routes/index.js`
- `utlis/` - ApiError, ApiRes response classes and validation helpers

**Auth Flow:**
1. User credentials → bcrypt hash verification → JWT tokens generated
2. Tokens stored in cookies (`userAccessToken`, `userRefreshToken`) + Redux state
3. Protected routes use `authGuardService("USER")` or `authGuardService("Admin")` middleware
4. Token checked from `req.cookies` or `Authorization: Bearer` header

### Frontend (`client/src/`)
- **State Management**: Redux Toolkit with RTK Query for API caching
- **Build Tool**: Vite with Tailwind CSS
- **Routing**: React Router DOM

**Key Directories:**
- `store/` - Redux store with slices (auth, cart, ui) and API definitions
- `pages/` - Route page components
- `component/` - Shared UI components and layouts
- `feature/` - Feature modules (auth, product)
- `config/appUrls.js` - Auto-detects API URL based on hostname

**API URL Detection:**
- localhost → `http://localhost:8000/api/v1`
- vercel/netlify → `https://urbannook.onrender.com/api/v1`

### API Structure
Base URL: `/api/v1`

Routes mounted in `server/src/app.js`:
- `/user` - Auth and user operations
- `/admin` - Admin operations
- `/product` - Product listing and filtering
- `/common` - OTP, email operations
- `/rp` - Razorpay payment routes (webhook uses raw body parser)

## Git Workflow

**Branches:**
- `main` - Production (protected, requires PR)
- `pre-prod` - Staging/QA
- `feature/*` - Development branches

**Correct PR Flow:**
1. Branch from `main`: `git checkout -b feature/feature-name`
2. Create PR to `pre-prod` for testing
3. After verification, create PR from **same feature branch** to `main`
4. NEVER merge `pre-prod` → `main` directly

## Environment Variables

**Server (.env):**
- `NODE_ENV`, `PORT` (default 8000)
- `DB_URI_PROD` - MongoDB connection
- `USER_ACCESS_TOKEN_SECRET`, `ADMIN_ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`
- `WHITE_LIST_CLIENT_URI` - CORS whitelist (comma-separated)
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
- Email service credentials

**Client (.env):**
- `VITE_APP_ENV`
- `VITE_API_BASE_URL` (optional, overrides auto-detection)

## Deployment

- **Frontend**: AWS S3 + CloudFront CDN
- **Backend**: AWS EC2 with PM2 (config: `.ecosystem.config.cjs`)
- **CI/CD**: GitHub Actions (`.github/workflows/prod-deploy.yml`) - detects changed paths and deploys accordingly
