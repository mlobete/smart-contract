// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract DataExchange {
    struct Dataset {
        address owner;
        string uri;
        string digest;
    }

    enum AccessStatus {
        Pending,
        Approved,
        Rejected
    }

    struct AccessRequest {
        address buyer;
        uint256 datasetId;
        AccessStatus status;
    }

    uint256 private datasetCount;

    mapping(uint256 => Dataset) private datasets;
    mapping(uint256 => mapping(address => AccessRequest)) private requests;

    mapping(uint256 => mapping(address => bool)) private deliveries;

    event DatasetRegistered(
        uint256 indexed datasetId,
        address indexed owner,
        string uri,
        string digest
    );

    event AccessRequested(
        uint256 indexed datasetId,
        address indexed buyer
    );

    event AccessApproved(
        uint256 indexed datasetId,
        address indexed buyer,
        address owner
    );

    event AccessRejected(
        uint256 indexed datasetId,
        address indexed buyer,
        address owner
    );

    event DeliveryRecorded(
        uint256 indexed datasetId,
        address indexed buyer,
        address owner
    );

    function registerDataset(string calldata uri, string calldata digest) external {
        require(bytes(uri).length > 0, "URI cannot be empty.");
        require(bytes(digest).length > 0, "Digest cannot be empty."); 
        uint256 datasetId = datasetCount;

        datasets[datasetId] = Dataset({owner: msg.sender, uri: uri, digest: digest});

        datasetCount++;

        emit DatasetRegistered(datasetId, msg.sender, uri, digest);
    }

    function requestAccess(uint256 datasetId) external {
        // dataset exists
        require(datasetId < datasetCount, "Dataset does not exist.");
        // cannot request own
        require(datasets[datasetId].owner != msg.sender, "Owner cannot request access.");
        // cannot double request
        require(requests[datasetId][msg.sender].buyer == address(0), "Access already requested.");
        // store and update status
        requests[datasetId][msg.sender] = AccessRequest({buyer: msg.sender, datasetId: datasetId, status: AccessStatus.Pending});

        emit AccessRequested(datasetId, msg.sender);
    }

    function approveAccess(uint256 datasetId, address buyer) external {
        require(datasetId < datasetCount, "Dataset does not exist.");
        require(datasets[datasetId].owner == msg.sender, "Only owner can approve.");

        AccessRequest storage request = requests[datasetId][buyer];

        require(request.buyer != address(0), "Request does not exist.");
        require(request.status == AccessStatus.Pending, "Request is not pending.");

        request.status = AccessStatus.Approved;

        emit AccessApproved(datasetId, buyer, msg.sender);
    }

    function rejectAccess(uint256 datasetId, address buyer) external {
        require(datasetId < datasetCount, "Dataset does not exist."); 
        require(datasets[datasetId].owner == msg.sender, "Only owner can reject.");

        AccessRequest storage request = requests[datasetId][buyer];
        
        require(request.buyer != address(0), "Request does not exist.");
        require(request.status == AccessStatus.Pending, "Request is not pending.");

        request.status = AccessStatus.Rejected;

        emit AccessRejected(datasetId, buyer, msg.sender);
    }

    function hasAccess(uint256 datasetId, address user) external view returns (bool) {
        return requests[datasetId][user].status == AccessStatus.Approved;
    }

    function isDelivered(uint256 datasetId, address buyer) external view returns (bool) {
        return deliveries[datasetId][buyer];
    }

    function recordDelivery(uint256 datasetId, address buyer) external {
        require(datasetId < datasetCount, "Dataset does not exist.");
        require(datasets[datasetId].owner == msg.sender, "Only owner can record delivery.");

        AccessRequest storage request = requests[datasetId][buyer];
        require(request.status == AccessStatus.Approved, "Buyer access is not approved.");

        require(!deliveries[datasetId][buyer], "Delivery already recorded.");
        deliveries[datasetId][buyer] = true;

        emit DeliveryRecorded(datasetId, buyer, msg.sender);
    }

    function verifyDigest(uint256 datasetId, string calldata givenDigest) external view returns (bool) {
        require(datasetId < datasetCount, "Dataset does not exist.");
        return keccak256(bytes(datasets[datasetId].digest)) == keccak256(bytes(givenDigest));
    }

    function getDataset(uint256 datasetId) external view returns (Dataset memory) {
        require(datasetId < datasetCount, "Datset does not exist.");
        return datasets[datasetId];
    }

    function getRequest(uint256 datasetId, address buyer) external view returns (AccessRequest memory) {
        require(datasetId < datasetCount, "Datset does not exist.");
        return requests[datasetId][buyer];
    }

    function getDatasetCount() external view returns (uint256) {
        return datasetCount;
    }
}