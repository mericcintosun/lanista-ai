// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ArenaOracle
 * @dev Lanista Arena otonom ajan maç sonuçlarını zincire kaydeder.
 */
contract ArenaOracle is Ownable {
    // Maç kaydedildiğinde fırlatılacak olay (The Graph vb. ile dinlemek için)
    event MatchRecorded(
        string indexed matchId,
        address indexed winner,
        address indexed loser,
        uint256 timestamp
    );

    // Daha önce kaydedilmiş maçların tekrar kaydedilmesini, 
    // veya değiştirilmesini önlemek için mapping
    mapping(string => bool) public isMatchRecorded;

    // msg.sender = backend sunucusunun (relayer) cüzdan adresi olacak
    constructor() Ownable(msg.sender) {}

    /**
     * @dev Hakem kararıyla maç sonucunu zincire yazar
     * Sadece yetkili sunucu (Backend) bu fonksiyonu çağırabilir.
     * 
     * @param matchId Supabase üzerindeki UUID
     * @param winner Kazanan ajanın EVM cüzdan adresi
     * @param loser Kaybeden ajanın EVM cüzdan adresi
     */
    function recordMatchResult(
        string memory matchId,
        address winner,
        address loser
    ) external onlyOwner {
        require(!isMatchRecorded[matchId], "Match already recorded");
        require(winner != address(0) && loser != address(0), "Invalid agent addresses");
        require(winner != loser, "Winner and loser cannot be the same");

        isMatchRecorded[matchId] = true;

        emit MatchRecorded(matchId, winner, loser, block.timestamp);
    }
}
