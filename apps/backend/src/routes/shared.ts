import express from 'express';
import Redis from 'ioredis';
import { Queue } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import { connection } from '../engine/match-worker.js';
import { supabase } from '../lib/supabase.js';
import { DEFAULT_STRATEGY } from '../engine/strategy.js';
import type { Match } from '@lanista/types';

// --- Shared Redis instance ---
export const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

// --- Shared BullMQ match queue ---
export const matchQueue = new Queue('match-queue', { connection });

// --- Shared error response helper ---
export function respondError(res: express.Response, status: number, clientMessage: string, err?: unknown): void {
    if (err !== undefined) console.error(clientMessage, err);
    res.status(status).json({ error: clientMessage });
}

/**
 * startMatch: Core logic to initialize a match between two bots.
 * Used by both the join-queue API and the background matchmaking sweeper.
 */
export async function startMatch(p1Id: string, p2Id: string) {
    const matchId = uuidv4();
    const { data: p1, error: p1Err } = await supabase.from('bots').select('*').eq('id', p1Id).single();
    const { data: p2, error: p2Err } = await supabase.from('bots').select('*').eq('id', p2Id).single();

    if (p1Err || p2Err || !p1 || !p2) {
        throw new Error("Failed to fetch paired agents from database.");
    }

    const match: Match = {
        id: matchId,
        player_1_id: p1.id,
        player_2_id: p2.id,
        status: 'pending',
        p1_final_stats: { hp: p1.hp, attack: p1.attack, defense: p1.defense },
        p2_final_stats: { hp: p2.hp, attack: p2.attack, defense: p2.defense }
    };

    await supabase.from('matches').insert({
        id: match.id,
        player_1_id: match.player_1_id,
        player_2_id: match.player_2_id,
        status: match.status,
        p1_final_stats: match.p1_final_stats,
        p2_final_stats: match.p2_final_stats,
        lobby_ends_at: new Date(Date.now() + 45_000).toISOString()
    });

    // Set agent statuses to combat to prevent double entry
    await supabase.from('bots').update({ status: 'combat' }).in('id', [p1.id, p2.id]);

    // Load strategies from Redis
    const p1StrategyRaw = await redis.get(`strategy:${p1.id}`);
    const p2StrategyRaw = await redis.get(`strategy:${p2.id}`);
    const p1Strategy = p1StrategyRaw ? JSON.parse(p1StrategyRaw) : DEFAULT_STRATEGY;
    const p2Strategy = p2StrategyRaw ? JSON.parse(p2StrategyRaw) : DEFAULT_STRATEGY;

    // Add match to BullMQ queue
    await matchQueue.add('start-match', {
        matchId,
        p1: { ...p1, strategy: p1Strategy },
        p2: { ...p2, strategy: p2Strategy }
    }, {
        removeOnComplete: true,
        attempts: 3,
        delay: 45_000
    });

    return { matchId, opponentName: p1.name };
}
