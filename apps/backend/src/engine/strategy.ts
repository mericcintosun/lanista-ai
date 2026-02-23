/**
 * Strategy Engine for Lanista Arena
 * 
 * Strategy format: ordered array of rules, evaluated top-to-bottom.
 * First rule where agent's HP% >= hp_above wins.
 * 
 * Example:
 * [
 *   { "hp_above": 75, "weights": { "ATTACK": 50, "HEAVY_ATTACK": 35, "DEFEND": 10, "HEAL": 5 } },
 *   { "hp_above": 40, "weights": { "ATTACK": 45, "HEAVY_ATTACK": 10, "DEFEND": 25, "HEAL": 20 } },
 *   { "hp_above": 0,  "weights": { "ATTACK": 80, "HEAVY_ATTACK": 15, "DEFEND": 5,  "HEAL": 0  } }
 * ]
 */

export type Action = 'ATTACK' | 'HEAVY_ATTACK' | 'DEFEND' | 'HEAL';
export const VALID_ACTIONS: Action[] = ['ATTACK', 'HEAVY_ATTACK', 'DEFEND', 'HEAL'];

export interface ActionWeights {
    ATTACK?: number;
    HEAVY_ATTACK?: number;
    DEFEND?: number;
    HEAL?: number;
}

export interface StrategyRule {
    hp_above: number;
    weights: ActionWeights;
}

export type Strategy = StrategyRule[];

export interface GameState {
    my_hp: number;
    my_max_hp: number;
    opp_hp: number;
    my_atk: number;
    my_def: number;
    turn: number;
}

// Default strategy: aggressive berserker
export const DEFAULT_STRATEGY: Strategy = [
    { hp_above: 60, weights: { ATTACK: 60, HEAVY_ATTACK: 25, DEFEND: 10, HEAL: 5 } },
    { hp_above: 30, weights: { ATTACK: 45, HEAVY_ATTACK: 10, DEFEND: 25, HEAL: 20 } },
    { hp_above: 0, weights: { ATTACK: 40, HEAVY_ATTACK: 5, DEFEND: 20, HEAL: 35 } }
];

/**
 * Validate a strategy array. Throws on invalid input.
 */
export function validateStrategy(strategy: any): Strategy {
    if (!Array.isArray(strategy) || strategy.length === 0) {
        throw new Error("Strategy must be a non-empty array of rules.");
    }

    for (let i = 0; i < strategy.length; i++) {
        const rule = strategy[i];

        if (typeof rule.hp_above !== 'number' || rule.hp_above < 0 || rule.hp_above > 100) {
            throw new Error(`Rule ${i}: 'hp_above' must be a number between 0 and 100.`);
        }

        if (!rule.weights || typeof rule.weights !== 'object') {
            throw new Error(`Rule ${i}: missing 'weights' object.`);
        }

        // Validate each action weight
        for (const key of Object.keys(rule.weights)) {
            if (!VALID_ACTIONS.includes(key as Action)) {
                throw new Error(`Rule ${i}: invalid action '${key}'. Valid: ${VALID_ACTIONS.join(', ')}`);
            }
            if (typeof rule.weights[key] !== 'number' || rule.weights[key] < 0) {
                throw new Error(`Rule ${i}: weight for '${key}' must be a non-negative number.`);
            }
        }

        // Sum must be > 0
        const sum = VALID_ACTIONS.reduce((s, a) => s + (rule.weights[a] || 0), 0);
        if (sum <= 0) {
            throw new Error(`Rule ${i}: weights must sum to > 0 (got ${sum}).`);
        }
    }

    // Must have a catch-all rule (hp_above: 0)
    const lastRule = strategy[strategy.length - 1];
    if (lastRule.hp_above !== 0) {
        throw new Error("Last rule must have 'hp_above': 0 as a catch-all default.");
    }

    // Sort by hp_above descending for consistent evaluation
    return strategy
        .map((r: any) => ({
            hp_above: r.hp_above,
            weights: {
                ATTACK: r.weights.ATTACK || 0,
                HEAVY_ATTACK: r.weights.HEAVY_ATTACK || 0,
                DEFEND: r.weights.DEFEND || 0,
                HEAL: r.weights.HEAL || 0
            }
        }))
        .sort((a: StrategyRule, b: StrategyRule) => b.hp_above - a.hp_above);
}

/**
 * Evaluate a strategy against the current game state.
 * Returns a randomly chosen action based on weighted probabilities.
 */
export function evaluateStrategy(strategy: Strategy, state: GameState): Action {
    const hpPct = (state.my_hp / state.my_max_hp) * 100;

    // Find the first rule where HP% >= hp_above (rules sorted descending)
    let weights: ActionWeights = { ATTACK: 100 };
    for (const rule of strategy) {
        if (hpPct >= rule.hp_above) {
            weights = rule.weights;
            break;
        }
    }

    return weightedRandom(weights);
}

/**
 * Pick an action based on weighted probabilities.
 */
function weightedRandom(weights: ActionWeights): Action {
    const entries: [Action, number][] = VALID_ACTIONS.map(a => [a, weights[a] || 0]);
    const total = entries.reduce((s, [, w]) => s + w, 0);

    if (total <= 0) return 'ATTACK';

    let roll = Math.random() * total;
    for (const [action, weight] of entries) {
        roll -= weight;
        if (roll <= 0) return action;
    }

    return 'ATTACK';
}

/**
 * Resolve a combat action and return damage/healing/narrative.
 */
export function resolveAction(
    action: Action,
    attacker: { name: string; attack: number; defense: number; hp: number; max_hp: number },
    defender: { defense: number; hp: number }
): { damage: number; healing: number; narrative: string; vulnerable: boolean } {

    switch (action) {
        case 'ATTACK': {
            const damage = Math.max(1, Math.floor(attacker.attack - (defender.defense / 2)));
            return {
                damage, healing: 0,
                narrative: `⚔️ ${attacker.name} attacked for ${damage} damage!`,
                vulnerable: false
            };
        }

        case 'HEAVY_ATTACK': {
            const damage = Math.max(1, Math.floor(attacker.attack * 1.5 - (defender.defense / 3)));
            return {
                damage, healing: 0,
                narrative: `💥 ${attacker.name} HEAVY ATTACK for ${damage} damage! (Vulnerable next turn)`,
                vulnerable: true
            };
        }

        case 'DEFEND': {
            const counterDamage = Math.max(1, Math.floor(attacker.attack * 0.4 - (defender.defense / 4)));
            return {
                damage: counterDamage, healing: 0,
                narrative: `🛡️ ${attacker.name} defended, counter-attacked for ${counterDamage}!`,
                vulnerable: false
            };
        }

        case 'HEAL': {
            const healAmount = Math.floor(attacker.max_hp * 0.1);
            const actualHeal = Math.min(healAmount, attacker.max_hp - attacker.hp);
            return {
                damage: 0, healing: actualHeal,
                narrative: `💚 ${attacker.name} healed for ${actualHeal} HP!`,
                vulnerable: false
            };
        }

        default:
            return { damage: 1, healing: 0, narrative: `${attacker.name} flails for 1 damage.`, vulnerable: false };
    }
}
