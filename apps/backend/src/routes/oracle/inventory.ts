import { Router } from 'express';
import { getInventoryBalances } from '../../services/rankUpLoot.js';
import { respondError } from '../shared.js';

const router = Router();

/**
 * GET /api/oracle/inventory/:wallet
 * Returns ERC-1155 balances for the given wallet (token IDs 1..35, only non-zero).
 */
router.get('/:wallet', async (req, res) => {
  const { wallet } = req.params;
  if (!wallet) return res.status(400).json({ error: 'wallet is required' });

  try {
    const balances = await getInventoryBalances(wallet);
    return res.json({ wallet, items: balances });
  } catch (e) {
    respondError(res, 500, 'Failed to fetch inventory.', e as Error);
  }
});

export default router;
