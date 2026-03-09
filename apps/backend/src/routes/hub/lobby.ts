import { Router } from 'express';
import { supabase } from '../../lib/supabase.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { data: matches, error } = await supabase
      .from('matches')
      .select('*, player_1:bots!matches_player_1_id_fkey(*), player_2:bots!matches_player_2_id_fkey(*)')
      .eq('status', 'pending') // Lobby matches are in "pending" state waiting for worker to pick them up
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch lobby matches:', error);
      return res.status(500).json({ error: 'Failed to fetch lobby matches' });
    }

    return res.json({ matches: matches || [] });
  } catch (err) {
    console.error('Lobby matches fetch error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
