import express from 'express';
import cors from 'cors';
import { config } from './config';

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

const app = express();

const allowedOrigins = config.frontendUrl.split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || config.nodeEnv === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/exports', exportRoutes);

// 404
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.listen(config.port, () => {
  console.log(`KABRAK API running on port ${config.port}`);
});

export default app;
