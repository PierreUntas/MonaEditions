// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title IHoneyTokenization
 * @dev Interface for the HoneyTokenization contract
 */
interface IHoneyTokenization {
    function mintHoneyBatch(
        address producer,
        uint256 amount,
        string memory uri
    ) external returns (uint256);

    function balanceOf(
        address account,
        uint256 id
    ) external view returns (uint256);

    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) external;

    function tokenProducer(uint256 tokenId) external view returns (address);

    function isApprovedForAll(
        address account,
        address operator
    ) external view returns (bool);
}

/**
 * @title HoneyTraceStorage
 * @dev Main contract for honey traceability system using Merkle Tree for secure token distribution
 * @notice This contract manages producers, honey batches, and token claims using cryptographic proofs
 *
 * The contract implements a three-tier authorization system:
 * 1. Owner can add/remove admins
 * 2. Admins can authorize producers
 * 3. Authorized producers can create honey batches
 *
 * Token distribution uses Merkle Tree proofs for gas-efficient and secure claiming.
 */
contract HoneyTraceStorage is Ownable, ReentrancyGuard {
    // ============ CONSTANTS ============

    /// @dev Maximum number of tokens that can be minted in a single batch
    uint256 public constant MAX_BATCH_SIZE = 100_000;

    /// @dev Maximum number of comments a user can add per batch
    uint256 public constant MAX_COMMENTS_PER_USER = 2;

    /// @dev Maximum number of comments returned in a single query
    uint256 public constant MAX_COMMENTS_QUERY = 100;

    // ============ STRUCTS ============

    /**
     * @dev Structure representing a honey producer
     * @param authorized Whether the producer is authorized to create batches
     * @param name Business name of the producer
     * @param location Physical location of production
     * @param companyRegisterNumber Official business registration number
     * @param metadata IPFS CID pointing to additional information JSON (certifications, etc.)
     */
    struct Producer {
        bool authorized;
        string name;
        string location;
        string companyRegisterNumber;
        string metadata;
    }

    /**
     * @dev Structure representing a honey batch
     * @param honeyType Type of honey (e.g., "Acacia", "Lavender")
     * @param metadata IPFS CID pointing to batch metadata JSON (origin, harvest date, etc.)
     * @param merkleRoot Root hash of the Merkle Tree containing all secret keys for this batch
     * @param hasBeenClaimed Flag indicating if at least one token has been claimed (locks metadata)
     */
    struct HoneyBatch {
        string honeyType;
        string metadata;
        bytes32 merkleRoot;
        bool hasBeenClaimed;
    }

    /**
     * @dev Structure representing a consumer comment/review
     * @param consumer Address of the consumer who left the comment
     * @param honeyBatchId ID of the batch being reviewed
     * @param rating Numerical rating (0-5)
     * @param metadata IPFS CID pointing to comment text in JSON format
     */
    struct Comment {
        address consumer;
        uint honeyBatchId;
        uint8 rating;
        string metadata;
    }

    // ============ STATE VARIABLES ============

    /// @dev Mapping from producer address to their information
    mapping(address => Producer) private producers;

    /// @dev Mapping from batch ID to batch information
    mapping(uint => HoneyBatch) private honeyBatches;

    /// @dev Mapping from batch ID to array of comments
    mapping(uint => Comment[]) private honeyBatchesComments;

    /// @dev Mapping to track admin addresses
    mapping(address => bool) public admins;

    /// @dev Reference to the HoneyTokenization contract
    IHoneyTokenization public immutable honeyTokenization;

    /**
     * @dev Nested mapping to track claimed keys
     * First key: batch ID
     * Second key: hash of the secret key
     * Value: whether this key has been claimed
     *
     * This prevents double-claiming of the same QR code
     */
    mapping(uint256 => mapping(bytes32 => bool)) private claimedKeys;

    /**
     * @dev Mapping to track number of comments per user per batch
     * First key: batch ID
     * Second key: user address
     * Value: number of comments made by the user for that batch
     */
    mapping(uint => mapping(address => uint)) public commentCount;

    // ============ EVENTS ============

    /**
     * @dev Emitted when a new admin is added
     * @param newAdmin Address of the newly added admin
     */
    event NewAdmin(address indexed newAdmin);

    /**
     * @dev Emitted when a producer's authorization status changes
     * @param producer Address of the producer
     * @param isAuthorized New authorization status
     */
    event AuthorizationProducer(address indexed producer, bool isAuthorized);

    /**
     * @dev Emitted when an admin is removed
     * @param admin Address of the removed admin
     */
    event AdminRemoved(address indexed admin);

    /**
     * @dev Emitted when a producer registers or updates their information
     * @param producer Address of the producer
     */
    event ProducerInfoUpdated(address indexed producer);

    /**
     * @dev Emitted when a new honey batch is created
     * @param producer Address of the producer who created the batch
     * @param honeyBatchId Unique identifier for the batch
     */
    event NewHoneyBatch(address indexed producer, uint indexed honeyBatchId);

    /**
     * @dev Emitted when a consumer successfully claims a honey token
     * @param consumer Address of the consumer
     * @param honeyBatchId ID of the claimed batch
     */
    event HoneyTokenClaimed(
        address indexed consumer,
        uint indexed honeyBatchId
    );

    /**
     * @dev Emitted when a consumer adds a comment to a batch
     * @param consumer Address of the consumer
     * @param honeyBatchId ID of the batch being reviewed
     * @param rating Numerical rating given
     */
    event NewComment(
        address indexed consumer,
        uint indexed honeyBatchId,
        uint8 rating
    );

    /**
     * @dev Emitted when a producer updates batch metadata
     * @param producer Address of the producer
     * @param batchId ID of the updated batch
     * @param newMetadata New IPFS CID
     */
    event BatchMetadataUpdated(
        address indexed producer,
        uint indexed batchId,
        string newMetadata
    );

    // ============ ERRORS ============

    /// @dev Thrown when a non-admin tries to perform an admin-only action
    error OnlyAdminAuthorized();

    /// @dev Thrown when trying to set an authorization status that's already set
    error AuthorizationAlreadyApplied();

    /// @dev Thrown when an unauthorized producer tries to perform a producer action
    error ProducerNotAuthorized();

    /// @dev Thrown when a non-token-holder tries to comment
    error NotAllowedToComment();

    /// @dev Thrown when the Merkle proof verification fails
    error InvalidMerkleProof();

    /// @dev Thrown when trying to claim with an already used secret key
    error KeyAlreadyClaimed();

    /// @dev Thrown when trying to claim but no tokens are left
    error NoTokenLeft();

    /// @dev Thrown when the batch size exceeds the maximum allowed
    error BatchSizeTooLarge();

    /// @dev Thrown when the rating provided is not between 0 and 5
    error RatingOutOfRange();

    /// @dev Thrown when the comment limit per user per batch is reached
    error CommentLimitReached();

    /// @dev Thrown when a string parameter length is invalid
    error InvalidStringLength();

    /// @dev Thrown when an IPFS CID format is invalid
    error InvalidIPFSCID();

    /// @dev Thrown when trying to update metadata after tokens have been claimed
    error MetadataLocked();

    /// @dev Thrown when trying to update metadata for a batch that doesn't exist
    error BatchDoesNotExist();

    /// @dev Thrown when a producer tries to update metadata for a batch they don't own
    error NotYourBatch();

    /// @dev Thrown when trying to create a batch with an empty merkle root
    error EmptyMerkleRoot();

    /// @dev Thrown when trying to create a batch with zero tokens
    error BatchMustHaveTokens();

    /// @dev Thrown when a producer hasn't approved the contract to transfer their tokens
    error ProducerMustApproveContract();

    /// @dev Thrown when trying to add an admin that already has admin privileges
    error AlreadyAdmin();

    /// @dev Thrown when trying to remove an admin that doesn't have admin privileges
    error NotAnAdmin();

    /// @dev Thrown when the query limit for comments is too high
    error QueryLimitTooHigh();

    // ============ MODIFIERS ============

    /**
     * @dev Modifier to restrict function access to admins only
     */
    modifier onlyAdmin() {
        require(admins[msg.sender], OnlyAdminAuthorized());
        _;
    }

    /**
     * @dev Modifier to restrict function access to authorized producers only
     */
    modifier onlyAuthorizedProducer() {
        require(producers[msg.sender].authorized, ProducerNotAuthorized());
        _;
    }

    // ============ CONSTRUCTOR ============

    /**
     * @dev Initializes the contract with the HoneyTokenization address
     * @param _honeyTokenizationAddress Address of the deployed HoneyTokenization contract
     *
     * The deployer is automatically set as the owner and first admin
     */
    constructor(address _honeyTokenizationAddress) Ownable(msg.sender) {
        honeyTokenization = IHoneyTokenization(_honeyTokenizationAddress);
        admins[msg.sender] = true;
        emit NewAdmin(msg.sender);
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @dev Adds a new admin to the system
     * @param _newAdmin Address to be granted admin privileges
     *
     * Requirements:
     * - Caller must be the contract owner
     * - Address must not already be an admin
     *
     * Emits a {NewAdmin} event
     */
    function addAdmin(address _newAdmin) external onlyOwner {
        require(!admins[_newAdmin], AlreadyAdmin());
        
        admins[_newAdmin] = true;
        emit NewAdmin(_newAdmin);
    }

    /**
     * @dev Removes an admin from the system
     * @param _admin Address to be removed from admin privileges
     *
     * Requirements:
     * - Caller must be the contract owner
     * - Address must currently be an admin
     *
     * Emits an {AdminRemoved} event
     */
    function removeAdmin(address _admin) external onlyOwner {
        require(admins[_admin], NotAnAdmin());
        
        admins[_admin] = false;
        emit AdminRemoved(_admin);
    }

    /**
     * @dev Authorizes or revokes authorization for a producer
     * @param _producer Address of the producer
     * @param _isAuthorized True to authorize, false to revoke
     *
     * Requirements:
     * - Caller must be an admin
     * - The authorization status must be different from current status
     *
     * Emits an {AuthorizationProducer} event
     */
    function authorizeProducer(
        address _producer,
        bool _isAuthorized
    ) external onlyAdmin {
        require(
            producers[_producer].authorized != _isAuthorized,
            AuthorizationAlreadyApplied()
        );

        producers[_producer].authorized = _isAuthorized;
        emit AuthorizationProducer(_producer, _isAuthorized);
    }

    // ============ PRODUCER FUNCTIONS ============

    /**
     * @dev Allows an authorized producer to register or update their information
     * @param _name Business name
     * @param _location Physical location
     * @param _companyRegisterNumber Official registration number
     * @param _metadata IPFS CID pointing to additional information JSON (certifications, etc.)
     *
     * Requirements:
     * - Caller must be an authorized producer
     * - All string parameters must have valid lengths
     *
     * Emits a {ProducerInfoUpdated} event
     */
    function setProducerInfo(
        string memory _name,
        string memory _location,
        string memory _companyRegisterNumber,
        string memory _metadata
    ) external onlyAuthorizedProducer {
        require(
            bytes(_name).length > 0 && bytes(_name).length <= 256,
            InvalidStringLength()
        );

        require(
            bytes(_location).length > 0 && bytes(_location).length <= 256,
            InvalidStringLength()
        );

        require(
            bytes(_companyRegisterNumber).length > 0 &&
                bytes(_companyRegisterNumber).length <= 64,
            InvalidStringLength()
        );

        if (bytes(_metadata).length > 0) {
            require(
                bytes(_metadata).length >= 40 && bytes(_metadata).length <= 100,
                InvalidIPFSCID()
            );
        }

        Producer storage producer = producers[msg.sender];
        producer.name = _name;
        producer.location = _location;
        producer.companyRegisterNumber = _companyRegisterNumber;
        producer.metadata = _metadata;

        emit ProducerInfoUpdated(msg.sender);
    }

    /**
     * @dev Creates a new honey batch with Merkle Tree root for secure distribution
     * @param _honeyType Type of honey (e.g., "Acacia", "Lavender")
     * @param _metadata IPFS CID pointing to batch metadata JSON (origin, harvest date, etc.)
     * @param _amount Number of tokens to mint for this batch
     * @param _merkleRoot Root hash of the Merkle Tree containing all secret keys
     *
     * The Merkle Tree allows gas-efficient verification of secret keys during claims.
     * Each token in the batch corresponds to one secret key in the tree.
     *
     * Requirements:
     * - Caller must be an authorized producer
     * - Producer must have called setApprovalForAll on HoneyTokenization
     * - Amount must be greater than 0
     * - Amount must not exceed MAX_BATCH_SIZE
     * - Merkle root must not be empty
     * - Metadata must be a valid IPFS CID
     *
     * Emits a {NewHoneyBatch} event
     */
    function addHoneyBatch(
        string memory _honeyType,
        string memory _metadata,
        uint256 _amount,
        bytes32 _merkleRoot
    ) external onlyAuthorizedProducer {
        require(
            honeyTokenization.isApprovedForAll(msg.sender, address(this)),
            ProducerMustApproveContract()
        );

        require(
            bytes(_honeyType).length > 0 && bytes(_honeyType).length <= 64,
            InvalidStringLength()
        );

        require(
            bytes(_metadata).length >= 40 && bytes(_metadata).length <= 100,
            InvalidIPFSCID()
        );

        require(_amount > 0, BatchMustHaveTokens());
        require(_amount <= MAX_BATCH_SIZE, BatchSizeTooLarge());

        require(_merkleRoot != bytes32(0), EmptyMerkleRoot());

        uint tokenId = honeyTokenization.mintHoneyBatch(
            msg.sender,
            _amount,
            _metadata
        );

        HoneyBatch storage honeyBatch = honeyBatches[tokenId];
        honeyBatch.honeyType = _honeyType;
        honeyBatch.metadata = _metadata;
        honeyBatch.merkleRoot = _merkleRoot;

        emit NewHoneyBatch(msg.sender, tokenId);
    }

    /**
     * @dev Allows a producer to update batch metadata ONLY before any token has been claimed
     * @param _batchId ID of the batch to update
     * @param _newMetadata New IPFS CID pointing to updated batch metadata JSON
     *
     * This ensures that once a consumer has purchased and claimed a token,
     * the batch information becomes permanently immutable, maintaining traceability integrity.
     *
     * Requirements:
     * - Caller must be an authorized producer
     * - Producer must be the creator of this batch
     * - NO token must have been claimed yet (hasBeenClaimed = false)
     * - New metadata must be a valid IPFS CID
     *
     * Emits a {BatchMetadataUpdated} event
     */
    function updateBatchMetadata(
        uint256 _batchId,
        string memory _newMetadata
    ) external onlyAuthorizedProducer {
        HoneyBatch storage batch = honeyBatches[_batchId];

        require(batch.merkleRoot != bytes32(0), BatchDoesNotExist());

        require(!batch.hasBeenClaimed, MetadataLocked());

        address producer = honeyTokenization.tokenProducer(_batchId);
        require(producer == msg.sender, NotYourBatch());

        require(
            bytes(_newMetadata).length >= 40 && bytes(_newMetadata).length <= 100,
            InvalidIPFSCID()
        );

        batch.metadata = _newMetadata;

        emit BatchMetadataUpdated(msg.sender, _batchId, _newMetadata);
    }

    // ============ CONSUMER FUNCTIONS ============

    /**
     * @dev Allows a consumer to claim a honey token using a secret key and Merkle proof
     * @param _honeyBatchId ID of the batch to claim from
     * @param _secretKey Secret key from the QR code
     * @param _merkleProof Array of hashes proving the key belongs to the Merkle Tree
     *
     * The function performs security checks in this order:
     * 1. Verifies the batch exists
     * 2. Verifies tokens are still available (balanceOf > 0)
     * 3. Verifies the secret key hasn't been used before
     * 4. Verifies the Merkle proof is valid
     * 5. Transfers the token (reverts everything if this fails)
     * 6. Locks metadata (only after successful transfer)
     * 7. Emits event (only after all state changes succeed)
     *
     * After a successful claim, the batch metadata becomes permanently locked.
     *
     * Requirements:
     * - Batch must exist
     * - Batch must have tokens remaining
     * - Secret key must not have been claimed before
     * - Merkle proof must be valid
     * - Producer must have approved HoneyTraceStorage via setApprovalForAll
     *
     * Emits a {HoneyTokenClaimed} event
     */
    function claimHoneyToken(
        uint256 _honeyBatchId,
        string memory _secretKey,
        bytes32[] memory _merkleProof
    ) external nonReentrant {
        HoneyBatch storage batch = honeyBatches[_honeyBatchId];

        require(batch.merkleRoot != bytes32(0), BatchDoesNotExist());

        address producer = honeyTokenization.tokenProducer(_honeyBatchId);

        uint256 remainingTokens = honeyTokenization.balanceOf(
            producer,
            _honeyBatchId
        );
        require(remainingTokens > 0, NoTokenLeft());

        bytes32 leaf = keccak256(abi.encodePacked(_secretKey));
        require(!claimedKeys[_honeyBatchId][leaf], KeyAlreadyClaimed());

        require(
            MerkleProof.verify(_merkleProof, batch.merkleRoot, leaf),
            InvalidMerkleProof()
        );

        claimedKeys[_honeyBatchId][leaf] = true;

        honeyTokenization.safeTransferFrom(
            producer,
            msg.sender,
            _honeyBatchId,
            1,
            ""
        );

        batch.hasBeenClaimed = true;

        emit HoneyTokenClaimed(msg.sender, _honeyBatchId);
    }

    /**
     * @dev Allows a token holder to add a comment/review for a batch
     * @param _honeyBatchId ID of the batch to comment on
     * @param _rating Numerical rating (0-5)
     * @param _metadata IPFS CID pointing to comment text in JSON format
     *
     * Requirements:
     * - Caller must own at least one token of the specified batch
     * - Rating must be between 0 and 5
     * - User must not have reached the comment limit for this batch
     * - Metadata must be a valid IPFS CID
     *
     * Emits a {NewComment} event
     */
    function addComment(
        uint _honeyBatchId,
        uint8 _rating,
        string memory _metadata
    ) external {
        require(
            honeyTokenization.balanceOf(msg.sender, _honeyBatchId) > 0,
            NotAllowedToComment()
        );

        require(_rating <= 5, RatingOutOfRange());

        require(
            commentCount[_honeyBatchId][msg.sender] < MAX_COMMENTS_PER_USER,
            CommentLimitReached()
        );

        require(
            bytes(_metadata).length >= 40 && bytes(_metadata).length <= 100,
            InvalidIPFSCID()
        );

        honeyBatchesComments[_honeyBatchId].push(
            Comment(msg.sender, _honeyBatchId, _rating, _metadata)
        );

        commentCount[_honeyBatchId][msg.sender]++;

        emit NewComment(msg.sender, _honeyBatchId, _rating);
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @dev Returns the information of a producer
     * @param _address Address of the producer to query
     * @return Producer struct containing all producer information
     */
    function getProducer(
        address _address
    ) external view returns (Producer memory) {
        return producers[_address];
    }

    /**
     * @dev Returns the information of a honey batch
     * @param _id ID of the batch to query
     * @return HoneyBatch struct containing all batch information
     */
    function getHoneyBatch(uint _id) external view returns (HoneyBatch memory) {
        return honeyBatches[_id];
    }

    /**
     * @dev Returns all comments for a specific batch (paginated)
     * @param _honeyBatchId ID of the batch
     * @param offset Starting index for pagination
     * @param limit Maximum number of comments to return (capped at MAX_COMMENTS_QUERY)
     * @return Array of comments
     *
     * @notice Returns empty array if offset is beyond total comments
     */
    function getHoneyBatchComments(
        uint _honeyBatchId,
        uint offset,
        uint limit
    ) external view returns (Comment[] memory) {
        require(limit <= MAX_COMMENTS_QUERY, QueryLimitTooHigh());

        uint total = honeyBatchesComments[_honeyBatchId].length;

        if (offset >= total) {
            return new Comment[](0);
        }

        uint end = offset + limit > total ? total : offset + limit;
        uint resultLength = end - offset;

        Comment[] memory result = new Comment[](resultLength);
        for (uint i = 0; i < resultLength; i++) {
            result[i] = honeyBatchesComments[_honeyBatchId][offset + i];
        }

        return result;
    }

    /**
     * @dev Returns the total number of comments for a batch
     * @param _honeyBatchId ID of the batch
     * @return Total number of comments
     */
    function getHoneyBatchCommentsCount(
        uint _honeyBatchId
    ) external view returns (uint) {
        return honeyBatchesComments[_honeyBatchId].length;
    }

    /**
     * @dev Checks if a secret key has already been claimed for a batch
     * @param _honeyBatchId ID of the batch
     * @param _secretKey Secret key to check
     * @return True if the key has been claimed, false otherwise
     */
    function isKeyClaimed(
        uint256 _honeyBatchId,
        string memory _secretKey
    ) external view returns (bool) {
        bytes32 leaf = keccak256(abi.encodePacked(_secretKey));
        return claimedKeys[_honeyBatchId][leaf];
    }

    /**
     * @dev Checks if an address has admin privileges
     * @param _address Address to check
     * @return True if the address is an admin, false otherwise
     */
    function isAdmin(address _address) external view returns (bool) {
        return admins[_address];
    }

    /**
     * @dev Checks if a batch has had any tokens claimed (metadata locked)
     * @param _batchId ID of the batch to check
     * @return True if at least one token has been claimed, false otherwise
     */
    function isBatchLocked(uint256 _batchId) external view returns (bool) {
        return honeyBatches[_batchId].hasBeenClaimed;
    }

    /**
     * @dev Checks if a producer has approved this contract to transfer their tokens
     * @param _producer Address of the producer to check
     * @return True if the producer has approved this contract, false otherwise
     *
     * @notice Producers must call setApprovalForAll(HoneyTraceStorageAddress, true)
     * on the HoneyTokenization contract before consumers can claim their tokens.
     * This function allows checking the approval status.
     *
     * Example usage:
     * - Frontend can warn producers if they haven't approved yet
     * - Producers can verify their approval status before creating batches
     */
    function isProducerApproved(
        address _producer
    ) external view returns (bool) {
        return honeyTokenization.isApprovedForAll(_producer, address(this));
    }
}