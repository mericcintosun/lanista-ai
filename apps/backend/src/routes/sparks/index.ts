import { Router } from 'express';
import balanceRoute from './balance.js';
import claimWatchRewardRoute from './claim-watch-reward.js';
import packagesRoute from './packages.js';
import spendRoute from './spend.js';

const router = Router();

router.use('/balance', balanceRoute);
router.use('/claim-watch-reward', claimWatchRewardRoute);
router.use('/packages', packagesRoute);
router.use('/spend', spendRoute);

export default router;
