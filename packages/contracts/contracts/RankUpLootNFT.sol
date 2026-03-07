// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

/**
 * @title RankUpLootNFT
 * @dev ERC-1155 NFT minted when a bot ranks up. Chainlink VRF v2.5 picks 1 of 5 items per rank.
 * Ranks: 0=Iron(1-5), 1=Bronze(6-10), 2=Silver(11-15), 3=Gold(16-20), 4=Platinum(21-25), 5=Diamond(26-30), 6=Master(31-35).
 * Only owner (relayer) can call requestRankUpLoot; gas is sponsored by the platform.
 */
contract RankUpLootNFT is ERC1155, VRFConsumerBaseV2Plus {
    uint256 public subscriptionId;
    bytes32 public keyHash;
    uint32 public callbackGasLimit;
    uint16 public requestConfirmations;
    uint32 public numWords;

    string private _baseURI;

    struct PendingRequest {
        address botWallet;
        uint8 rankIndex;
        bool exists;
    }
    mapping(uint256 => PendingRequest) public pending;

    struct FulfilledResult {
        address botWallet;
        uint8 rankIndex;
        uint256 itemId;
        bool fulfilled;
    }
    mapping(uint256 => FulfilledResult) public fulfilledByRequestId;

    event RankUpLootRequested(uint256 indexed requestId, address indexed botWallet, uint8 rankIndex);
    event RankUpLootAwarded(uint256 indexed requestId, address indexed botWallet, uint8 rankIndex, uint256 itemId, uint256 randomness);

    uint8 public totalRanks = 7;
    uint8 public constant ITEMS_PER_RANK = 5;

    function setTotalRanks(uint8 _newTotalRanks) external onlyOwner {
        totalRanks = _newTotalRanks;
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
        _baseURI = baseURI_;
        subscriptionId = _subscriptionId;
        keyHash = _keyHash;
        callbackGasLimit = _callbackGasLimit;
        requestConfirmations = _requestConfirmations;
        numWords = _numWords;
    }

    function setBaseURI(string calldata baseURI_) external onlyOwner {
        _baseURI = baseURI_;
    }

    function setVrfConfig(
        uint256 _subscriptionId,
        bytes32 _keyHash,
        uint32 _callbackGasLimit,
        uint16 _requestConfirmations,
        uint32 _numWords
    ) external onlyOwner {
        subscriptionId = _subscriptionId;
        keyHash = _keyHash;
        callbackGasLimit = _callbackGasLimit;
        requestConfirmations = _requestConfirmations;
        numWords = _numWords;
    }

    /// @dev Returns token ID base for a rank (Iron=1, Bronze=6, ..., Master=31).
    function _baseTokenIdForRank(uint8 rankIndex) internal view returns (uint256) {
        require(rankIndex < totalRanks, "Invalid rank");
        return uint256(rankIndex) * ITEMS_PER_RANK + 1;
    }

    /**
     * @dev Request VRF for rank-up loot. Only relayer (owner) calls this; gas is sponsored.
     * @param botWallet Recipient of the NFT.
     * @param rankIndex 0=Iron, 1=Bronze, 2=Silver, 3=Gold, 4=Platinum, 5=Diamond, 6=Master.
     */
    function requestRankUpLoot(address botWallet, uint8 rankIndex) external onlyOwner returns (uint256 requestId) {
        require(botWallet != address(0), "Invalid wallet");
        require(rankIndex < totalRanks, "Invalid rank");
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

        requestId = s_vrfCoordinator.requestRandomWords(req);
        pending[requestId] = PendingRequest({ botWallet: botWallet, rankIndex: rankIndex, exists: true });

        emit RankUpLootRequested(requestId, botWallet, rankIndex);
    }

    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal override {
        PendingRequest memory r = pending[requestId];
        require(r.exists, "Unknown request");

        uint256 randomness = randomWords.length > 0 ? randomWords[0] : 0;
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
        return string(abi.encodePacked(_baseURI, _toString(tokenId), ".json"));
    }

    function _toString(uint256 value) private pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
