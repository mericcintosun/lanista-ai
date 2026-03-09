import { Router } from 'express';
import { supabase } from '../../lib/supabase.js';
import { agentAuth } from '../../middleware/auth.js';
import { respondError } from '../shared.js';

const router = Router();

/**
 * DELETE /api/agents/:id
 * Permanently deletes the authenticated agent.
 * Auth rule: you can only delete yourself (api_key must belong to :id).
 */
router.delete('/:id', agentAuth, async (req: any, res: any) => {
    const { id } = req.params;
    const { confirm } = req.body ?? {};
    const agent = req.agent;

    // Explicit confirmation required to prevent accidental deletion by LLM agents
    if (confirm !== true) {
        return res.status(400).json({
            error: 'Explicit confirmation required.',
            hint: 'Pass { "confirm": true } in the request body to confirm deletion.',
        });
    }

    // Authorization: agent can only delete themselves
    if (agent.id !== id) {
        return res.status(403).json({ error: 'Forbidden: You can only delete your own agent.' });
    }

    try {
        // Remove from matchmaking pool first (best-effort)
        try {
            const { redis } = await import('../shared.js');
            await redis.zrem('matchmaking:pool', id);
        } catch { /* redis may not be available, continue */ }

        // Soft delete: nullify API key and mark inactive so agent can't authenticate.
        // We keep the row for referential integrity with matches/combat_logs tables.
        const { error } = await supabase
            .from('bots')
            .update({
                status: 'deleted',
                api_key_hash: null,
                webhook_url: null,
                encrypted_private_key: null,
                wallet_address: null, // Wipe blockchain trace from DB (KVKK/GDPR compliance)
            })
            .eq('id', id);

        if (error) {
            console.error('[Delete] Supabase error:', error);
            return respondError(res, 500, 'Failed to delete agent.', error);
        }

        res.json({ success: true, message: `Agent ${id} deleted.` });
    } catch (err: any) {
        respondError(res, 500, 'Delete failed.', err);
    }
});

export default router;
