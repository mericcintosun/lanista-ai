// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title LanistaAgentPassport
 * @dev ERC-8004 style Soulbound (non-transferable) identity for Lanista arena bots.
 *      Only the relayer mints; only the oracle updates reputation. Transfers disabled (SBT).
 */
contract LanistaAgentPassport is ERC721, AccessControl {
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    struct AgentPassport {
        address botWallet;
        address ownerWallet;
        uint256 reputationScore;
        uint32 totalMatches;
        uint32 wins;
        string tokenURI;
        uint256 createdAt;
    }

    mapping(address => uint256) public tokenIdByBot;
    mapping(uint256 => AgentPassport) public passports;
    uint256 public nextTokenId = 1;

    event PassportMinted(uint256 indexed tokenId, address indexed botWallet, address indexed ownerWallet);
    event ReputationUpdated(uint256 indexed tokenId, address indexed botWallet, uint256 reputationScore, uint32 totalMatches, uint32 wins);

    constructor() ERC721("Lanista Agent Passport", "LAP") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ORACLE_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    /// @dev Soulbound: block transfers (only mint from zero and burn to zero allowed). OZ v5: _update(to, tokenId, auth).
    function _update(address to, uint256 tokenId, address auth) internal override returns (address from) {
        from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            revert("LanistaAgentPassport: Soulbound token cannot be transferred");
        }
        return super._update(to, tokenId, auth);
    }

    /**
     * @dev Mint a new passport for a bot. Only MINTER_ROLE (relayer). Gas sponsored by platform.
     * @param botWallet   Bot's EVM address (receives the SBT)
     * @param ownerWallet Creator/player wallet (0x0 until user binds)
     * @param metadataURI Link to passport metadata (e.g. Supabase/API or IPFS)
     */
    function mint(address botWallet, address ownerWallet, string calldata metadataURI)
        external
        onlyRole(MINTER_ROLE)
        returns (uint256 tokenId)
    {
        require(botWallet != address(0), "Invalid bot wallet");
        require(tokenIdByBot[botWallet] == 0, "Passport already exists for this bot");

        tokenId = nextTokenId++;
        _mint(botWallet, tokenId);

        passports[tokenId] = AgentPassport({
            botWallet: botWallet,
            ownerWallet: ownerWallet,
            reputationScore: 100,
            totalMatches: 0,
            wins: 0,
            tokenURI: metadataURI,
            createdAt: block.timestamp
        });
        tokenIdByBot[botWallet] = tokenId;

        emit PassportMinted(tokenId, botWallet, ownerWallet);
        return tokenId;
    }

    /**
     * @dev Update reputation after a match. Only ORACLE_ROLE (same relayer as ArenaOracle).
     */
    function updateReputation(
        address botWallet,
        uint256 reputationScore,
        uint32 totalMatches,
        uint32 wins
    ) external onlyRole(ORACLE_ROLE) {
        uint256 tokenId = tokenIdByBot[botWallet];
        require(tokenId != 0, "No passport for this bot");

        AgentPassport storage p = passports[tokenId];
        p.reputationScore = reputationScore;
        p.totalMatches = totalMatches;
        p.wins = wins;

        emit ReputationUpdated(tokenId, botWallet, reputationScore, totalMatches, wins);
    }

    /// @dev Optional: set owner wallet when user binds bot to their account (can be called by oracle or admin)
    function setOwnerWallet(address botWallet, address newOwnerWallet) external onlyRole(ORACLE_ROLE) {
        uint256 tokenId = tokenIdByBot[botWallet];
        require(tokenId != 0, "No passport for this bot");
        passports[tokenId].ownerWallet = newOwnerWallet;
    }

    function getPassportByBotWallet(address botWallet)
        external
        view
        returns (
            uint256 tokenId,
            address ownerWallet,
            uint256 reputationScore,
            uint32 totalMatches,
            uint32 wins,
            string memory metadataURI,
            uint256 createdAt
        )
    {
        tokenId = tokenIdByBot[botWallet];
        if (tokenId == 0) return (0, address(0), 0, 0, 0, "", 0);
        AgentPassport storage p = passports[tokenId];
        return (
            tokenId,
            p.ownerWallet,
            p.reputationScore,
            p.totalMatches,
            p.wins,
            p.tokenURI,
            p.createdAt
        );
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return passports[tokenId].tokenURI;
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
