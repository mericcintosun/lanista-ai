import { Router } from 'express';
import { getSparkPackages } from '../../services/spark.js';

const router = Router();

/**
 * GET /api/sparks/packages
 * Returns Spark packages with required AVAX (from chain). Public.
 */
router.get('/', async (_req, res) => {
  try {
    const packages = await getSparkPackages();
    return res.json({ packages });
  } catch (err: any) {
    console.error('[Spark] packages error:', err);
    return res.status(500).json({ error: 'Failed to load packages' });
  }
});

export default router;
