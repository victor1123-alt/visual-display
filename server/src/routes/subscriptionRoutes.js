import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { activateSubscription, cancelSubscription, getSubscription, requestSubscription } from '../controllers/subscriptionController.js';
import { authenticate, requireAdminApiKey } from '../middleware/authMiddleware.js';

const router = Router();
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many subscription administration attempts. Try again later.' }
});

router.post('/admin/activate', adminLimiter, requireAdminApiKey, activateSubscription);
router.post('/admin/cancel', adminLimiter, requireAdminApiKey, cancelSubscription);
router.get('/', authenticate, getSubscription);
router.post('/request', authenticate, requestSubscription);

export default router;
