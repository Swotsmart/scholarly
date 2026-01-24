// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title BookingEscrow
 * @dev Escrow contract for tutoring session payments
 *
 * Flow:
 * 1. Learner creates escrow with tutor and amount
 * 2. Learner funds escrow with SCHL tokens
 * 3. After session completes, backend releases funds to tutor
 * 4. Platform fee is deducted and sent to treasury
 * 5. If dispute arises, arbiter can split funds
 *
 * Features:
 * - Multi-token support (primarily SCHL token)
 * - Platform fee collection
 * - Dispute resolution by arbiters
 * - Auto-release after timeout (configurable)
 * - Refund on cancellation
 */
contract BookingEscrow is ReentrancyGuard, AccessControl, Pausable {
    using SafeERC20 for IERC20;

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant ARBITER_ROLE = keccak256("ARBITER_ROLE");

    // Escrow states
    enum EscrowState {
        Created,        // Initial state
        Funded,         // Learner has deposited funds
        Released,       // Funds released to tutor
        Refunded,       // Funds refunded to learner
        Disputed,       // Dispute raised, awaiting resolution
        Resolved        // Dispute resolved by arbiter
    }

    struct Escrow {
        address learner;
        address tutor;
        address token;              // ERC-20 token (SCHL)
        uint256 amount;             // Total amount in escrow
        uint256 platformFeeBps;     // Platform fee in basis points (e.g., 500 = 5%)
        bytes32 bookingId;          // Off-chain booking reference
        EscrowState state;
        uint256 createdAt;
        uint256 sessionScheduledAt;
        uint256 fundedAt;
        uint256 completedAt;
    }

    // Platform treasury address
    address public treasury;

    // Default platform fee (5%)
    uint256 public defaultPlatformFeeBps = 500;

    // Auto-release timeout (24 hours after scheduled session)
    uint256 public autoReleaseTimeout = 24 hours;

    // Minimum escrow amount
    uint256 public minimumAmount = 1e18; // 1 token

    // Escrow ID => Escrow data
    mapping(bytes32 => Escrow) public escrows;

    // Booking ID => Escrow ID (for lookups)
    mapping(bytes32 => bytes32) public bookingToEscrow;

    // Events
    event EscrowCreated(
        bytes32 indexed escrowId,
        bytes32 indexed bookingId,
        address indexed learner,
        address tutor,
        uint256 amount,
        address token
    );
    event EscrowFunded(bytes32 indexed escrowId, uint256 amount);
    event EscrowReleased(
        bytes32 indexed escrowId,
        uint256 tutorAmount,
        uint256 feeAmount
    );
    event EscrowRefunded(bytes32 indexed escrowId, uint256 amount);
    event DisputeRaised(bytes32 indexed escrowId, address indexed initiator, string reason);
    event DisputeResolved(
        bytes32 indexed escrowId,
        uint256 learnerAmount,
        uint256 tutorAmount,
        address arbiter
    );
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event PlatformFeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);

    constructor(address defaultAdmin, address _treasury) {
        require(_treasury != address(0), "BookingEscrow: zero treasury");

        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(OPERATOR_ROLE, defaultAdmin);
        _grantRole(ARBITER_ROLE, defaultAdmin);

        treasury = _treasury;
    }

    // ============ Core Functions ============

    /**
     * @dev Create a new escrow for a booking
     * @param escrowId Unique escrow identifier
     * @param bookingId Off-chain booking reference
     * @param tutor Tutor's address
     * @param token Payment token address (SCHL)
     * @param amount Total amount for the session
     * @param sessionScheduledAt Scheduled session timestamp
     */
    function createEscrow(
        bytes32 escrowId,
        bytes32 bookingId,
        address tutor,
        address token,
        uint256 amount,
        uint256 sessionScheduledAt
    ) external whenNotPaused {
        require(escrows[escrowId].learner == address(0), "BookingEscrow: escrow exists");
        require(bookingToEscrow[bookingId] == bytes32(0), "BookingEscrow: booking has escrow");
        require(tutor != address(0), "BookingEscrow: zero tutor");
        require(tutor != _msgSender(), "BookingEscrow: tutor is learner");
        require(amount >= minimumAmount, "BookingEscrow: amount too low");
        require(sessionScheduledAt > block.timestamp, "BookingEscrow: session in past");

        escrows[escrowId] = Escrow({
            learner: _msgSender(),
            tutor: tutor,
            token: token,
            amount: amount,
            platformFeeBps: defaultPlatformFeeBps,
            bookingId: bookingId,
            state: EscrowState.Created,
            createdAt: block.timestamp,
            sessionScheduledAt: sessionScheduledAt,
            fundedAt: 0,
            completedAt: 0
        });

        bookingToEscrow[bookingId] = escrowId;

        emit EscrowCreated(escrowId, bookingId, _msgSender(), tutor, amount, token);
    }

    /**
     * @dev Fund an escrow (learner deposits tokens)
     * @param escrowId Escrow to fund
     */
    function fundEscrow(bytes32 escrowId) external nonReentrant whenNotPaused {
        Escrow storage escrow = escrows[escrowId];

        require(escrow.learner != address(0), "BookingEscrow: nonexistent escrow");
        require(escrow.learner == _msgSender(), "BookingEscrow: not learner");
        require(escrow.state == EscrowState.Created, "BookingEscrow: invalid state");

        escrow.state = EscrowState.Funded;
        escrow.fundedAt = block.timestamp;

        IERC20(escrow.token).safeTransferFrom(_msgSender(), address(this), escrow.amount);

        emit EscrowFunded(escrowId, escrow.amount);
    }

    /**
     * @dev Release escrow to tutor after successful session
     * @param escrowId Escrow to release
     */
    function releaseEscrow(bytes32 escrowId) external nonReentrant onlyRole(OPERATOR_ROLE) {
        Escrow storage escrow = escrows[escrowId];

        require(escrow.state == EscrowState.Funded, "BookingEscrow: invalid state");

        uint256 feeAmount = (escrow.amount * escrow.platformFeeBps) / 10000;
        uint256 tutorAmount = escrow.amount - feeAmount;

        escrow.state = EscrowState.Released;
        escrow.completedAt = block.timestamp;

        IERC20(escrow.token).safeTransfer(escrow.tutor, tutorAmount);
        if (feeAmount > 0) {
            IERC20(escrow.token).safeTransfer(treasury, feeAmount);
        }

        emit EscrowReleased(escrowId, tutorAmount, feeAmount);
    }

    /**
     * @dev Refund escrow to learner (cancellation)
     * @param escrowId Escrow to refund
     */
    function refundEscrow(bytes32 escrowId) external nonReentrant {
        Escrow storage escrow = escrows[escrowId];

        require(escrow.state == EscrowState.Funded, "BookingEscrow: invalid state");

        // Only operator can refund, or learner can self-refund if session time passed + timeout
        bool isOperator = hasRole(OPERATOR_ROLE, _msgSender());
        bool isLearnerAfterTimeout = escrow.learner == _msgSender() &&
            block.timestamp > escrow.sessionScheduledAt + autoReleaseTimeout;

        require(isOperator || isLearnerAfterTimeout, "BookingEscrow: unauthorized");

        escrow.state = EscrowState.Refunded;
        escrow.completedAt = block.timestamp;

        IERC20(escrow.token).safeTransfer(escrow.learner, escrow.amount);

        emit EscrowRefunded(escrowId, escrow.amount);
    }

    // ============ Dispute Functions ============

    /**
     * @dev Raise a dispute on an escrow
     * @param escrowId Escrow to dispute
     * @param reason Reason for dispute
     */
    function raiseDispute(bytes32 escrowId, string calldata reason) external {
        Escrow storage escrow = escrows[escrowId];

        require(escrow.state == EscrowState.Funded, "BookingEscrow: invalid state");
        require(
            escrow.learner == _msgSender() || escrow.tutor == _msgSender(),
            "BookingEscrow: not party to escrow"
        );

        escrow.state = EscrowState.Disputed;

        emit DisputeRaised(escrowId, _msgSender(), reason);
    }

    /**
     * @dev Resolve a dispute by splitting funds
     * @param escrowId Escrow to resolve
     * @param learnerPercentage Percentage of funds to learner (0-100)
     */
    function resolveDispute(bytes32 escrowId, uint256 learnerPercentage)
        external
        nonReentrant
        onlyRole(ARBITER_ROLE)
    {
        Escrow storage escrow = escrows[escrowId];

        require(escrow.state == EscrowState.Disputed, "BookingEscrow: not disputed");
        require(learnerPercentage <= 100, "BookingEscrow: invalid percentage");

        escrow.state = EscrowState.Resolved;
        escrow.completedAt = block.timestamp;

        uint256 learnerAmount = (escrow.amount * learnerPercentage) / 100;
        uint256 tutorAmount = escrow.amount - learnerAmount;

        if (learnerAmount > 0) {
            IERC20(escrow.token).safeTransfer(escrow.learner, learnerAmount);
        }
        if (tutorAmount > 0) {
            // Deduct platform fee from tutor's portion
            uint256 feeAmount = (tutorAmount * escrow.platformFeeBps) / 10000;
            uint256 tutorNet = tutorAmount - feeAmount;

            IERC20(escrow.token).safeTransfer(escrow.tutor, tutorNet);
            if (feeAmount > 0) {
                IERC20(escrow.token).safeTransfer(treasury, feeAmount);
            }
        }

        emit DisputeResolved(escrowId, learnerAmount, tutorAmount, _msgSender());
    }

    // ============ View Functions ============

    /**
     * @dev Get escrow details
     */
    function getEscrow(bytes32 escrowId) external view returns (Escrow memory) {
        return escrows[escrowId];
    }

    /**
     * @dev Get escrow by booking ID
     */
    function getEscrowByBooking(bytes32 bookingId) external view returns (Escrow memory) {
        bytes32 escrowId = bookingToEscrow[bookingId];
        require(escrowId != bytes32(0), "BookingEscrow: no escrow for booking");
        return escrows[escrowId];
    }

    /**
     * @dev Check if escrow is eligible for auto-release/refund
     */
    function isEligibleForAutoAction(bytes32 escrowId) external view returns (bool canRelease, bool canRefund) {
        Escrow memory escrow = escrows[escrowId];

        if (escrow.state != EscrowState.Funded) {
            return (false, false);
        }

        bool timeoutPassed = block.timestamp > escrow.sessionScheduledAt + autoReleaseTimeout;
        return (timeoutPassed, timeoutPassed);
    }

    // ============ Admin Functions ============

    /**
     * @dev Update treasury address
     */
    function setTreasury(address newTreasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newTreasury != address(0), "BookingEscrow: zero address");
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }

    /**
     * @dev Update default platform fee
     */
    function setPlatformFee(uint256 newFeeBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newFeeBps <= 3000, "BookingEscrow: fee too high"); // Max 30%
        emit PlatformFeeUpdated(defaultPlatformFeeBps, newFeeBps);
        defaultPlatformFeeBps = newFeeBps;
    }

    /**
     * @dev Update auto-release timeout
     */
    function setAutoReleaseTimeout(uint256 newTimeout) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newTimeout >= 1 hours && newTimeout <= 7 days, "BookingEscrow: invalid timeout");
        autoReleaseTimeout = newTimeout;
    }

    /**
     * @dev Update minimum escrow amount
     */
    function setMinimumAmount(uint256 newMinimum) external onlyRole(DEFAULT_ADMIN_ROLE) {
        minimumAmount = newMinimum;
    }

    /**
     * @dev Pause contract
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause contract
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
