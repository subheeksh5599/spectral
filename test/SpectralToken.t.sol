// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {TestnetEquity} from "../src/TestnetEquity.sol";
import {SpectralToken, IERC20} from "../src/SpectralToken.sol";

/* Lifecycle, adversarial and conservation tests for the ERC-20 deployment of the same
   market. The native-value deployment has its own suite; nothing here touches it.

   The invariant the whole thing rests on, asserted in every terminal path and fuzzed:
   the market's token balance is exactly the sum of the credits it owes plus the escrow
   and bonds still locked in live jobs. */
contract SpectralTokenTest is Test {
    TestnetEquity equity;
    SpectralToken market;

    address buyer = address(0xB0B);
    address executor = address(0xE0E);
    address taker = address(0x7A4);
    address stranger = address(0x57A);

    uint256 constant UNIT = 1e18;

    function setUp() public {
        equity = new TestnetEquity("Testnet Equity Replica: TSLA", "tTSLA");
        market = new SpectralToken(IERC20(address(equity)));

        equity.mint(buyer, 1_000 * UNIT);
        equity.mint(executor, 1_000 * UNIT);
        equity.mint(taker, 1_000 * UNIT);

        vm.prank(buyer);
        equity.approve(address(market), type(uint256).max);
        vm.prank(taker);
        equity.approve(address(market), type(uint256).max);
    }

    // ---------------------------------------------------------------- helpers

    function _create(uint256 units, uint256 price, uint256 deadline) internal returns (uint256) {
        vm.prank(buyer);
        return market.createJob(executor, units, price, deadline);
    }

    function _count(address who, uint256 jobId, uint256 index) internal {
        vm.prank(who);
        market.countUnit(jobId, index, keccak256(abi.encode(jobId, index)));
    }

    function _countMany(address who, uint256 jobId, uint256 from, uint256 to) internal {
        for (uint256 i = from; i < to; i++) _count(who, jobId, i);
    }

    /// @notice credits + escrow and bonds still locked == what the market actually holds.
    /// A settled or closed job's money has already become credits, so only live jobs
    /// contribute "in flight" — the same invariant verify.py checks on the native market.
    function _assertConserved() internal view {
        uint256 owed = market.credits(buyer) + market.credits(executor)
                     + market.credits(taker) + market.credits(stranger);
        uint256 count = market.jobCount();
        for (uint256 id = 1; id <= count; id++) {
            (,,,, uint256 escrow, , , , , , uint256 bond, SpectralToken.State st) = market.jobs(id);
            bool live = st == SpectralToken.State.Open || st == SpectralToken.State.Stalled
                     || st == SpectralToken.State.Listed || st == SpectralToken.State.Taken;
            if (live) owed += escrow + bond;
        }
        assertEq(equity.balanceOf(address(market)), owed, "market balance != credits + in-flight");
    }

    // ---------------------------------------------------------------- lifecycle

    function testCreatePullsExactEscrow() public {
        uint256 before = equity.balanceOf(buyer);
        uint256 id = _create(4, UNIT, block.timestamp + 1 days);
        assertEq(id, 1);
        assertEq(equity.balanceOf(buyer), before - 4 * UNIT);
        assertEq(equity.balanceOf(address(market)), 4 * UNIT);
        _assertConserved();
    }

    function testAssetIsFixedAtDeployment() public view {
        assertEq(address(market.asset()), address(equity));
    }

    function testFullCompletionSettlesByArithmetic() public {
        uint256 id = _create(4, UNIT, block.timestamp + 1 days);
        _countMany(executor, id, 0, 4);
        assertEq(uint256(market.stateOf(id)), uint256(SpectralToken.State.Settled));
        assertEq(market.credits(executor), 4 * UNIT);
        assertEq(market.remainingUnits(id), 0);
        _assertConserved();
    }

    function testExecutorIsPaidOnlyForCountedUnitsAfterTakeover() public {
        uint256 id = _create(10, UNIT, block.timestamp + 1 days);
        _countMany(executor, id, 0, 4);

        vm.prank(executor);
        market.declareStalled(id);
        vm.prank(stranger);
        market.listObligation(id, block.timestamp + 2 days);

        assertEq(market.requiredBond(id), 3 * UNIT, "bond is half of the remaining six units");

        uint256 req = market.requiredBond(id);
        vm.prank(taker);
        market.takeObligation(id, req);
        _countMany(taker, id, 4, 10);

        assertEq(uint256(market.stateOf(id)), uint256(SpectralToken.State.Settled));
        assertEq(market.credits(executor), 4 * UNIT, "executor paid for four units");
        assertEq(market.credits(taker), 6 * UNIT + 3 * UNIT, "taker paid six units and its bond back");
        _assertConserved();
    }

    function testTakerThatFinishesNothingForfeitsTheBond() public {
        uint256 id = _create(10, UNIT, block.timestamp + 1 days);
        _countMany(executor, id, 0, 4);
        vm.prank(executor);
        market.declareStalled(id);
        vm.prank(stranger);
        market.listObligation(id, block.timestamp + 2 days);
        uint256 req = market.requiredBond(id);
        vm.prank(taker);
        market.takeObligation(id, req);

        vm.warp(block.timestamp + 3 days);
        market.closeFailed(id);

        assertEq(uint256(market.stateOf(id)), uint256(SpectralToken.State.Closed));
        assertEq(market.credits(executor), 4 * UNIT);
        assertEq(market.credits(taker), 0, "counted nothing, owed nothing");
        assertEq(market.credits(buyer), 6 * UNIT + 3 * UNIT, "remainder refunded and the bond forfeited");
        _assertConserved();
    }

    function testTakerPayingMoreThanTheMinimumKeepsTheWholeBondOnSuccess() public {
        uint256 id = _create(4, UNIT, block.timestamp + 1 days);
        _countMany(executor, id, 0, 1);
        vm.prank(executor);
        market.declareStalled(id);
        vm.prank(stranger);
        market.listObligation(id, block.timestamp + 2 days);

        vm.prank(taker);
        market.takeObligation(id, 5 * UNIT); // double the required 1.5 units
        _countMany(taker, id, 1, 4);

        assertEq(market.credits(taker), 3 * UNIT + 5 * UNIT, "bond returned in full");
        _assertConserved();
    }

    function testOneWalletCanWalkTheWholeLifecycle() public {
        vm.startPrank(executor);
        equity.approve(address(market), type(uint256).max);
        uint256 id = market.createJob(executor, 3, UNIT, block.timestamp + 1 days);
        market.countUnit(id, 0, bytes32(uint256(1)));
        market.countUnit(id, 1, bytes32(uint256(2)));
        market.declareStalled(id);
        market.listObligation(id, block.timestamp + 2 days);
        market.takeObligation(id, market.requiredBond(id));
        market.countUnit(id, 2, bytes32(uint256(3)));
        vm.stopPrank();

        assertEq(uint256(market.stateOf(id)), uint256(SpectralToken.State.Settled));
        assertEq(market.credits(executor), 3 * UNIT + 0.5e18, "2 units counted, 1 taken over at a 0.5 bond, returned");
        _assertConserved();
    }

    // ---------------------------------------------------------------- refusals

    function testCreateWithoutApprovalIsRefused() public {
        vm.prank(stranger);
        vm.expectRevert(TestnetEquity.InsufficientAllowance.selector);
        market.createJob(executor, 4, UNIT, block.timestamp + 1 days);
    }

    function testCreateWithoutBalanceIsRefused() public {
        vm.startPrank(stranger);
        equity.approve(address(market), type(uint256).max);
        vm.expectRevert(TestnetEquity.InsufficientBalance.selector);
        market.createJob(executor, 4, UNIT, block.timestamp + 1 days);
        vm.stopPrank();
    }

    function testZeroUnitsRefused() public {
        vm.prank(buyer);
        vm.expectRevert(SpectralToken.UnitOutOfRange.selector);
        market.createJob(executor, 0, UNIT, block.timestamp + 1 days);
    }

    function testDuplicateIndexRefused() public {
        uint256 id = _create(4, UNIT, block.timestamp + 1 days);
        _count(executor, id, 0);
        vm.prank(executor);
        vm.expectRevert(SpectralToken.UnitAlreadyCounted.selector);
        market.countUnit(id, 0, keccak256("again"));
    }

    function testIndexOutOfRangeRefused() public {
        uint256 id = _create(4, UNIT, block.timestamp + 1 days);
        vm.prank(executor);
        vm.expectRevert(SpectralToken.UnitOutOfRange.selector);
        market.countUnit(id, 4, keccak256("wide"));
    }

    function testEmptyReceiptRefused() public {
        uint256 id = _create(4, UNIT, block.timestamp + 1 days);
        vm.prank(executor);
        vm.expectRevert(SpectralToken.EmptyReceipt.selector);
        market.countUnit(id, 0, bytes32(0));
    }

    function testStrangerCannotCount() public {
        uint256 id = _create(4, UNIT, block.timestamp + 1 days);
        vm.prank(stranger);
        vm.expectRevert(SpectralToken.NotExecutor.selector);
        market.countUnit(id, 0, keccak256("theirs"));
    }

    function testExecutorCannotCountAfterTakeover() public {
        uint256 id = _create(4, UNIT, block.timestamp + 1 days);
        _count(executor, id, 0);
        vm.prank(executor);
        market.declareStalled(id);
        vm.prank(stranger);
        market.listObligation(id, block.timestamp + 2 days);
        uint256 req = market.requiredBond(id);
        vm.prank(taker);
        market.takeObligation(id, req);

        vm.prank(executor);
        vm.expectRevert(SpectralToken.NotExecutor.selector);
        market.countUnit(id, 1, keccak256("late"));
    }

    function testListingBeforeStallingRefused() public {
        uint256 id = _create(4, UNIT, block.timestamp + 1 days);
        vm.prank(stranger);
        vm.expectRevert(SpectralToken.AlreadyStalled.selector);
        market.listObligation(id, block.timestamp + 2 days);
    }

    function testStrangerCannotDeclareStallBeforeDeadline() public {
        uint256 id = _create(4, UNIT, block.timestamp + 1 days);
        vm.prank(stranger);
        vm.expectRevert(SpectralToken.DeadlineNotReached.selector);
        market.declareStalled(id);
    }

    function testExecutorMayStallImmediately() public {
        uint256 id = _create(4, UNIT, block.timestamp + 1 days);
        vm.prank(executor);
        market.declareStalled(id);
        assertEq(uint256(market.stateOf(id)), uint256(SpectralToken.State.Stalled));
    }

    function testBondBelowTheMinimumRefused() public {
        uint256 id = _create(10, UNIT, block.timestamp + 1 days);
        _countMany(executor, id, 0, 4);
        vm.prank(executor);
        market.declareStalled(id);
        vm.prank(stranger);
        market.listObligation(id, block.timestamp + 2 days);

        uint256 required = market.requiredBond(id);
        vm.prank(taker);
        vm.expectRevert(abi.encodeWithSelector(SpectralToken.BondTooSmall.selector, required));
        market.takeObligation(id, required - 1);
    }

    function testTakingTwiceRefused() public {
        uint256 id = _create(4, UNIT, block.timestamp + 1 days);
        _count(executor, id, 0);
        vm.prank(executor);
        market.declareStalled(id);
        vm.prank(stranger);
        market.listObligation(id, block.timestamp + 2 days);
        uint256 req = market.requiredBond(id);
        vm.prank(taker);
        market.takeObligation(id, req);

        uint256 req2 = market.requiredBond(id);
        vm.prank(stranger);
        vm.expectRevert(SpectralToken.NothingToTake.selector);
        market.takeObligation(id, req2);
    }

    function testClosingBeforeTheTakerDeadlineRefused() public {
        uint256 id = _create(4, UNIT, block.timestamp + 1 days);
        _count(executor, id, 0);
        vm.prank(executor);
        market.declareStalled(id);
        vm.prank(stranger);
        market.listObligation(id, block.timestamp + 2 days);
        uint256 req = market.requiredBond(id);
        vm.prank(taker);
        market.takeObligation(id, req);

        vm.expectRevert(SpectralToken.DeadlineNotReached.selector);
        market.closeFailed(id);
    }

    function testClosingACompletedJobRefused() public {
        uint256 id = _create(4, UNIT, block.timestamp + 1 days);
        _countMany(executor, id, 0, 4);
        vm.warp(block.timestamp + 3 days);
        vm.expectRevert(SpectralToken.NothingToTake.selector);
        market.closeFailed(id);
    }

    function testClaimWithNothingOwedRefused() public {
        vm.prank(stranger);
        vm.expectRevert(SpectralToken.NothingToClaim.selector);
        market.claim();
    }

    function testSecondClaimRefused() public {
        uint256 id = _create(2, UNIT, block.timestamp + 1 days);
        _countMany(executor, id, 0, 2);
        vm.prank(executor);
        market.claim();
        vm.prank(executor);
        vm.expectRevert(SpectralToken.NothingToClaim.selector);
        market.claim();
    }

    function testDeploymentWithZeroAssetRefused() public {
        vm.expectRevert(SpectralToken.ZeroAddress.selector);
        new SpectralToken(IERC20(address(0)));
    }

    // ---------------------------------------------------------------- conservation

    function testFuzzConservationAcrossMixedPaths(uint8 units_, uint96 price_, bool take, bool takerFinishes) public {
        uint256 units = bound(uint256(units_), 1, 12);
        uint256 price = bound(uint256(price_), 1, UNIT);
        uint256 escrow = units * price;

        equity.mint(buyer, escrow);
        equity.mint(taker, escrow);

        uint256 id = _create(units, price, block.timestamp + 1 days);

        uint256 executorCount = units > 1 ? (units / 2) : 1;
        _countMany(executor, id, 0, executorCount);

        /* when the executor counted every unit the job is already settled: nothing to take */
        if (!take || executorCount >= units) {
            _assertConserved();
            return;
        }

        vm.prank(executor);
        market.declareStalled(id);
        vm.prank(stranger);
        market.listObligation(id, block.timestamp + 2 days);
        uint256 req = market.requiredBond(id);
        vm.prank(taker);
        market.takeObligation(id, req);

        if (takerFinishes) {
            _countMany(taker, id, executorCount, units);
        } else {
            vm.warp(block.timestamp + 3 days);
            market.closeFailed(id);
        }

        _assertConserved();
    }

    /// @notice the market can never owe more than it holds: the guard is the balance itself
    function testMarketCannotOweMoreThanItHolds() public {
        uint256 id = _create(4, UNIT, block.timestamp + 1 days);
        _countMany(executor, id, 0, 4);
        uint256 owed = market.credits(executor);
        assertEq(equity.balanceOf(address(market)), owed);

        vm.prank(executor);
        market.claim();
        assertEq(equity.balanceOf(address(market)), 0, "paid out exactly what it held");
        assertEq(equity.balanceOf(executor), 1_000 * UNIT + 4 * UNIT, "paid for four units on top of what it started with");
    }
}

/* A hostile ERC-20 that re-enters claim() from inside transfer(). The market zeroes the
   credit before it transfers, so the re-entrant call must find nothing to take. */
contract ReentrantToken {
    SpectralToken public market;
    bool private armed;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    constructor() {}

    function setMarket(SpectralToken m) external {
        market = m;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        if (address(market) != address(0) && !armed) {
            armed = true;
            market.claim();          // must revert NothingToClaim, or the drain succeeds
        }
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address, uint256 amount) external returns (bool) {
        balanceOf[from] -= amount;
        return true;
    }
}

contract SpectralTokenReentrancyTest is Test {
    ReentrantToken token;
    SpectralToken market;
    address executor = address(0xE0E);

    function setUp() public {
        token = new ReentrantToken();
        market = new SpectralToken(IERC20(address(token)));
        token.setMarket(market);
    }

    function testReentrantClaimCannotDrainTheMarket() public {
        token.mint(address(this), 10e18);
        token.approve(address(market), type(uint256).max);
        uint256 id = market.createJob(executor, 2, 1e18, block.timestamp + 1 days);

        vm.prank(executor);
        market.countUnit(id, 0, bytes32(uint256(1)));
        vm.prank(executor);
        market.countUnit(id, 1, bytes32(uint256(2)));

        vm.prank(executor);
        vm.expectRevert(SpectralToken.NothingToClaim.selector);
        market.claim();   // the inner call has nothing left: the credit was zeroed first
    }
}
