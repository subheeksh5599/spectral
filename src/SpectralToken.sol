// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice the half of ERC-20 this market uses
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address who) external view returns (uint256);
}

/// @title SpectralToken — the same obligation-continuation market, denominated in an ERC-20
/// @notice Identical state machine to Spectral, with one substitution: the escrow and the
/// bond are an ERC-20 instead of native value. That is the whole point of this deployment —
/// a market whose money is a token can be a market in a tokenized *equity*, and on a testnet
/// the equity is a replica you can actually obtain.
///
/// What is unchanged: units are counted and a unit index can never be counted twice, the
/// bond is at least half the remaining escrow, a failed taker forfeits its bond to the buyer,
/// settlement is arithmetic over counted units, and there is no owner, admin, oracle, jury,
/// pause or upgrade path. No price feed is read anywhere in this contract.
///
/// What is different, and stated in the README: the asset is set once at deployment and
/// cannot be changed, so this contract cannot be repointed at a different token.
contract SpectralToken {
    enum State {
        Open,
        Stalled,
        Listed,
        Taken,
        Settled,
        Closed
    }

    struct Job {
        address buyer;
        address executor;
        uint256 totalUnits;
        uint256 pricePerUnit;   // escrow = pricePerUnit * totalUnits, exact by construction
        uint256 escrow;
        uint256 executorUnits;
        uint256 takerUnits;
        uint256 workDeadline;
        uint256 takerDeadline;
        address taker;
        uint256 bond;
        State state;
    }

    uint256 public constant MIN_BOND_BPS = 5000; // taker bond >= 50% of remaining escrow
    uint256 public constant BPS = 10000;

    IERC20 public immutable asset;

    uint256 public jobCount;
    mapping(uint256 => Job) public jobs;
    mapping(uint256 => mapping(uint256 => bytes32)) public unitReceipt;
    mapping(address => uint256) public credits;

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
    error TransferFailed();
    error ZeroAddress();

    constructor(IERC20 asset_) {
        if (address(asset_) == address(0)) revert ZeroAddress();
        asset = asset_;
    }

    /// @param totalUnits units of work; the market pulls totalUnits * pricePerUnit in `asset`
    /// @param workDeadline unix seconds; after it, anyone can declare the stall
    function createJob(address executor, uint256 totalUnits, uint256 pricePerUnit,
                       uint256 workDeadline) external returns (uint256 jobId) {
        if (executor == address(0)) revert NotExecutor();
        if (totalUnits == 0) revert UnitOutOfRange();
        uint256 expected = totalUnits * pricePerUnit;

        jobId = ++jobCount;
        Job storage j = jobs[jobId];
        j.buyer = msg.sender;
        j.executor = executor;
        j.totalUnits = totalUnits;
        j.pricePerUnit = pricePerUnit;
        j.escrow = expected;
        j.workDeadline = workDeadline;
        j.state = State.Open;

        /* pull the escrow before the event, so a job can never be announced unfunded */
        _pull(msg.sender, expected);
        emit JobCreated(jobId, msg.sender, executor, totalUnits, pricePerUnit, workDeadline);
    }

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

    function declareStalled(uint256 jobId) external {
        Job storage j = jobs[jobId];
        if (j.state != State.Open) revert AlreadyStalled();
        bool byExecutor = msg.sender == j.executor;
        if (!byExecutor && block.timestamp < j.workDeadline) revert DeadlineNotReached();
        j.state = State.Stalled;
        emit Stalled(jobId, msg.sender);
    }

    function listObligation(uint256 jobId, uint256 takerDeadline) external {
        Job storage j = jobs[jobId];
        if (j.state != State.Stalled) revert AlreadyStalled();
        if (j.executorUnits + j.takerUnits >= j.totalUnits) revert NothingToTake();
        j.state = State.Listed;
        j.takerDeadline = takerDeadline;
        emit Listed(jobId, takerDeadline);
    }

    /// @notice take over the remainder by posting a bond in `asset`. The bond is pulled,
    /// so the allowance must cover it — there is no msg.value path in this contract.
    /// Posting more than the minimum is allowed, exactly as in Spectral.
    function takeObligation(uint256 jobId, uint256 bondAmount) external returns (uint256) {
        Job storage j = jobs[jobId];
        if (j.state != State.Listed) revert NothingToTake();
        uint256 required = requiredBond(jobId);
        if (bondAmount < required) revert BondTooSmall(required);

        j.taker = msg.sender;
        j.bond = bondAmount;
        j.state = State.Taken;

        _pull(msg.sender, bondAmount);
        emit Taken(jobId, msg.sender, bondAmount);
        return bondAmount;
    }

    function closeFailed(uint256 jobId) external {
        Job storage j = jobs[jobId];
        if (j.state != State.Taken) revert NothingToTake();
        if (block.timestamp < j.takerDeadline) revert DeadlineNotReached();
        if (j.executorUnits + j.takerUnits >= j.totalUnits) revert AlreadyTerminal();

        uint256 remaining = (j.totalUnits - j.executorUnits - j.takerUnits) * j.pricePerUnit;
        uint256 executorPaid = j.executorUnits * j.pricePerUnit;
        uint256 takerPaid = j.takerUnits * j.pricePerUnit;
        uint256 refundToBuyer = remaining + j.bond;

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
        credits[msg.sender] = 0;             // zeroed before the transfer, as in Spectral
        bool ok = asset.transfer(msg.sender, amount);
        if (!ok) revert TransferFailed();
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

    function _pull(address from, uint256 amount) internal {
        bool ok = asset.transferFrom(from, address(this), amount);
        if (!ok) revert TransferFailed();
    }

    function remainingUnits(uint256 jobId) external view returns (uint256) {
        Job storage j = jobs[jobId];
        return j.totalUnits - j.executorUnits - j.takerUnits;
    }

    function stateOf(uint256 jobId) external view returns (State) {
        return jobs[jobId].state;
    }

    function requiredBond(uint256 jobId) public view returns (uint256) {
        Job storage j = jobs[jobId];
        uint256 remaining = (j.totalUnits - j.executorUnits - j.takerUnits) * j.pricePerUnit;
        return (remaining * MIN_BOND_BPS) / BPS;
    }
}
