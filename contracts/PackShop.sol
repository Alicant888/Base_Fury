// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

contract PackShop {
    address public owner;

    mapping(address => mapping(uint8 => bool)) public hasPack;
    mapping(uint8 => uint256) public prices;

    event PackPurchased(address indexed buyer, uint8 indexed packId, uint256 value);
    event PriceUpdated(uint8 indexed packId, uint256 newPriceWei);
    event OwnerUpdated(address indexed oldOwner, address indexed newOwner);
    event Withdrawn(address indexed to, uint256 amountWei);

    error NotOwner();
    error InvalidPackId();
    error AlreadyPurchased();
    error InvalidPrice();
    error InvalidAmount();
    error TransferFailed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address initialOwner) {
        owner = initialOwner == address(0) ? msg.sender : initialOwner;

        prices[0] = 500000000000000;
        prices[1] = 1000000000000000;
        prices[2] = 2000000000000000;
        prices[3] = 6000000000000000;
        prices[4] = 50000000000000000;
        prices[5] = 6000000000000000;
    }

    function buyPack(uint8 packId) external payable {
        if (packId > 5) revert InvalidPackId();
        if (hasPack[msg.sender][packId]) revert AlreadyPurchased();

        uint256 price = prices[packId];
        if (price == 0 || msg.value != price) revert InvalidPrice();

        hasPack[msg.sender][packId] = true;
        emit PackPurchased(msg.sender, packId, msg.value);
    }

    function setPrice(uint8 packId, uint256 newPriceWei) external onlyOwner {
        if (packId > 5) revert InvalidPackId();
        prices[packId] = newPriceWei;
        emit PriceUpdated(packId, newPriceWei);
    }

    function setOwner(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidAmount();
        address old = owner;
        owner = newOwner;
        emit OwnerUpdated(old, newOwner);
    }

    function withdraw(address payable to, uint256 amountWei) external onlyOwner {
        if (to == address(0)) revert InvalidAmount();
        uint256 amount = amountWei == 0 ? address(this).balance : amountWei;
        if (amount > address(this).balance) revert InvalidAmount();

        (bool ok, ) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit Withdrawn(to, amount);
    }

    receive() external payable {}
}
