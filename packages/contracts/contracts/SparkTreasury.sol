// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SparkTreasury
 * @dev Treasury where viewers purchase Spark points. AVAX is received at spot rate via Chainlink
 *      AVAX/USD Price Feed (AggregatorV3Interface). Backend listens to SparksPurchased event
 *      and updates spark_balances / spark_transactions.
 *
 *      Revenue split on every purchase:
 *        - (100 - rewardSharePct)% → owner()   (platform revenue)
 *        - rewardSharePct%         → rewardPool (bot reward fund, controlled by backend relayer)
 *
 *      Fuji testnet price feed: 0x5498BB86BC934c8D34FDA08E81D444153d0D06aD
 */
contract SparkTreasury is Ownable {
    /// @dev Chainlink AVAX/USD price feed (8 decimals). Fuji: 0x5498BB86BC934c8D34FDA08E81D444153d0D06aD
    address public immutable priceFeed;

    /// @dev Backend relayer wallet that holds bot reward funds (10% of every purchase).
    address public rewardPool;

    /// @dev Percentage kept in rewardPool (1–50). Default: 10.
    uint256 public rewardSharePct = 10;

    /// @dev Maximum age (seconds) we accept for a Chainlink price answer. 1 hour.
    uint256 public constant PRICE_STALENESS_THRESHOLD = 3600;

    struct SparkPackage {
        uint256 sparkAmount;
        uint256 priceUsd8; // USD with 8 decimals (e.g. 5e8 = $5)
    }
    mapping(uint256 => SparkPackage) public packages;
    uint256 public packageCount;

    event SparksPurchased(
        address indexed buyer,
        uint256 sparkAmount,
        uint256 avaxPaid,
        uint256 ownerShare,
        uint256 rewardShare,
        string userId
    );
    event FundsWithdrawn(address indexed to, uint256 amount);
    event PackageSet(uint256 indexed packageId, uint256 sparkAmount, uint256 priceUsd8);
    event RewardPoolUpdated(address indexed newRewardPool);
    event RewardShareUpdated(uint256 newPct);

    error InvalidPackage();
    error InsufficientPayment();
    error InvalidPriceFeed();
    error StalePriceFeed();
    error TransferFailed();
    error InvalidAddress();
    error InvalidSharePct();

    constructor(address _priceFeed, address _rewardPool) Ownable(msg.sender) {
        if (_priceFeed == address(0)) revert InvalidPriceFeed();
        if (_rewardPool == address(0)) revert InvalidAddress();
        priceFeed = _priceFeed;
        rewardPool = _rewardPool;
        _setPackage(1, 1000, 5e8);
    }

    /**
     * @dev Fetches AVAX/USD price from Chainlink with full staleness and validity checks.
     *      Reverts if the feed is stale, uninitialized, or returns a non-positive answer.
     */
    function _getAvaxUsdPrice() internal view returns (uint256) {
        (bool ok, bytes memory data) = priceFeed.staticcall(
            abi.encodeWithSignature("latestRoundData()")
        );
        if (!ok || data.length < 160) revert InvalidPriceFeed();

        (uint80 roundId, int256 answer, , uint256 updatedAt, uint80 answeredInRound) =
            abi.decode(data, (uint80, int256, uint256, uint256, uint80));

        if (answer <= 0) revert InvalidPriceFeed();
        if (updatedAt == 0) revert StalePriceFeed();
        if (block.timestamp - updatedAt > PRICE_STALENESS_THRESHOLD) revert StalePriceFeed();
        if (answeredInRound < roundId) revert StalePriceFeed();

        return uint256(answer);
    }

    /**
     * @dev User sends AVAX; required amount calculated from packageId at spot rate.
     *      Excess AVAX beyond the required amount is refunded to the caller.
     *      Payment is split at purchase time:
     *        - (100 - rewardSharePct)% → owner() immediately
     *        - rewardSharePct%         → rewardPool immediately
     *
     * @param packageId Package number (e.g. 1 = 1000 Spark = $5)
     * @param userId    Supabase auth.users.id (backend event determines whose balance to credit)
     */
    function buySparks(uint256 packageId, string calldata userId) external payable {
        SparkPackage memory pkg = packages[packageId];
        if (pkg.sparkAmount == 0 || pkg.priceUsd8 == 0) revert InvalidPackage();

        uint256 price8 = _getAvaxUsdPrice();
        uint256 requiredWei = (pkg.priceUsd8 * 1e18) / price8;
        if (msg.value < requiredWei) revert InsufficientPayment();

        uint256 paymentWei = requiredWei;
        uint256 refundWei  = msg.value - requiredWei;

        uint256 rewardWei = (paymentWei * rewardSharePct) / 100;
        uint256 ownerWei  = paymentWei - rewardWei;

        // Emit before external calls (CEI)
        emit SparksPurchased(msg.sender, pkg.sparkAmount, paymentWei, ownerWei, rewardWei, userId);

        (bool ok1,) = payable(owner()).call{ value: ownerWei }("");
        if (!ok1) revert TransferFailed();

        (bool ok2,) = payable(rewardPool).call{ value: rewardWei }("");
        if (!ok2) revert TransferFailed();

        if (refundWei > 0) {
            (bool ok3,) = payable(msg.sender).call{ value: refundWei }("");
            if (!ok3) revert TransferFailed();
        }
    }

    /**
     * @dev Update the reward pool address. Only owner.
     */
    function setRewardPool(address _rewardPool) external onlyOwner {
        if (_rewardPool == address(0)) revert InvalidAddress();
        rewardPool = _rewardPool;
        emit RewardPoolUpdated(_rewardPool);
    }

    /**
     * @dev Update the reward share percentage (1–50). Only owner.
     */
    function setRewardSharePct(uint256 _pct) external onlyOwner {
        if (_pct == 0 || _pct > 50) revert InvalidSharePct();
        rewardSharePct = _pct;
        emit RewardShareUpdated(_pct);
    }

    /**
     * @dev Emergency drain — in normal operation the contract holds no balance.
     */
    function withdrawFunds() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance == 0) return;
        (bool ok,) = payable(owner()).call{ value: balance }("");
        if (!ok) revert TransferFailed();
        emit FundsWithdrawn(owner(), balance);
    }

    function setPackage(uint256 packageId, uint256 sparkAmount, uint256 priceUsd8) external onlyOwner {
        _setPackage(packageId, sparkAmount, priceUsd8);
    }

    function _setPackage(uint256 packageId, uint256 sparkAmount, uint256 priceUsd8) internal {
        require(sparkAmount > 0 && priceUsd8 > 0, "Invalid package");
        packages[packageId] = SparkPackage({ sparkAmount: sparkAmount, priceUsd8: priceUsd8 });
        if (packageId >= packageCount) packageCount = packageId + 1;
        emit PackageSet(packageId, sparkAmount, priceUsd8);
    }

    receive() external payable {}
}
