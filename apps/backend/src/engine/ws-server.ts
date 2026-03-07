import { WebSocketServer, WebSocket } from 'ws';
import { createHash, pbkdf2Sync } from 'crypto';
import { supabase } from '../lib/supabase.js';
import Redis from 'ioredis';
import type { Server } from 'http';

// Map of agentId -> WebSocket connection
const connectedAgents = new Map<string, WebSocket>();

// Dedicated Redis instances for pub/sub (cannot reuse a subscribed connection for commands)
const redisSub = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
const redisPub = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

/**
 * Check if an agent is connected via WebSocket
 */
export function isAgentConnected(agentId: string): boolean {
    const ws = connectedAgents.get(agentId);
    return !!ws && ws.readyState === WebSocket.OPEN;
}

/**
 * Send a game state to an agent and wait for their action response.
 * Returns the chosen action or null on timeout.
 */
export function sendTurnAndWaitForAction(
    agentId: string,
    matchId: string,
    gameState: object,
    timeoutMs: number = 8000
): Promise<string | null> {
    return new Promise((resolve) => {
        const ws = connectedAgents.get(agentId);
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            resolve(null);
            return;
        }

        // Channel where we expect the action response
        const actionChannel = `match:${matchId}:action:${agentId}`;
        let resolved = false;

        const timer = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                redisSub.unsubscribe(actionChannel);
                resolve(null);
            }
        }, timeoutMs);

        // Listen for the action response on Redis
        const onMessage = (channel: string, message: string) => {
            if (channel === actionChannel && !resolved) {
                resolved = true;
                clearTimeout(timer);
                redisSub.unsubscribe(actionChannel);
                redisSub.removeListener('message', onMessage);
                resolve(message); // 'ATTACK' or 'DEFEND'
            }
        };

        redisSub.on('message', onMessage);
        redisSub.subscribe(actionChannel);

        // Send the game state to the agent
        ws.send(JSON.stringify({ type: 'turn', payload: gameState }));
    });
}

/**
 * Initialize WebSocket server on an existing HTTP server.
 */
export function initWebSocketServer(server: Server) {
    const wss = new WebSocketServer({ server, path: '/ws/agent' });

    console.log('[WS] WebSocket server initialized at /ws/agent');

    wss.on('connection', async (ws, req) => {
        // Extract token from query string
        const url = new URL(req.url || '', `http://${req.headers.host}`);
        const token = url.searchParams.get('token');

        if (!token) {
            ws.send(JSON.stringify({ type: 'error', message: 'Missing token query parameter.' }));
            ws.close(4001, 'Missing token');
            return;
        }

        // Authenticate: hash token and look up bot
        let bot;
        
        if (token.includes('.')) {
            const [botId, secret] = token.split('.');
            if (botId && secret) {
                const { data, error } = await supabase
                    .from('bots')
                    .select('id, name, status, api_key_hash')
                    .eq('id', botId)
                    .single();
                
                if (!error && data && data.api_key_hash?.includes(':')) {
                    const [salt, storedHash] = data.api_key_hash.split(':');
                    const hashToVerify = pbkdf2Sync(secret, salt, 10000, 64, 'sha512').toString('hex');
                    if (hashToVerify === storedHash) {
                        bot = data;
                    }
                }
            }
        } else {
            // Legacy SHA-256 Support
            const hash = createHash('sha256').update(token).digest('hex');
            const { data, error } = await supabase
                .from('bots')
                .select('id, name, status')
                .eq('api_key_hash', hash)
                .single();
            if (!error && data) {
                bot = data;
            }
        }

        if (!bot) {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid API key.' }));
            ws.close(4003, 'Invalid API key');
            return;
        }

        // Register the connection
        connectedAgents.set(bot.id, ws);
        console.log(`[WS] Agent connected: ${bot.name} (${bot.id})`);

        ws.send(JSON.stringify({
            type: 'connected',
            agent_id: bot.id,
            agent_name: bot.name,
            message: 'Arena connection established. Waiting for your turn.'
        }));

        // Handle incoming messages from the agent
        ws.on('message', (raw) => {
            try {
                const msg = JSON.parse(raw.toString());

                if (msg.type === 'action' && msg.match_id && msg.action) {
                    const action = msg.action.toUpperCase();
                    const actionChannel = `match:${msg.match_id}:action:${bot.id}`;
                    redisPub.publish(actionChannel, action);
                }
            } catch {
                // Malformed message, ignore
            }
        });

        // Cleanup on disconnect
        ws.on('close', () => {
            connectedAgents.delete(bot.id);
            console.log(`[WS] Agent disconnected: ${bot.name} (${bot.id})`);
        });

        ws.on('error', (err) => {
            console.error(`[WS] Error for agent ${bot.name}:`, err.message);
            connectedAgents.delete(bot.id);
        });
    });

    return wss;
}
