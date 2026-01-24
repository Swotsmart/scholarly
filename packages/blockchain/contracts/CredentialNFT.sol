// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title CredentialNFT
 * @dev Soulbound (non-transferable) NFTs for educational credentials
 *
 * Use cases:
 * - Tutor qualifications and certifications
 * - Student course completions
 * - Achievement badges
 * - Safeguarding/background check verifications
 *
 * Features:
 * - Soulbound: Cannot be transferred after minting
 * - Revocable: Credentials can be revoked by issuers
 * - Verifiable: On-chain verification of credential validity
 * - Metadata hash: Links to off-chain credential details
 */
contract CredentialNFT is ERC721, ERC721URIStorage, ERC721Enumerable, AccessControl {
    using Counters for Counters.Counter;

    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant REVOKER_ROLE = keccak256("REVOKER_ROLE");

    Counters.Counter private _tokenIdCounter;

    // Credential types
    string public constant CREDENTIAL_TUTOR_QUALIFICATION = "tutor_qualification";
    string public constant CREDENTIAL_COURSE_COMPLETION = "course_completion";
    string public constant CREDENTIAL_ACHIEVEMENT = "achievement";
    string public constant CREDENTIAL_SAFEGUARDING = "safeguarding";
    string public constant CREDENTIAL_BACKGROUND_CHECK = "background_check";

    struct Credential {
        string credentialType;
        address issuer;
        uint256 issuedAt;
        uint256 expiresAt;      // 0 = never expires
        bytes32 dataHash;       // Hash of off-chain credential data
        bool revoked;
        uint256 revokedAt;
        string revocationReason;
    }

    // Token ID => Credential data
    mapping(uint256 => Credential) public credentials;

    // Holder address => array of token IDs
    mapping(address => uint256[]) private _holderCredentials;

    // Data hash => token ID (to prevent duplicate credentials)
    mapping(bytes32 => uint256) public credentialByHash;

    // Events
    event CredentialIssued(
        uint256 indexed tokenId,
        address indexed recipient,
        string credentialType,
        address issuer,
        bytes32 dataHash
    );
    event CredentialRevoked(
        uint256 indexed tokenId,
        address indexed revoker,
        string reason
    );
    event CredentialRenewed(
        uint256 indexed tokenId,
        uint256 newExpiresAt
    );

    constructor(address defaultAdmin) ERC721("Scholarly Credential", "SCHLCRED") {
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(ISSUER_ROLE, defaultAdmin);
        _grantRole(REVOKER_ROLE, defaultAdmin);
    }

    /**
     * @dev Issue a new credential NFT
     * @param recipient Address to receive the credential
     * @param credentialType Type of credential (use constants above)
     * @param expiresAt Unix timestamp when credential expires (0 = never)
     * @param dataHash Hash of off-chain credential data
     * @param metadataURI IPFS or HTTP URI to credential metadata
     */
    function issueCredential(
        address recipient,
        string calldata credentialType,
        uint256 expiresAt,
        bytes32 dataHash,
        string calldata metadataURI
    ) external onlyRole(ISSUER_ROLE) returns (uint256) {
        require(recipient != address(0), "CredentialNFT: zero address");
        require(bytes(credentialType).length > 0, "CredentialNFT: empty credential type");
        require(dataHash != bytes32(0), "CredentialNFT: empty data hash");
        require(credentialByHash[dataHash] == 0, "CredentialNFT: duplicate credential");

        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();

        _safeMint(recipient, tokenId);
        _setTokenURI(tokenId, metadataURI);

        credentials[tokenId] = Credential({
            credentialType: credentialType,
            issuer: _msgSender(),
            issuedAt: block.timestamp,
            expiresAt: expiresAt,
            dataHash: dataHash,
            revoked: false,
            revokedAt: 0,
            revocationReason: ""
        });

        _holderCredentials[recipient].push(tokenId);
        credentialByHash[dataHash] = tokenId;

        emit CredentialIssued(tokenId, recipient, credentialType, _msgSender(), dataHash);

        return tokenId;
    }

    /**
     * @dev Revoke a credential
     * @param tokenId Token ID to revoke
     * @param reason Reason for revocation
     */
    function revokeCredential(uint256 tokenId, string calldata reason)
        external
        onlyRole(REVOKER_ROLE)
    {
        require(_ownerOf(tokenId) != address(0), "CredentialNFT: nonexistent token");
        require(!credentials[tokenId].revoked, "CredentialNFT: already revoked");

        credentials[tokenId].revoked = true;
        credentials[tokenId].revokedAt = block.timestamp;
        credentials[tokenId].revocationReason = reason;

        emit CredentialRevoked(tokenId, _msgSender(), reason);
    }

    /**
     * @dev Renew a credential's expiration
     * @param tokenId Token ID to renew
     * @param newExpiresAt New expiration timestamp
     */
    function renewCredential(uint256 tokenId, uint256 newExpiresAt)
        external
        onlyRole(ISSUER_ROLE)
    {
        require(_ownerOf(tokenId) != address(0), "CredentialNFT: nonexistent token");
        require(!credentials[tokenId].revoked, "CredentialNFT: credential revoked");
        require(
            newExpiresAt == 0 || newExpiresAt > block.timestamp,
            "CredentialNFT: invalid expiration"
        );

        credentials[tokenId].expiresAt = newExpiresAt;
        emit CredentialRenewed(tokenId, newExpiresAt);
    }

    /**
     * @dev Verify if a credential is valid
     * @param tokenId Token ID to verify
     * @return valid Whether the credential is valid
     * @return credential The credential data
     */
    function verifyCredential(uint256 tokenId)
        external
        view
        returns (bool valid, Credential memory credential)
    {
        require(_ownerOf(tokenId) != address(0), "CredentialNFT: nonexistent token");

        credential = credentials[tokenId];

        valid = !credential.revoked &&
                (credential.expiresAt == 0 || credential.expiresAt > block.timestamp);

        return (valid, credential);
    }

    /**
     * @dev Get all credentials for a holder
     * @param holder Address of credential holder
     * @return tokenIds Array of token IDs owned by holder
     */
    function getHolderCredentials(address holder)
        external
        view
        returns (uint256[] memory)
    {
        return _holderCredentials[holder];
    }

    /**
     * @dev Get valid credentials of a specific type for a holder
     * @param holder Address of credential holder
     * @param credentialType Type of credential to filter by
     * @return tokenIds Array of valid token IDs matching criteria
     */
    function getValidCredentialsByType(address holder, string calldata credentialType)
        external
        view
        returns (uint256[] memory)
    {
        uint256[] memory holderTokens = _holderCredentials[holder];
        uint256[] memory validTokens = new uint256[](holderTokens.length);
        uint256 validCount = 0;

        for (uint256 i = 0; i < holderTokens.length; i++) {
            uint256 tokenId = holderTokens[i];
            Credential memory cred = credentials[tokenId];

            if (!cred.revoked &&
                (cred.expiresAt == 0 || cred.expiresAt > block.timestamp) &&
                keccak256(bytes(cred.credentialType)) == keccak256(bytes(credentialType))) {
                validTokens[validCount] = tokenId;
                validCount++;
            }
        }

        // Resize array to actual count
        uint256[] memory result = new uint256[](validCount);
        for (uint256 i = 0; i < validCount; i++) {
            result[i] = validTokens[i];
        }

        return result;
    }

    // ============ Soulbound Implementation ============

    /**
     * @dev Override to make tokens soulbound (non-transferable)
     * Allows minting and burning but prevents transfers
     */
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        address from = _ownerOf(tokenId);

        // Allow minting (from = 0) and burning (to = 0), prevent transfers
        if (from != address(0) && to != address(0)) {
            revert("CredentialNFT: soulbound, transfer disabled");
        }

        return super._update(to, tokenId, auth);
    }

    // ============ Required Overrides ============

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
