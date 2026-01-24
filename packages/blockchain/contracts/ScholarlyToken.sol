// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/**
 * @title ScholarlyToken
 * @dev ERC-20 token for the Scholarly education platform
 *
 * Features:
 * - Minting controlled by MINTER_ROLE (platform backend)
 * - Burnable for token buy-backs
 * - Pausable for emergency situations
 * - EIP-2612 permit for gasless approvals
 */
contract ScholarlyToken is ERC20, ERC20Burnable, ERC20Pausable, AccessControl, ERC20Permit {
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    // Maximum supply cap (100 million tokens with 18 decimals)
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10**18;

    // Events
    event TokensMinted(address indexed to, uint256 amount, string reason);
    event TokensBurned(address indexed from, uint256 amount, string reason);

    constructor(address defaultAdmin)
        ERC20("Scholarly Token", "SCHL")
        ERC20Permit("Scholarly Token")
    {
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(PAUSER_ROLE, defaultAdmin);
        _grantRole(MINTER_ROLE, defaultAdmin);
    }

    /**
     * @dev Pause token transfers (emergency use only)
     */
    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause token transfers
     */
    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @dev Mint new tokens (for rewards, airdrops, etc.)
     * @param to Recipient address
     * @param amount Amount to mint
     * @param reason Reason for minting (for audit trail)
     */
    function mint(address to, uint256 amount, string calldata reason) public onlyRole(MINTER_ROLE) {
        require(totalSupply() + amount <= MAX_SUPPLY, "ScholarlyToken: max supply exceeded");
        _mint(to, amount);
        emit TokensMinted(to, amount, reason);
    }

    /**
     * @dev Burn tokens with reason logging
     * @param amount Amount to burn
     * @param reason Reason for burning
     */
    function burnWithReason(uint256 amount, string calldata reason) public {
        burn(amount);
        emit TokensBurned(_msgSender(), amount, reason);
    }

    /**
     * @dev Returns the number of decimals (18, standard for ERC-20)
     */
    function decimals() public pure override returns (uint8) {
        return 18;
    }

    // Required overrides for multiple inheritance
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Pausable)
    {
        super._update(from, to, value);
    }
}
