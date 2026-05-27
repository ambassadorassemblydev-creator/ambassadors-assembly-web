import express from 'express';
import { accountController } from '../controllers/accountController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

import { paymentController } from '../controllers/paymentController.js';

const router = express.Router();

import { newsletterController, adminEmailController } from '../controllers/newsletterController.js';

/**
 * ============================================================
 * API ROUTES — All routes prefixed with /api
 * ============================================================
 */


// ============================================================
// PUBLIC ENDPOINTS (No authentication required)
// ============================================================

// Newsletter
router.post('/newsletter/subscribe', newsletterController.handleSubscribe);

// Payment — Public endpoints
router.post('/payments/initialize', paymentController.initializePayment);         // Server-side Paystack init
router.post('/payments/verify', paymentController.verifyPayment);                 // Verify after Paystack callback
router.post('/payments/webhook', paymentController.handleWebhook);                // Paystack webhook (HMAC-validated)
router.get('/payments/categories', paymentController.getCategories);              // Active donation categories


// ============================================================
// AUTHENTICATED ENDPOINTS (Require login)
// ============================================================

import { adminController } from '../controllers/adminController.js';

router.use(authMiddleware.protect);  

// Profile Endpoints
router.get('/profile/me', (req, res) => accountController.getMe(req, res));
router.post('/update-profile', accountController.handleUpdateProfile);
router.post('/profile/mark-share-shown', accountController.markSocialShareShown);

// Payment — User endpoints (must be logged in)
router.get('/payments/history', paymentController.getPaymentHistory);


// ============================================================
// ADMIN ENDPOINTS (Require admin/super_admin/pastor role)
// ============================================================

// Attendance Admin
router.post('/admin/attendance/notify', authMiddleware.restrictTo('admin', 'super_admin', 'pastor'), adminController.notifyAbsentees);
router.get('/admin/attendance/sync', authMiddleware.restrictTo('admin', 'super_admin', 'pastor'), adminController.manualSyncMissedAttendance);

// Email Admin
router.post('/admin/send-email', authMiddleware.restrictTo('admin', 'super_admin'), adminEmailController.sendCustomEmail);

// Payment Admin — Financial oversight and Paystack sync
router.get('/payments/admin/summary',
  authMiddleware.restrictTo('admin', 'super_admin', 'pastor'),
  paymentController.getAdminSummary
);
router.get('/payments/admin/transactions',
  authMiddleware.restrictTo('admin', 'super_admin', 'pastor'),
  paymentController.getAdminTransactions
);
router.post('/payments/admin/sync-paystack',
  authMiddleware.restrictTo('admin', 'super_admin'),
  paymentController.syncPaystack
);
router.get('/payments/admin/audit-log',
  authMiddleware.restrictTo('super_admin'),
  paymentController.getAdminAuditLog
);


export default router;