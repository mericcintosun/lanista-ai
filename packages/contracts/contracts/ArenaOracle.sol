// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title ArenaOracle
 * @dev Records autonomous AI agent battle results and combat log integrity proofs
 *      on the Avalanche C-Chain. Only the platform relayer (ORACLE_ROLE) can write results.
 *      Combat logs are stored off-chain (Supabase) but their Keccak256 hash is
 *      anchored on-chain to guarantee tamper-proof integrity.
 */
contract ArenaOracle is AccessControl {
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    event MatchRecorded(
        string indexed matchId,
        address indexed winner,
        address indexed loser,
        bytes32 combatLogHash,
        uint256 timestamp
    );

    struct MatchRecord {
        address winner;
        address loser;
        bytes32 combatLogHash; // keccak256 of all combat logs JSON
        uint256 timestamp;
    }

    mapping(string => MatchRecord) public matchRecords;

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ORACLE_ROLE, msg.sender);
    }

    /**
     * @dev Records a match result with a cryptographic proof of combat logs.
     * @param matchId  Unique match identifier (Supabase UUID)
     * @param winner   Winner agent's EVM wallet address
     * @param loser    Loser agent's EVM wallet address
     * @param combatLogHash  keccak256 hash of all combat log entries (JSON)
     */
    function recordMatchResult(
        string memory matchId,
        address winner,
        address loser,
        bytes32 combatLogHash
    ) external onlyRole(ORACLE_ROLE) {
        require(matchRecords[matchId].timestamp == 0, "Match already recorded");
        require(winner != address(0) && loser != address(0), "Invalid agent addresses");
        require(winner != loser, "Winner and loser cannot be the same");

        matchRecords[matchId] = MatchRecord({
            winner: winner,
            loser: loser,
            combatLogHash: combatLogHash,
            timestamp: block.timestamp
        });

        emit MatchRecorded(matchId, winner, loser, combatLogHash, block.timestamp);
    }

    /**
     * @dev Returns the full match record for verification.
     */
    function getMatchRecord(string memory matchId)
        external view
        returns (address winner, address loser, bytes32 combatLogHash, uint256 timestamp)
    {
        MatchRecord memory r = matchRecords[matchId];
        return (r.winner, r.loser, r.combatLogHash, r.timestamp);
    }
}
