// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Obligo — obligation-continuation venue (slice 1)
/// @notice Fully collateralised, no leverage. A job is a set of countable units. If the
/// executor stalls, the remaining units become a listed obligation that another party can
/// take over by posting a bond. Settlement is arithmetic over counted unit receipts.
/// No owner, no admin, no oracle, no jury.
contract Obligo {
    enum State {
        Open,     // executor working
        Stalled,  // executor stopped; obligation not yet listed
        Listed,   // remaining obligation open for takeover
        Taken,    // a taker has posted a bond and owns the remaining units
        Settled,  // completed and paid
        Closed    // failed; bond forfeited to the buyer, remainder refunded
    }

    struct Job {
        address buyer;
        address executor;
        uint256 totalUnits;
        uint256 pricePerUnit;   // escrow = pricePerUnit * totalUnits, exact by construction
        uint256 escrow;
        uint256 executorUnits;  // units counted for the executor
        uint256 takerUnits;     // units counted for the taker
        uint256 workDeadline;   // after this, anyone may declare the stall
        uint256 takerDeadline;  // set when the obligation is taken
        address taker;
        uint256 bond;
        State state;
    }

    uint256 public constant MIN_BOND_BPS = 5000; // taker bond >= 50% of remaining escrow
    uint256 public constant BPS = 10000;

    uint256 public jobCount;
    mapping(uint256 => Job) public jobs;
    mapping(uint256 => mapping(uint256 => bytes32)) public unitReceipt; // jobId => unit => receipt
    mapping(address => uint256) public credits; // pull payments for refunded bond/escrow

    event JobCreated(uint256 indexed jobId, address indexed buyer, address indexed executor,
                     uint256 totalUnits, uint256 pricePerUnit, uint256 workDeadline);
    event UnitCounted(uint256 indexed jobId, uint256 unitIndex, bytes32 receipt, address by);
    event Stalled(uint256 indexed jobId, address by);
    event Listed(uint256 indexed jobId, uint256 takerDeadline);
    event Taken(uint256 indexed jobId, address indexed taker, uint256 bond);
    event Settled(uint256 indexed jobId, uint256 executorPaid, uint256 takerPaid);
    event Closed(uint256 indexed jobId, uint256 refundedToBuyer, uint256 forfeitedBond);

    error JobNotOpen();
    error NotExecutor();
    error NotTaker();
    error UnitAlreadyCounted();
    error UnitOutOfRange();
    error EmptyReceipt();
    error DeadlineNotReached();
    error BondTooSmall(uint256 required);
    error AlreadyStalled();
    error NothingToTake();
    error BadEscrow(uint256 expected);
    error AlreadyTerminal();
    error NothingToClaim();

    /// @param totalUnits units of work; escrow must equal totalUnits * pricePerUnit exactly
    /// @param workDeadline unix seconds; after it, anyone can declare the stall
    function createJob(address executor, uint256 totalUnits, uint256 pricePerUnit,
                       uint256 workDeadline) external payable returns (uint256 jobId) {
        if (executor == address(0)) revert NotExecutor();
        if (totalUnits == 0) revert UnitOutOfRange();
        uint256 expected = totalUnits * pricePerUnit;
        if (msg.value != expected) revert BadEscrow(expected);

        jobId = ++jobCount;
        Job storage j = jobs[jobId];
        j.buyer = msg.sender;
        j.executor = executor;
        j.totalUnits = totalUnits;
        j.pricePerUnit = pricePerUnit;
        j.escrow = msg.value;
        j.workDeadline = workDeadline;
        j.state = State.Open;
        emit JobCreated(jobId, msg.sender, executor, totalUnits, pricePerUnit, workDeadline);
    }

    /// @notice count one finished unit. Only the party currently responsible may count.
    function countUnit(uint256 jobId, uint256 unitIndex, bytes32 receipt) external {
        Job storage j = jobs[jobId];
        if (j.state != State.Open && j.state != State.Taken) revert JobNotOpen();
        if (unitIndex >= j.totalUnits) revert UnitOutOfRange();
        if (receipt == bytes32(0)) revert EmptyReceipt();
        if (unitReceipt[jobId][unitIndex] != bytes32(0)) revert UnitAlreadyCounted();

        bool byExecutor = (msg.sender == j.executor && j.state == State.Open);
        bool byTaker = (j.state == State.Taken && msg.sender == j.taker);
        if (!byExecutor && !byTaker) revert NotExecutor();

        unitReceipt[jobId][unitIndex] = receipt;
        if (byExecutor) j.executorUnits += 1;
        else j.takerUnits += 1;
        emit UnitCounted(jobId, unitIndex, receipt, msg.sender);

        if (j.executorUnits + j.takerUnits == j.totalUnits) _settle(jobId);
    }

    /// @notice the executor may quit at any time; after workDeadline anyone may declare it.
    function declareStalled(uint256 jobId) external {
        Job storage j = jobs[jobId];
        if (j.state != State.Open) revert AlreadyStalled();
        bool byExecutor = msg.sender == j.executor;
        if (!byExecutor && block.timestamp < j.workDeadline) revert DeadlineNotReached();
        j.state = State.Stalled;
        emit Stalled(jobId, msg.sender);
    }

    /// @notice list the remaining obligation. Permissionless — the venue is not a gatekeeper.
    function listObligation(uint256 jobId, uint256 takerDeadline) external {
        Job storage j = jobs[jobId];
        if (j.state != State.Stalled) revert AlreadyStalled();
        if (j.executorUnits + j.takerUnits >= j.totalUnits) revert NothingToTake();
        j.state = State.Listed;
        j.takerDeadline = takerDeadline;
        emit Listed(jobId, takerDeadline);
    }

    /// @notice take over the remaining obligation by posting a bond.
    function takeObligation(uint256 jobId) external payable {
        Job storage j = jobs[jobId];
        if (j.state != State.Listed) revert NothingToTake();
        uint256 remaining = (j.totalUnits - j.executorUnits - j.takerUnits) * j.pricePerUnit;
        uint256 required = (remaining * MIN_BOND_BPS) / BPS;
        if (msg.value < required) revert BondTooSmall(required);
        j.taker = msg.sender;
        j.bond = msg.value;
        j.state = State.Taken;
        emit Taken(jobId, msg.sender, msg.value);
    }

    /// @notice after the taker deadline with units outstanding: bond forfeits to the buyer.
    function closeFailed(uint256 jobId) external {
        Job storage j = jobs[jobId];
        if (j.state != State.Taken) revert NothingToTake();
        if (block.timestamp < j.takerDeadline) revert DeadlineNotReached();
        if (j.executorUnits + j.takerUnits >= j.totalUnits) revert AlreadyTerminal();

        uint256 remaining = (j.totalUnits - j.executorUnits - j.takerUnits) * j.pricePerUnit;
        uint256 executorPaid = j.executorUnits * j.pricePerUnit;
        uint256 refundToBuyer = remaining + j.bond;
        uint256 takerPaid = j.takerUnits * j.pricePerUnit;

        j.state = State.Closed;
        credits[j.executor] += executorPaid;
        credits[j.taker] += takerPaid;
        credits[j.buyer] += refundToBuyer;
        emit Closed(jobId, refundToBuyer, j.bond);

        // conservation: executorPaid + takerPaid + refundToBuyer == escrow + bond
    }

    function claim() external {
        uint256 amount = credits[msg.sender];
        if (amount == 0) revert NothingToClaim();
        credits[msg.sender] = 0;
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "transfer failed");
    }

    function _settle(uint256 jobId) internal {
        Job storage j = jobs[jobId];
        uint256 executorPaid = j.executorUnits * j.pricePerUnit;
        uint256 takerPaid = j.takerUnits * j.pricePerUnit + j.bond;
        j.state = State.Settled;
        credits[j.executor] += executorPaid;
        if (j.taker != address(0)) credits[j.taker] += takerPaid;
        emit Settled(jobId, executorPaid, takerPaid);
        // conservation: executorPaid + takerPaid == escrow + bond
    }

    function remainingUnits(uint256 jobId) external view returns (uint256) {
        Job storage j = jobs[jobId];
        return j.totalUnits - j.executorUnits - j.takerUnits;
    }

    function stateOf(uint256 jobId) external view returns (State) {
        return jobs[jobId].state;
    }

    /// @notice the bond a taker must post for the current remainder
    function requiredBond(uint256 jobId) external view returns (uint256) {
        Job storage j = jobs[jobId];
        uint256 remaining = (j.totalUnits - j.executorUnits - j.takerUnits) * j.pricePerUnit;
        return (remaining * MIN_BOND_BPS) / BPS;
    }
}
