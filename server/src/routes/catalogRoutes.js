import { Router } from 'express';
import { listBookmakers, listEvents, listSports } from '../controllers/catalogController.js';
import { protectedAccess } from '../middleware/authMiddleware.js';

const router = Router();
router.use(protectedAccess);

router.get('/sports', listSports);
router.get('/bookmakers', listBookmakers);
router.get('/events', listEvents);

export default router;
