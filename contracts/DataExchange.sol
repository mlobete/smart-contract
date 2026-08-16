// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract DataExchange {

    error EmptyURI();
    error EmptyDigest();
    error DatasetDoesNotExist();
    error OwnerCannotRequestAccess();
    error AccessAlreadyRequested();
    error OnlyOwnerCanApprove();
    error OnlyOwnerCanReject();
    error RequestDoesNotExist();
    error RequestNotPending();
    error OnlyOwnerCanRecordDelivery();
    error BuyerAccessNotApproved();
    error DeliveryAlreadyRecorded();

    struct Dataset {
        address owner;
        string uri;
        bytes32 digest;
    }

    enum AccessStatus {
        Pending,
        Approved,
        Rejected
    }

    struct AccessRequest {
        address buyer;
        AccessStatus status;
        bool delivered;
    }

    uint256 private datasetCount;

    mapping(uint256 => Dataset) private datasets;
    mapping(uint256 => mapping(address => AccessRequest)) private requests;

    event DatasetRegistered(
        uint256 indexed datasetId,
        address indexed owner,
        string uri,
        bytes32 digest
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

    function registerDataset(string calldata uri, bytes32 digest) external {
        if (bytes(uri).length == 0) revert EmptyURI();
        if (digest == bytes32(0)) revert EmptyDigest();

        uint256 datasetId = datasetCount;

        datasets[datasetId] = Dataset({owner: msg.sender, uri: uri, digest: digest});

        datasetCount++;

        emit DatasetRegistered(datasetId, msg.sender, uri, digest);
    }

    function requestAccess(uint256 datasetId) external {
        // dataset exists
        if (datasetId >= datasetCount) revert DatasetDoesNotExist();
        // cannot request own
        if (datasets[datasetId].owner == msg.sender) revert OwnerCannotRequestAccess();
        // cannot double request
        if (requests[datasetId][msg.sender].buyer != address(0)) revert AccessAlreadyRequested();
        // store and update status
        requests[datasetId][msg.sender] = AccessRequest({buyer: msg.sender, status: AccessStatus.Pending, delivered: false});

        emit AccessRequested(datasetId, msg.sender);
    }

    function approveAccess(uint256 datasetId, address buyer) external {
        if (datasetId >= datasetCount) revert DatasetDoesNotExist();
        if (datasets[datasetId].owner != msg.sender) revert OnlyOwnerCanApprove();

        AccessRequest storage request = requests[datasetId][buyer];

        if (request.buyer == address(0)) revert RequestDoesNotExist();
        if (request.status != AccessStatus.Pending) revert RequestNotPending();

        request.status = AccessStatus.Approved;

        emit AccessApproved(datasetId, buyer, msg.sender);
    }

    function rejectAccess(uint256 datasetId, address buyer) external {
        if (datasetId >= datasetCount) revert DatasetDoesNotExist();
        if (datasets[datasetId].owner != msg.sender) revert OnlyOwnerCanReject();

        AccessRequest storage request = requests[datasetId][buyer];

        if (request.buyer == address(0)) revert RequestDoesNotExist();
        if (request.status != AccessStatus.Pending) revert RequestNotPending();

        request.status = AccessStatus.Rejected;

        emit AccessRejected(datasetId, buyer, msg.sender);
    }

    function hasAccess(uint256 datasetId, address user) external view returns (bool) {
        return requests[datasetId][user].status == AccessStatus.Approved;
    }

    function isDelivered(uint256 datasetId, address buyer) external view returns (bool) {
        return requests[datasetId][buyer].delivered;
    }

    function recordDelivery(uint256 datasetId, address buyer) external {
        if (datasetId >= datasetCount) revert DatasetDoesNotExist();
        if (datasets[datasetId].owner != msg.sender) revert OnlyOwnerCanRecordDelivery();

        AccessRequest storage request = requests[datasetId][buyer];

        if (request.status != AccessStatus.Approved) revert BuyerAccessNotApproved();
        if (request.delivered) revert DeliveryAlreadyRecorded();

        request.delivered = true;

        emit DeliveryRecorded(datasetId, buyer, msg.sender);
    }

    function verifyDigest(uint256 datasetId, bytes32 givenDigest) external view returns (bool) {
        if (datasetId >= datasetCount) revert DatasetDoesNotExist();

        return datasets[datasetId].digest == givenDigest;
    }

    function getDataset(uint256 datasetId) external view returns (Dataset memory) {
        if (datasetId >= datasetCount) revert DatasetDoesNotExist();

        return datasets[datasetId];
    }

    function getRequest(uint256 datasetId, address buyer) external view returns (AccessRequest memory) {
        if (datasetId >= datasetCount) revert DatasetDoesNotExist();

        return requests[datasetId][buyer];
    }

    function getDatasetCount() external view returns (uint256) {
        return datasetCount;
    }
}