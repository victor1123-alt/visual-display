import { Router } from 'express';
import { listBookmakers, listEvents, listSports } from '../controllers/catalogController.js';

const router = Router();

router.get('/sports', listSports);
router.get('/bookmakers', listBookmakers);
router.get('/events', listEvents);

export default router;
