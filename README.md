# KABRAK STORE / SHOP / BUSINESS

A modern, professional SaaS application for merchants in Cameroon and Africa. Manage your online or physical store with intelligent, adaptive business tools.

## Plans

| Plan | Target | Price |
|------|--------|-------|
| **KABRAK STORE** | Online sellers / home business | 4,900 FCFA/month |
| **KABRAK SHOP** | Physical stores | 7,900 FCFA/month |
| **KABRAK BUSINESS** | Large stores, multi-employee | 12,900 FCFA/month |

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + ShadCN UI
- **Backend**: Node.js + Express.js + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: JWT + Role-based access control
- **PWA**: Installable progressive web app
- **i18n**: French & English

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- npm or yarn

### Setup

```bash
# Backend
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npm run dev

# Frontend
cd frontend
cp .env.example .env
npm install
npm run dev
```

### Docker

```bash
docker-compose up -d
```

## Architecture

```
kabrak-store/
├── frontend/          # React + TypeScript + Vite
├── backend/           # Express + TypeScript + Prisma
├── docker-compose.yml
└── README.md
```

## License

Proprietary - KABRAK Engineering
