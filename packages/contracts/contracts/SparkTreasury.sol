// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SparkTreasury
 * @dev Treasury where viewers purchase Spark points. AVAX is received at spot rate via Chainlink
 *      AVAX/USD Price Feed (AggregatorV3Interface). Backend listens to SparksPurchased event
 *      and updates spark_balances / spark_transactions.
 *      Fuji testnet price feed: 0x5498BB86BC934c8D34FDA08E81D444153d0D06aD
 */
contract SparkTreasury is Ownable {
    /// @dev Chainlink AVAX/USD price feed (8 decimals). Fuji: 0x5498BB86BC934c8D34FDA08E81D444153d0D06aD
    address public immutable priceFeed;

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
        string userId
    );
    event FundsWithdrawn(address indexed to, uint256 amount);
    event PackageSet(uint256 indexed packageId, uint256 sparkAmount, uint256 priceUsd8);

    error InvalidPackage();
    error InsufficientPayment();
    error InvalidPriceFeed();
    error TransferFailed();

    constructor(address _priceFeed) Ownable(msg.sender) {
        if (_priceFeed == address(0)) revert InvalidPriceFeed();
        priceFeed = _priceFeed;
        // Default package: 1 = 1000 Spark = $5
        _setPackage(1, 1000, 5e8);
    }

    /**
     * @dev Chainlink AggregatorV3Interface compatible getter (minimal interface)
     */
    function _getAvaxUsdPrice() internal view returns (uint256) {
        (bool ok, bytes memory data) = priceFeed.staticcall(
            abi.encodeWithSignature("latestRoundData()")
        );
        if (!ok || data.length < 160) return 0;
        (, int256 answer,,,) = abi.decode(data, (uint80, int256, uint256, uint256, uint80));
        return answer < 0 ? 0 : uint256(answer);
    }

    /**
     * @dev User sends AVAX; required amount calculated from packageId at spot rate.
     * @param packageId Package number (e.g. 1 = 1000 Spark = $5)
     * @param userId Supabase auth.users.id (backend event determines whose balance to credit)
     */
    function buySparks(uint256 packageId, string calldata userId) external payable {
        SparkPackage memory pkg = packages[packageId];
        if (pkg.sparkAmount == 0 || pkg.priceUsd8 == 0) revert InvalidPackage();

        uint256 price8 = _getAvaxUsdPrice();
        if (price8 == 0) revert InvalidPriceFeed();
        // requiredWei = (priceUsd8 * 1e18) / price8  => same 8 decimals in numerator
        uint256 requiredWei = (pkg.priceUsd8 * 1e18) / price8;
        if (msg.value < requiredWei) revert InsufficientPayment();

        emit SparksPurchased(msg.sender, pkg.sparkAmount, msg.value, userId);
    }

    /**
     * @dev Only owner can withdraw accumulated AVAX.
     */
    function withdrawFunds() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance == 0) return;
        (bool ok,) = payable(owner()).call{ value: balance }("");
        if (!ok) revert TransferFailed();
        emit FundsWithdrawn(owner(), balance);
    }

    /**
     * @dev Add or update package.
     */
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
