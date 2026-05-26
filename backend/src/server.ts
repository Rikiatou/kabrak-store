import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { requireActiveSubscription } from './middleware/subscriptionGate';
import { authenticate } from './middleware/auth';

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
app.use(express.json());

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
app.use('/api/public', publicRoutes);

// Auth routes (no subscription check — must be accessible to login/register)
app.use('/api/auth', authLimiter, authRoutes);

// Billing routes (subscription check skipped — must be accessible to renew expired accounts)
app.use('/api/billing', billingRoutes);

// Admin routes (super admin only, subscription check skipped)
app.use('/api/admin', adminRoutes);

// All other routes require active subscription
app.use('/api/products', authenticate, requireActiveSubscription, productRoutes);
app.use('/api/orders', authenticate, requireActiveSubscription, orderRoutes);
app.use('/api/clients', authenticate, requireActiveSubscription, clientRoutes);
app.use('/api/invoices', authenticate, requireActiveSubscription, invoiceRoutes);
app.use('/api/employees', authenticate, requireActiveSubscription, employeeRoutes);
app.use('/api/deliveries', authenticate, requireActiveSubscription, deliveryRoutes);
app.use('/api/categories', authenticate, requireActiveSubscription, categoryRoutes);
app.use('/api/reports', authenticate, requireActiveSubscription, reportRoutes);
app.use('/api/loyalty', authenticate, requireActiveSubscription, loyaltyRoutes);
app.use('/api/stores', authenticate, requireActiveSubscription, storeRoutes);
app.use('/api/notifications', authenticate, requireActiveSubscription, notificationRoutes);
app.use('/api/exports', authenticate, requireActiveSubscription, exportRoutes);
app.use('/api/projects', authenticate, requireActiveSubscription, projectRoutes);
app.use('/api/recurring', authenticate, requireActiveSubscription, recurringRoutes);
app.use('/api/expenses', authenticate, requireActiveSubscription, expenseRoutes);
app.use('/api/suppliers', authenticate, requireActiveSubscription, supplierRoutes);

// 404
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.listen(config.port, () => {
  console.log(`KABRAK API running on port ${config.port}`);
  startRecurringBillingCron();
});

export default app;
