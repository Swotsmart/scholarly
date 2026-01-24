// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title ReputationRegistry
 * @dev On-chain reputation tracking for the Scholarly platform
 *
 * Features:
 * - Track session completion rates
 * - Store aggregated ratings (1-5 stars, stored as 100-500)
 * - Record dispute outcomes
 * - Calculate weighted reputation scores
 * - Oracle-controlled updates from backend
 *
 * Score calculation:
 * - 40% completion rate
 * - 40% average rating
 * - 20% dispute ratio (favorable)
 */
contract ReputationRegistry is AccessControl, Pausable {
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    // Rating scale: 100 = 1 star, 500 = 5 stars (for precision)
    uint256 public constant MIN_RATING = 100;
    uint256 public constant MAX_RATING = 500;

    // Minimum sessions for reliable score
    uint256 public constant MIN_SESSIONS_FOR_SCORE = 3;

    struct Reputation {
        uint256 totalSessions;
        uint256 completedSessions;
        uint256 cancelledByUser;
        uint256 totalRatings;
        uint256 ratingSum;          // Sum of all ratings (100-500 scale)
        uint256 disputesTotal;
        uint256 disputesWon;
        uint256 lastUpdated;
        bool initialized;
    }

    // User address => Reputation data
    mapping(address => Reputation) public reputations;

    // Track registered users for enumeration
    address[] public registeredUsers;
    mapping(address => bool) public isRegistered;

    // Events
    event ReputationInitialized(address indexed user);
    event SessionRecorded(
        address indexed user,
        bool completed,
        uint256 rating
    );
    event DisputeRecorded(
        address indexed user,
        bool won
    );
    event ScoreUpdated(
        address indexed user,
        uint256 newScore,
        uint256 completionRate,
        uint256 averageRating
    );

    constructor(address defaultAdmin) {
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(ORACLE_ROLE, defaultAdmin);
    }

    // ============ Oracle Functions ============

    /**
     * @dev Initialize reputation for a new user
     * @param user Address of the user
     */
    function initializeUser(address user) external onlyRole(ORACLE_ROLE) {
        require(user != address(0), "ReputationRegistry: zero address");
        require(!reputations[user].initialized, "ReputationRegistry: already initialized");

        reputations[user] = Reputation({
            totalSessions: 0,
            completedSessions: 0,
            cancelledByUser: 0,
            totalRatings: 0,
            ratingSum: 0,
            disputesTotal: 0,
            disputesWon: 0,
            lastUpdated: block.timestamp,
            initialized: true
        });

        if (!isRegistered[user]) {
            registeredUsers.push(user);
            isRegistered[user] = true;
        }

        emit ReputationInitialized(user);
    }

    /**
     * @dev Record a completed session with rating
     * @param user Address of the user (tutor or learner)
     * @param rating Rating given (100-500, 0 if no rating)
     */
    function recordSessionCompletion(address user, uint256 rating)
        external
        onlyRole(ORACLE_ROLE)
        whenNotPaused
    {
        require(reputations[user].initialized, "ReputationRegistry: user not initialized");
        require(rating == 0 || (rating >= MIN_RATING && rating <= MAX_RATING), "ReputationRegistry: invalid rating");

        Reputation storage rep = reputations[user];

        rep.totalSessions++;
        rep.completedSessions++;

        if (rating > 0) {
            rep.totalRatings++;
            rep.ratingSum += rating;
        }

        rep.lastUpdated = block.timestamp;

        emit SessionRecorded(user, true, rating);
        _emitScoreUpdate(user);
    }

    /**
     * @dev Record a cancelled session
     * @param user Address of the user who cancelled
     * @param cancelledByThisUser Whether this user initiated the cancellation
     */
    function recordSessionCancellation(address user, bool cancelledByThisUser)
        external
        onlyRole(ORACLE_ROLE)
        whenNotPaused
    {
        require(reputations[user].initialized, "ReputationRegistry: user not initialized");

        Reputation storage rep = reputations[user];

        rep.totalSessions++;
        if (cancelledByThisUser) {
            rep.cancelledByUser++;
        }

        rep.lastUpdated = block.timestamp;

        emit SessionRecorded(user, false, 0);
        _emitScoreUpdate(user);
    }

    /**
     * @dev Record a dispute outcome
     * @param user Address of the user
     * @param won Whether the user won the dispute
     */
    function recordDispute(address user, bool won)
        external
        onlyRole(ORACLE_ROLE)
        whenNotPaused
    {
        require(reputations[user].initialized, "ReputationRegistry: user not initialized");

        Reputation storage rep = reputations[user];

        rep.disputesTotal++;
        if (won) {
            rep.disputesWon++;
        }

        rep.lastUpdated = block.timestamp;

        emit DisputeRecorded(user, won);
        _emitScoreUpdate(user);
    }

    /**
     * @dev Batch record sessions (gas optimization)
     * @param users Array of user addresses
     * @param completed Array of completion flags
     * @param ratings Array of ratings
     */
    function batchRecordSessions(
        address[] calldata users,
        bool[] calldata completed,
        uint256[] calldata ratings
    ) external onlyRole(ORACLE_ROLE) whenNotPaused {
        require(
            users.length == completed.length && users.length == ratings.length,
            "ReputationRegistry: array length mismatch"
        );

        for (uint256 i = 0; i < users.length; i++) {
            if (!reputations[users[i]].initialized) continue;

            Reputation storage rep = reputations[users[i]];
            rep.totalSessions++;

            if (completed[i]) {
                rep.completedSessions++;
                if (ratings[i] >= MIN_RATING && ratings[i] <= MAX_RATING) {
                    rep.totalRatings++;
                    rep.ratingSum += ratings[i];
                }
            }

            rep.lastUpdated = block.timestamp;
        }
    }

    // ============ View Functions ============

    /**
     * @dev Get reputation score (0-100)
     * @param user Address to check
     * @return score Weighted reputation score
     */
    function getReputationScore(address user) external view returns (uint256 score) {
        Reputation memory rep = reputations[user];

        if (!rep.initialized || rep.totalSessions < MIN_SESSIONS_FOR_SCORE) {
            return 0; // Not enough data
        }

        // Completion rate (40% weight): completed / total * 100
        uint256 completionScore = (rep.completedSessions * 100) / rep.totalSessions;

        // Average rating (40% weight): (avgRating - 100) / 4 * 100 / 100
        // Converts 100-500 scale to 0-100
        uint256 ratingScore = 0;
        if (rep.totalRatings > 0) {
            uint256 avgRating = rep.ratingSum / rep.totalRatings;
            ratingScore = (avgRating - MIN_RATING) * 100 / (MAX_RATING - MIN_RATING);
        } else {
            ratingScore = 50; // Neutral if no ratings
        }

        // Dispute ratio (20% weight): won / total * 100
        uint256 disputeScore = 50; // Default neutral
        if (rep.disputesTotal > 0) {
            disputeScore = (rep.disputesWon * 100) / rep.disputesTotal;
        }

        // Weighted average
        score = (completionScore * 40 + ratingScore * 40 + disputeScore * 20) / 100;

        return score;
    }

    /**
     * @dev Get detailed reputation stats
     */
    function getReputationDetails(address user)
        external
        view
        returns (
            uint256 totalSessions,
            uint256 completedSessions,
            uint256 completionRate,
            uint256 averageRating,
            uint256 disputesWon,
            uint256 disputesTotal,
            uint256 overallScore,
            uint256 lastUpdated
        )
    {
        Reputation memory rep = reputations[user];

        totalSessions = rep.totalSessions;
        completedSessions = rep.completedSessions;
        completionRate = rep.totalSessions > 0 ? (rep.completedSessions * 100) / rep.totalSessions : 0;
        averageRating = rep.totalRatings > 0 ? rep.ratingSum / rep.totalRatings : 0;
        disputesWon = rep.disputesWon;
        disputesTotal = rep.disputesTotal;
        overallScore = this.getReputationScore(user);
        lastUpdated = rep.lastUpdated;
    }

    /**
     * @dev Check if user has enough sessions for reliable score
     */
    function hasReliableScore(address user) external view returns (bool) {
        return reputations[user].initialized &&
               reputations[user].totalSessions >= MIN_SESSIONS_FOR_SCORE;
    }

    /**
     * @dev Get total registered users
     */
    function getTotalUsers() external view returns (uint256) {
        return registeredUsers.length;
    }

    /**
     * @dev Get paginated list of users
     */
    function getUsers(uint256 offset, uint256 limit)
        external
        view
        returns (address[] memory users)
    {
        uint256 total = registeredUsers.length;
        if (offset >= total) {
            return new address[](0);
        }

        uint256 end = offset + limit > total ? total : offset + limit;
        users = new address[](end - offset);

        for (uint256 i = offset; i < end; i++) {
            users[i - offset] = registeredUsers[i];
        }
    }

    // ============ Internal Functions ============

    function _emitScoreUpdate(address user) internal {
        Reputation memory rep = reputations[user];

        uint256 completionRate = rep.totalSessions > 0
            ? (rep.completedSessions * 100) / rep.totalSessions
            : 0;

        uint256 averageRating = rep.totalRatings > 0
            ? rep.ratingSum / rep.totalRatings
            : 0;

        emit ScoreUpdated(
            user,
            this.getReputationScore(user),
            completionRate,
            averageRating
        );
    }

    // ============ Admin Functions ============

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
