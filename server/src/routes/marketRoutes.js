import { Router } from 'express';
import { getMarketSnapshot, syncMarkets } from '../controllers/marketController.js';

const router = Router();

router.get('/', getMarketSnapshot);
router.post('/sync', syncMarkets);

export default router;
