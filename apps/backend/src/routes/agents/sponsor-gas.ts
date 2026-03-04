import { Router } from 'express';
import { sponsorGas } from '../../services/gas-station.js';

const router = Router();

// Sponsors micro AVAX for bot loot claim transactions
router.post('/', sponsorGas);

export default router;
