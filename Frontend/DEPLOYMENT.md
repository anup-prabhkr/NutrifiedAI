# NutrifiedAI — Deployment Guide

## Prerequisites

- **Node.js** 18+ and **npm** 9+
- **MongoDB Atlas** account (or local MongoDB)
- **Google Cloud** account with Gemini API enabled
- **Stripe** account (for billing features)
- **Vercel** account (for frontend hosting)
- **Railway/Render** account (for backend hosting)

---

## 1. Environment Setup

### Backend (`server/.env`)

Copy `server/.env.example` to `server/.env` and fill in all values:

```env
PORT=3001
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/nutrified
JWT_ACCESS_SECRET=<generate-random-32-char-string>
JWT_REFRESH_SECRET=<generate-different-32-char-string>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
GEMINI_API_KEY=<your-gemini-api-key>
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRO_PRICE_ID=price_xxx
FRONTEND_URL=https://your-app.vercel.app
```

### Frontend

Create a `.env` file in the project root:

```env
VITE_API_URL=https://your-api.railway.app/api
```

---

## 2. MongoDB Atlas Setup

1. Create a free M0 cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a database user with read/write permissions
3. Whitelist your IP (or allow from anywhere for cloud deploy: `0.0.0.0/0`)
4. Copy the connection string to `MONGODB_URI`

The app will automatically create collections and indexes on first run.

---

## 3. Backend Deployment (Railway)

```bash
# From the server/ directory
cd server

# Option A: Railway CLI
npm install -g @railway/cli
railway login
railway init
railway up

# Option B: Connect GitHub repo
# 1. Go to railway.app
# 2. New Project → Deploy from GitHub Repo
# 3. Set root directory to "server"
# 4. Add all environment variables
# 5. Deploy
```

For **Render**: Create a new Web Service, set root directory to `server`, build command `npm install && npm run build`, start command `npm run start:prod`.

---

## 4. Frontend Deployment (Vercel)

```bash
# From the project root
npm install -g vercel
vercel

# Or connect GitHub repo at vercel.com
# Set VITE_API_URL environment variable to your backend URL
```

---

## 5. Stripe Setup

1. Create a product and price in Stripe Dashboard
2. Copy the **Price ID** to `STRIPE_PRO_PRICE_ID`
3. Set up a webhook endpoint:
   - URL: `https://your-api.railway.app/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Copy the **Webhook Secret** to `STRIPE_WEBHOOK_SECRET`

---

## 6. Verify Deployment

1. Visit your frontend URL — should show login page
2. Register a new account
3. Add a manual meal — verify it persists
4. Check MongoDB Atlas collections for data
5. If Gemini key is set, test AI analysis with a food photo

---

## Project Structure

```
NutrifiedAI/
├── src/                    # Frontend (Vite + React + TypeScript)
│   ├── components/         # UI components
│   ├── contexts/           # AuthContext
│   ├── hooks/              # useNutritionStore (API-connected)
│   ├── lib/                # api.ts (API service layer)
│   └── pages/              # Login, Register, Index, Analytics, Profile, Subscription
├── server/                 # Backend (NestJS + MongoDB)
│   ├── src/
│   │   ├── auth/           # JWT authentication
│   │   ├── users/          # User management
│   │   ├── profile/        # Profile CRUD
│   │   ├── meals/          # Meal CRUD + AI analysis
│   │   ├── weight/         # Weight tracking
│   │   ├── supplements/    # Supplement tracking
│   │   ├── summary/        # Weekly summaries
│   │   ├── gemini/         # Gemini Vision AI service
│   │   ├── stripe/         # Stripe billing
│   │   └── common/         # Guards, decorators
│   ├── Dockerfile
│   └── .env.example
└── DEPLOYMENT.md
```
