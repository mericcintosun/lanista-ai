// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

/**
 * @title RankUpLootNFT
 * @dev ERC-1155 NFT minted when a bot ranks up. Chainlink VRF v2.5 picks 1 of 5 items per rank.
 * Ranks: 0=Iron(1-5), 1=Bronze(6-10), 2=Silver(11-15), 3=Gold(16-20), 4=Platinum(21-25), 5=Diamond(26-30), 6=Master(31-35).
 * Only owner (relayer) can call requestRankUpLoot; gas is sponsored by the platform.
 */
contract RankUpLootNFT is ERC1155, VRFConsumerBaseV2Plus {
    using Strings for uint256;

    uint256 public subscriptionId;
    bytes32 public keyHash;
    uint32 public callbackGasLimit;
    uint16 public requestConfirmations;
    uint32 public numWords;

    string private _baseMetaURI;

    struct PendingRequest {
        address botWallet;
        uint8 rankIndex;
        bool exists;
    }
    mapping(uint256 => PendingRequest) public pending;

    /// @dev Tracks how many VRF requests are currently outstanding (not yet fulfilled).
    uint256 public pendingCount;

    struct FulfilledResult {
        address botWallet;
        uint8 rankIndex;
        uint256 itemId;
        bool fulfilled;
    }
    mapping(uint256 => FulfilledResult) public fulfilledByRequestId;

    /// @dev Each (botWallet, rankIndex) can only receive one rank-up reward ever.
    mapping(address => mapping(uint8 => bool)) public hasRequestedRankReward;

    event RankUpLootRequested(uint256 indexed requestId, address indexed botWallet, uint8 rankIndex);
    event RankUpLootAwarded(uint256 indexed requestId, address indexed botWallet, uint8 rankIndex, uint256 itemId, uint256 randomness);
    event RewardFlagReset(address indexed botWallet, uint8 rankIndex);

    uint8 public totalRanks = 7;
    uint8 public constant ITEMS_PER_RANK = 5;
    uint8 public constant MIN_TOTAL_RANKS = 1;

    /**
     * @dev Update totalRanks. Cannot be set below MIN_TOTAL_RANKS or below
     *      the current number of ranks already in use.
     */
    function setTotalRanks(uint8 _newTotalRanks) external onlyOwner {
        require(_newTotalRanks >= MIN_TOTAL_RANKS, "totalRanks must be >= 1");
        require(_newTotalRanks >= totalRanks || pendingCount == 0,
            "Cannot reduce ranks while VRF requests are pending");
        totalRanks = _newTotalRanks;
    }

    /**
     * @dev Emergency reset for a stuck reward flag (e.g. VRF request was never fulfilled).
     *      Only callable by owner. Allows the bot to re-request the rank reward.
     */
    function resetRewardFlag(address botWallet, uint8 rankIndex) external onlyOwner {
        require(hasRequestedRankReward[botWallet][rankIndex], "Flag not set");
        hasRequestedRankReward[botWallet][rankIndex] = false;
        emit RewardFlagReset(botWallet, rankIndex);
    }

    constructor(
        string memory baseURI_,
        address coordinatorAddress,
        uint256 _subscriptionId,
        bytes32 _keyHash,
        uint32 _callbackGasLimit,
        uint16 _requestConfirmations,
        uint32 _numWords
    ) ERC1155(baseURI_) VRFConsumerBaseV2Plus(coordinatorAddress) {
        require(coordinatorAddress != address(0), "Invalid coordinator");
        _baseMetaURI = baseURI_;
        subscriptionId = _subscriptionId;
        keyHash = _keyHash;
        callbackGasLimit = _callbackGasLimit;
        requestConfirmations = _requestConfirmations;
        numWords = _numWords;
    }

    function setBaseURI(string calldata baseURI_) external onlyOwner {
        _baseMetaURI = baseURI_;
    }

    /**
     * @dev Update VRF configuration. callbackGasLimit and numWords cannot be changed
     *      while there are pending (unfulfilled) VRF requests, to avoid bricking them.
     */
    function setVrfConfig(
        uint256 _subscriptionId,
        bytes32 _keyHash,
        uint32 _callbackGasLimit,
        uint16 _requestConfirmations,
        uint32 _numWords
    ) external onlyOwner {
        require(pendingCount == 0 || (_callbackGasLimit == callbackGasLimit && _numWords == numWords),
            "Cannot change callbackGasLimit/numWords while requests pending");
        subscriptionId = _subscriptionId;
        keyHash = _keyHash;
        callbackGasLimit = _callbackGasLimit;
        requestConfirmations = _requestConfirmations;
        numWords = _numWords;
    }

    function _baseTokenIdForRank(uint8 rankIndex) internal view returns (uint256) {
        require(rankIndex < totalRanks, "Invalid rank");
        return uint256(rankIndex) * ITEMS_PER_RANK + 1;
    }

    /**
     * @dev Request VRF for rank-up loot. Only relayer (owner) calls this; gas is sponsored.
     *      The hasRequestedRankReward flag is set AFTER a successful requestId is obtained,
     *      ensuring a failed VRF request doesn't permanently burn the entitlement.
     */
    function requestRankUpLoot(address botWallet, uint8 rankIndex) external onlyOwner returns (uint256 requestId) {
        require(botWallet != address(0), "Invalid wallet");
        require(rankIndex < totalRanks, "Invalid rank");
        require(!hasRequestedRankReward[botWallet][rankIndex], "Already received reward for this rank");
        require(subscriptionId != 0, "VRF subId not set");
        require(keyHash != bytes32(0), "VRF keyHash not set");
        require(address(s_vrfCoordinator) != address(0), "Coordinator not set");

        VRFV2PlusClient.RandomWordsRequest memory req = VRFV2PlusClient.RandomWordsRequest({
            keyHash: keyHash,
            subId: subscriptionId,
            requestConfirmations: requestConfirmations,
            callbackGasLimit: callbackGasLimit,
            numWords: numWords,
            extraArgs: VRFV2PlusClient._argsToBytes(
                VRFV2PlusClient.ExtraArgsV1({ nativePayment: false })
            )
        });

        // Set flag AFTER successful request submission to prevent permanent loss on failure
        requestId = s_vrfCoordinator.requestRandomWords(req);
        hasRequestedRankReward[botWallet][rankIndex] = true;

        pending[requestId] = PendingRequest({ botWallet: botWallet, rankIndex: rankIndex, exists: true });
        pendingCount++;

        emit RankUpLootRequested(requestId, botWallet, rankIndex);
    }

    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal override {
        PendingRequest memory r = pending[requestId];
        require(r.exists, "Unknown request");

        require(randomWords.length > 0, "VRF returned no words");
        uint256 randomness = randomWords[0];

        uint256 baseId = _baseTokenIdForRank(r.rankIndex);
        uint256 itemId = baseId + (randomness % ITEMS_PER_RANK);

        _mint(r.botWallet, itemId, 1, "");

        fulfilledByRequestId[requestId] = FulfilledResult({
            botWallet: r.botWallet,
            rankIndex: r.rankIndex,
            itemId: itemId,
            fulfilled: true
        });

        delete pending[requestId];
        if (pendingCount > 0) pendingCount--;

        emit RankUpLootAwarded(requestId, r.botWallet, r.rankIndex, itemId, randomness);
    }

    function getRankUpLootResult(uint256 requestId)
        external
        view
        returns (address botWallet, uint8 rankIndex, uint256 itemId, bool fulfilled)
    {
        FulfilledResult memory r = fulfilledByRequestId[requestId];
        return (r.botWallet, r.rankIndex, r.itemId, r.fulfilled);
    }

    function uri(uint256 tokenId) public view override returns (string memory) {
        return string(abi.encodePacked(_baseMetaURI, tokenId.toString(), ".json"));
    }
}
