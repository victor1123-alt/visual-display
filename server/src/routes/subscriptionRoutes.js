import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { cancelSubscription, getSubscription, listSubscriptions } from '../controllers/subscriptionController.js';
import { createSubscriptionCheckout, getSubscriptionPrice, handlePaystackWebhook, verifySubscriptionPayment } from '../controllers/paymentController.js';
import { authenticate, requireAdminApiKey } from '../middleware/authMiddleware.js';

const router = Router();
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many subscription administration attempts. Try again later.' }
});

router.post('/admin/cancel', adminLimiter, requireAdminApiKey, cancelSubscription);
router.get('/admin/subscriptions', requireAdminApiKey, listSubscriptions);
router.get('/price', getSubscriptionPrice);
router.post('/checkout', authenticate, createSubscriptionCheckout);
router.post('/verify', authenticate, verifySubscriptionPayment);
router.post('/paystack/webhook', handlePaystackWebhook);
router.get('/', authenticate, getSubscription);

export default router;
