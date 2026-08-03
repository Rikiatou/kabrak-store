# KABRAK Store — Agent Guide

## Project Overview
Multi-tenant SaaS for African SMEs (stores/shops/businesses). Monorepo:
- `backend/` — Node.js + Express + Prisma (PostgreSQL)
- `frontend/` — React + Vite + TailwindCSS + Zustand

## Commands
```bash
# Backend
cd backend
npm run dev          # tsx watch src/server.ts
npm run build        # tsc
npm run typecheck    # tsc --noEmit
npm run lint         # eslint src/ --ext .ts  (NOTE: no eslint.config.js yet)
npm run seed         # tsx src/seed.ts

# Prisma
npx prisma generate
npx prisma migrate dev --name <name>
npx prisma studio

# Frontend
cd frontend
npm run dev          # vite
npm run build        # vite build
npm run typecheck    # tsc --noEmit
npm run lint         # eslint src/
```

## Environment
- Backend needs `.env` with `DATABASE_URL`, `JWT_SECRET`, `ADMIN_SECRET`, `GROQ_API_KEY`, `OM_WEBHOOK_SECRET`, `LOYALTY_POINTS_PER_FCFA`, `VITE_CLOUDINARY_*` (frontend).
- Copy `.env.example` to `.env` and fill in values.
- No `.env` is committed. Prisma migrate requires `DATABASE_URL` to be set.

## Architecture Notes
- **Multi-tenant**: every table has `tenantId`. All queries MUST filter by `tenantId` from `req.user!.tenantId`.
- **RBAC**: `authenticate` → `authorize('OWNER','MANAGER',...)` → `requirePlan(...)` → `requireMode(...)` → `requireActiveSubscription`.
- **Pricing**: single source of truth in `backend/src/config/pricing.ts` (`PLAN_PRICES`, `PLAN_LIMITS`).
- **AI usage**: persisted in `AIReport` table (DB-based, not in-memory).
- **Order sharing**: uses secure `publicToken` (random 24-byte hex), not the guessable `reference`.
- **Webhook verification**: fails closed if `OM_WEBHOOK_SECRET` is missing.

## Conventions
- Controllers return `void` and write to `res` directly (no return value).
- Error pattern: `catch (error) { res.status(500).json({ success: false, message: ... }); }`
- Frontend pages use `mountedRef` pattern to avoid setState after unmount.
- Frontend uses `value={x === null || x === undefined ? '' : x}` for numeric inputs (NOT `x || ''` which hides 0).
- Heavy libs (html2canvas, jsPDF) are lazy-imported inside InvoiceModal to keep bundle small.

## Migration Notes
- Migration `20260729000000_add_tenant_indexes_public_token_ai_reports` adds:
  - `tenantId` indexes on all multi-tenant tables
  - `orders.publicToken` (unique, nullable) for secure order sharing
  - `ai_reports` table for persistent AI usage tracking
- Run `npx prisma migrate deploy` when DB is available.
