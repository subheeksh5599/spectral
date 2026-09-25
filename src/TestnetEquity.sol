// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title TestnetEquity — a tokenized-equity-shaped ERC-20 that exists only on a testnet
/// @notice This is a replica, not an asset. It is not Backed's xStock, it is not issued by
/// Tesla, it tracks no share, and it has no issuer, no transfer agent and no redemption.
/// What it does have is what the mechanism on top of it needs: a real ERC-20 with real
/// transfers on a public chain, so a market can be denominated in a token that behaves
/// like the tokenized equity it is standing in for, instead of in a mock.
///
/// Any address may mint, on purpose: a testnet replica nobody can obtain is useless, and
/// this contract holds no value. `MINT_CAP` bounds a single call only to keep an
/// accidentally huge supply out of a demo screen.
contract TestnetEquity {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;

    uint256 public constant MINT_CAP = 1_000_000e18;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 amount);
    event Approval(address indexed owner, address indexed spender, uint256 amount);

    error InsufficientBalance();
    error InsufficientAllowance();
    error ZeroAddress();
    error MintCapExceeded(uint256 cap);

    constructor(string memory name_, string memory symbol_) {
        name = name_;
        symbol = symbol_;
    }

    /// @notice open faucet — testnet only, this token is worth nothing
    function mint(address to, uint256 amount) external {
        if (to == address(0)) revert ZeroAddress();
        if (amount > MINT_CAP) revert MintCapExceeded(MINT_CAP);
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _move(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            if (allowed < amount) revert InsufficientAllowance();
            allowance[from][msg.sender] = allowed - amount;
        }
        _move(from, to, amount);
        return true;
    }

    function _move(address from, address to, uint256 amount) internal {
        if (to == address(0)) revert ZeroAddress();
        uint256 bal = balanceOf[from];
        if (bal < amount) revert InsufficientBalance();
        unchecked { balanceOf[from] = bal - amount; }
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }
}
