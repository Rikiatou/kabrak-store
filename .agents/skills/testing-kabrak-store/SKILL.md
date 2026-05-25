---
name: testing-kabrak-store
description: Test the KABRAK Store/Shop/Business SaaS app end-to-end. Use when verifying registration, product management, dashboard, UI features, or API changes.
---

# Testing KABRAK Store

## Prerequisites

- PostgreSQL must be running (install with `sudo apt-get install -y postgresql postgresql-client` if needed)
- Start PostgreSQL: `sudo pg_ctlcluster 14 main start` (version may vary)
- Node.js and npm must be available

## Database Setup

1. Create a PostgreSQL user and database:
   ```bash
   sudo -u postgres createuser -s ubuntu
   sudo -u postgres psql -c "ALTER USER ubuntu WITH PASSWORD 'kabrak123';"
   sudo -u postgres createdb kabrak_store
   ```

2. Create `/home/ubuntu/kabrak-store/backend/.env`:
   ```
   DATABASE_URL="postgresql://ubuntu:kabrak123@localhost:5432/kabrak_store"
   JWT_SECRET="test-jwt-secret-for-kabrak-2024"
   PORT=3001
   NODE_ENV=development
   FRONTEND_URL="http://localhost:5173"
   ```

3. Run Prisma migrations:
   ```bash
   cd /home/ubuntu/kabrak-store/backend
   npx prisma generate
   npx prisma migrate dev --name init
   ```

## Starting the App

1. Backend (shell 1):
   ```bash
   cd /home/ubuntu/kabrak-store/backend
   npm run dev
   ```
   Expected output: `KABRAK API running on port 3001`

2. Frontend (shell 2):
   ```bash
   cd /home/ubuntu/kabrak-store/frontend
   npm run dev
   ```
   Expected output: `VITE ready` on `http://localhost:5173/`

3. Verify health: `curl http://localhost:3001/api/health` should return `{"status":"ok"}`

## Port Note
- Frontend default is port 5173, but if it's occupied Vite will use 5174 or higher
- Always check Vite output for the actual port before navigating

## Key Test Flows

### Registration (3-step)
- Navigate to `http://localhost:5173/register` (or actual port from Vite output)
- Step 1: Fill personal info (firstName, lastName, email, password, phone, storeName)
- Step 2: Select business categories (determines which adaptive fields appear later)
- Step 3: Select plan (STORE/SHOP/BUSINESS) — note that SHOP and BUSINESS unlock "Employés" in sidebar
- Submit creates Tenant + User + Subscription in a transaction

### Adaptive Product Fields
- Go to Products page → "Ajouter un produit"
- The business type selector shows ONLY the categories selected during registration
- Each category renders different adaptive fields:
  - SHOES: brand, color, sizes
  - CLOTHING: category, color, sizes
  - PERFUMES: brand, volume
  - CAKES: flavors, sizes
  - FOOD: menuItems
- Switching between categories dynamically changes the form fields

### Dashboard
- Shows 4 stat cards: today's orders, today's revenue, total products, total clients
- After adding products, "Produits" count should increment
- "Commandes récentes", "Top produits", "Stock faible" sections

### Dark/Light Mode
- Click Moon/Sun icon in header
- Toggles `dark` class on `<html>` element
- Persisted in localStorage as `kabrak_theme`

### Language Switch (FR/EN)
- Click Globe icon in header
- All sidebar labels, button texts, placeholders change language
- Persisted in localStorage as `kabrak_lang`

### API Routes
- Auth: POST `/api/auth/register`, POST `/api/auth/login`, GET `/api/auth/me`
- Products: GET/POST `/api/products`, GET/PUT/DELETE `/api/products/:id`
- Orders: GET/POST `/api/orders`, GET `/api/orders/:id`
- Clients: GET/POST `/api/clients`, GET/PUT/DELETE `/api/clients/:id`
- Invoices, Deliveries, Employees, Categories, Reports, Billing similarly

## Frontend Proxy
- Vite proxies `/api` requests to `http://localhost:3001`
- API client uses axios with baseURL `/api` and JWT Bearer token from localStorage

## UI Design Testing (Premium Redesign)
- Login/Register/Dashboard use native Tailwind instead of ShadCN Card components
- Login: soft gradient background (inline style), white card, eye toggle on password
- Register: 3-step scrollable form with numbered progress indicator, ChevronLeft/Right nav
- Dashboard: gradient welcome banner (from-blue-600 to-blue-700), white stat cards with gradient icons
- **Known issue:** Dark mode may not work on redesigned pages — check for `dark:` variant classes. The redesign removed dark: classes from Dashboard (originally had 5). If dark mode is important, verify each page has `dark:bg-*`, `dark:text-*` variants on key elements.
- PWA icons: icon-192.png and icon-512.png in frontend/public/ — generated with ImageMagick

## Killing Stale Processes
- If port 3001 is occupied: `fuser -k 3001/tcp` (lsof may not be available)
- If port 5173 is occupied: `fuser -k 5173/tcp`

## Common Issues
- PostgreSQL auth might fail if password not set — use `ALTER USER ubuntu WITH PASSWORD 'kabrak123';`
- If `cd` commands are blocked in shell, use separate `cd` command first, then run npm commands
- Backend uses Express 5 types where `req.params.id` is `string | string[]` — controller files cast it as `string`
- JWT uses numeric seconds (not string like "7d"): `expiresIn: 60 * 60 * 24 * 7`
- Backend may already be running from a previous session — check with `curl -s http://localhost:3001/api/health` before starting

## Devin Secrets Needed
None — the app uses local PostgreSQL with hardcoded test credentials.
