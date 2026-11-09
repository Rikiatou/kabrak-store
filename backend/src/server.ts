import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { requireActiveSubscription } from './middleware/subscriptionGate';
import { authenticate, requireModule } from './middleware/auth';

import authRoutes from './modules/auth/auth.routes';
import productRoutes from './modules/products/products.routes';
import orderRoutes from './modules/orders/orders.routes';
import clientRoutes from './modules/clients/clients.routes';
import invoiceRoutes from './modules/invoices/invoices.routes';
import employeeRoutes from './modules/employees/employees.routes';
import deliveryRoutes from './modules/delivery/delivery.routes';
import categoryRoutes from './modules/categories/categories.routes';
import reportRoutes from './modules/reports/reports.routes';
import billingRoutes from './modules/billing/billing.routes';
import loyaltyRoutes from './modules/loyalty/loyalty.routes';
import storeRoutes from './modules/stores/stores.routes';
import notificationRoutes from './modules/notifications/notifications.routes';
import exportRoutes from './modules/exports/exports.routes';
import projectRoutes from './modules/projects/projects.routes';
import recurringRoutes from './modules/recurring/recurring.routes';
import adminRoutes from './modules/admin/admin.routes';
import expenseRoutes from './modules/expenses/expenses.routes';
import supplierRoutes from './modules/suppliers/suppliers.routes';
import publicRoutes from './modules/public/public.routes';
import aiRoutes from './modules/ai/ai.routes';
import cashRoutes from './modules/cash/cash.routes';
import errorRoutes from './modules/errors/errors.routes';
import { recordError, requestContext, patchConsoleError } from './modules/errors/errorLog.service';
import { startRecurringBillingCron } from './cron/recurringBilling';

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err);
  process.exit(1);
});
process.on('unhandledRejection', (err) => {
  console.error('[FATAL] Unhandled rejection:', err);
  process.exit(1);
});

console.log('[BOOT] Starting KABRAK server v1.2.0...');

const app = express();
app.set('trust proxy', 1);

const allowedOrigins = [
  ...config.frontendUrl.split(',').map(o => o.trim()),
  'https://kabrak-store.kabrakeng.com',
  'https://admin.kabrakeng.com',
].filter(Boolean);

// CORS must be before helmet to handle preflight OPTIONS requests
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || config.nodeEnv === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-token'],
}));

// Explicitly handle preflight
app.options('*', cors());

// Security headers
app.use(helmet());
app.use(express.json({ limit: '10mb' }));

// Record every 5xx response (with the controller's logged error) in error_logs for the admin "Bugs" page.
patchConsoleError();
app.use((req, res, next) => {
  const store: { error?: unknown } = {};
  res.on('finish', () => {
    if (res.statusCode < 500 || req.originalUrl.startsWith('/api/errors')) return;
    const err = store.error;
    void recordError({
      source: 'BACKEND',
      message: err instanceof Error ? err.message : typeof err === 'string' && err ? err : `HTTP ${res.statusCode}`,
      stack: err instanceof Error ? err.stack : null,
      url: req.originalUrl,
      method: req.method,
      statusCode: res.statusCode,
      userAgent: req.headers['user-agent'] || null,
      tenantId: req.user?.tenantId ?? null,
      userId: req.user?.id ?? null,
    });
  });
  requestContext.run(store, next);
});

const errorReportLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
app.use('/api/errors', errorReportLimiter, errorRoutes);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public routes (no auth required — storefront)
const storefrontOrderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, code: 'TOO_MANY_ORDERS', message: 'Trop de commandes, réessayez plus tard' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/public/storefront', storefrontOrderLimiter);
app.use('/api/public', publicRoutes);

// Auth routes (no subscription check — must be accessible to login/register)
app.use(
  ['/api/auth/login', '/api/auth/register', '/api/auth/forgot-password', '/api/auth/reset-password', '/api/auth/password'],
  authLimiter,
);
app.use('/api/auth', authRoutes);

// Billing routes (subscription check skipped — must be accessible to renew expired accounts)
app.use('/api/billing', billingRoutes);

// Admin routes (super admin only, subscription check skipped)
app.use('/api/admin', adminRoutes);

// All other routes require active subscription
app.use('/api/products', authenticate, requireActiveSubscription, productRoutes);
app.use('/api/orders', authenticate, requireActiveSubscription, orderRoutes);
app.use('/api/clients', authenticate, requireActiveSubscription, clientRoutes);
app.use('/api/invoices', authenticate, requireActiveSubscription, invoiceRoutes);
app.use('/api/employees', authenticate, requireActiveSubscription, requireModule('employees'), employeeRoutes);
app.use('/api/deliveries', authenticate, requireActiveSubscription, requireModule('delivery'), deliveryRoutes);
app.use('/api/categories', authenticate, requireActiveSubscription, requireModule('categories', 'products'), categoryRoutes);
app.use('/api/reports', authenticate, requireActiveSubscription, reportRoutes);
app.use('/api/cash-sessions', authenticate, requireActiveSubscription, requireModule('pos', 'closing'), cashRoutes);
app.use('/api/loyalty', authenticate, requireActiveSubscription, requireModule('loyalty'), loyaltyRoutes);
app.use('/api/stores', authenticate, requireActiveSubscription, requireModule('stores'), storeRoutes);
app.use('/api/notifications', authenticate, requireActiveSubscription, notificationRoutes);
app.use('/api/exports', authenticate, requireActiveSubscription, exportRoutes);
app.use('/api/projects', authenticate, requireActiveSubscription, requireModule('projects', 'dashboard', 'reports'), projectRoutes);
app.use('/api/recurring', authenticate, requireActiveSubscription, requireModule('recurring'), recurringRoutes);
app.use('/api/expenses', authenticate, requireActiveSubscription, requireModule('expenses', 'dashboard', 'reports'), expenseRoutes);
app.use('/api/suppliers', authenticate, requireActiveSubscription, requireModule('suppliers', 'products', 'expenses'), supplierRoutes);
app.use('/api/ai', authenticate, requireActiveSubscription, requireModule('ai-reports'), aiRoutes);

// 404
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[UNHANDLED]', err);
  if (!res.headersSent) res.status(500).json({ success: false, message: 'Erreur serveur' });
});

app.listen(config.port, () => {
  console.log(`KABRAK API running on port ${config.port}`);
  startRecurringBillingCron();
});

export default app;
