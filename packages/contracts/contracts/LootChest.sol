// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// OpenZeppelin Ownable'ı sildik çünkü VRFConsumerBaseV2Plus kendi sahiplik sistemini içeriyor.
import "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

/**
 * @title LootChest
 * @dev Chainlink VRF v2.5 (Plus) consumer for Lanista RPG loot drops.
 * The platform relayer (owner) requests randomness after a match finishes.
 * Chainlink VRF fulfills the request and the contract records an immutable loot roll.
 */
contract LootChest is VRFConsumerBaseV2Plus {
    struct PendingRequest {
        string matchId;
        address winner;
        bool exists;
    }

    struct Loot {
        bool fulfilled;
        address winner;
        uint256 itemId;
        uint256 randomness;
        uint256 timestamp;
    }

    event LootRequested(uint256 indexed requestId, string indexed matchId, address indexed winner);
    event LootAwarded(string indexed matchId, address indexed winner, uint256 itemId, uint256 randomness, uint256 timestamp);

    // VRF v2.5 subscription id is uint256 in the client library
    uint256 public subscriptionId;
    bytes32 public keyHash;
    uint32 public callbackGasLimit;
    uint16 public requestConfirmations;
    uint32 public numWords;

    // requestId => pending request
    mapping(uint256 => PendingRequest) public pending;

    // matchId => VRF requestId
    mapping(string => uint256) public requestIdByMatch;

    // matchId => loot result
    mapping(string => Loot) private lootByMatch;

    constructor(
        address coordinatorAddress,
        uint256 _subscriptionId,
        bytes32 _keyHash,
        uint32 _callbackGasLimit,
        uint16 _requestConfirmations,
        uint32 _numWords
    ) VRFConsumerBaseV2Plus(coordinatorAddress) {
        require(coordinatorAddress != address(0), "Invalid coordinator");

        subscriptionId = _subscriptionId;
        keyHash = _keyHash;
        callbackGasLimit = _callbackGasLimit;
        requestConfirmations = _requestConfirmations;
        numWords = _numWords;
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

    /**
     * @dev Requests a VRF roll for a match. Only the platform relayer can call this.
     * The winner address is recorded for the loot result.
     */
    function requestLoot(string calldata matchId, address winner) external onlyOwner returns (uint256 requestId) {
        require(bytes(matchId).length > 0, "matchId required");
        require(winner != address(0), "winner required");
        require(requestIdByMatch[matchId] == 0, "Loot already requested");
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
                VRFV2PlusClient.ExtraArgsV1({
                    // false => pay in LINK, true => native gas token
                    nativePayment: false
                })
            )
        });

        requestId = s_vrfCoordinator.requestRandomWords(req);

        pending[requestId] = PendingRequest({ matchId: matchId, winner: winner, exists: true });
        requestIdByMatch[matchId] = requestId;

        emit LootRequested(requestId, matchId, winner);
    }

    // "memory" yerine "calldata" olarak güncellendi.
    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal override {
        PendingRequest memory r = pending[requestId];
        require(r.exists, "Unknown request");

        // Simple item table: 1..5
        uint256 randomness = randomWords.length > 0 ? randomWords[0] : 0;
        uint256 itemId = (randomness % 5) + 1;

        lootByMatch[r.matchId] = Loot({
            fulfilled: true,
            winner: r.winner,
            itemId: itemId,
            randomness: randomness,
            timestamp: block.timestamp
        });

        delete pending[requestId];

        emit LootAwarded(r.matchId, r.winner, itemId, randomness, block.timestamp);
    }

    function getLoot(string calldata matchId)
        external
        view
        returns (bool fulfilled, address winner, uint256 itemId, uint256 randomness, uint256 timestamp, uint256 requestId)
    {
        Loot memory l = lootByMatch[matchId];
        uint256 rid = requestIdByMatch[matchId];
        return (l.fulfilled, l.winner, l.itemId, l.randomness, l.timestamp, rid);
    }
}