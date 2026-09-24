// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Spectral} from "../src/Spectral.sol";

contract SpectralTest is Test {
    Spectral o;
    address buyer = address(0xB0B);
    address executor = address(0xE0E);
    address taker;
    address stranger = address(0x57A);

    uint256 constant UNITS = 10;
    uint256 constant PPU = 1 ether;      // 10 units => escrow 10 ether
    uint256 constant ESCROW = UNITS * PPU;
    uint256 constant TAKER_DEADLINE_OFFSET = 1 days;

    function setUp() public {
        o = new Spectral();
        taker = address(uint160(uint256(keccak256("taker-address"))));
        vm.deal(buyer, 1000 ether);
        vm.deal(taker, 1000 ether);
    }

    // ---------- helpers ----------

    function _create(uint256 deadline) internal returns (uint256 id) {
        vm.prank(buyer);
        id = o.createJob{value: ESCROW}(executor, UNITS, PPU, deadline);
    }

    function _countExecutor(uint256 id, uint256 from, uint256 to) internal {
        for (uint256 i = from; i < to; i++) {
            vm.prank(executor);
            o.countUnit(id, i, keccak256(abi.encodePacked("unit", i)));
        }
    }

    function _countTaker(uint256 id, uint256 from, uint256 to) internal {
        for (uint256 i = from; i < to; i++) {
            vm.prank(taker);
            o.countUnit(id, i, keccak256(abi.encodePacked("unit", i)));
        }
    }

    /// conservation: every wei is either owed as a credit or still locked in a live job
    function _assertConserved(uint256 id) internal view {
        (
            , , , , uint256 esc, , , , , , uint256 bond, Spectral.State st
        ) = o.jobs(id);

        uint256 inFlight;
        if (st != Spectral.State.Settled && st != Spectral.State.Closed) {
            inFlight = esc + (st == Spectral.State.Taken ? bond : 0);
        }

        assertEq(
            address(o).balance,
            o.credits(buyer) + o.credits(executor) + o.credits(taker) + inFlight,
            "conservation broken"
        );
    }

    function _take(uint256 id) internal {
        vm.prank(executor);
        o.declareStalled(id);
        o.listObligation(id, block.timestamp + TAKER_DEADLINE_OFFSET);
        vm.prank(taker);
        o.takeObligation{value: ESCROW / 2}(id); // 50% bond on the full remainder
    }

    // ---------- A1/A3 create ----------

    function testCreateRequiresExactEscrow() public {
        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(Spectral.BadEscrow.selector, ESCROW));
        o.createJob{value: ESCROW - 1}(executor, UNITS, PPU, block.timestamp + 1 days);
    }

    function testCreateRejectsZeroUnits() public {
        vm.prank(buyer);
        vm.expectRevert(Spectral.UnitOutOfRange.selector);
        o.createJob{value: 0}(executor, 0, PPU, block.timestamp + 1 days);
    }

    // ---------- A4/A5/A6/A9 full completion by the executor ----------

    function testFullCompletionByExecutor() public {
        uint256 id = _create(block.timestamp + 1 days);
        _countExecutor(id, 0, UNITS);

        assertEq(uint8(o.stateOf(id)), uint8(Spectral.State.Settled));
        assertEq(o.credits(executor), ESCROW);
        assertEq(o.credits(buyer), 0);
        _assertConserved(id);
    }

    function testSingleUnitJob() public {
        vm.prank(buyer);
        uint256 id = o.createJob{value: PPU}(executor, 1, PPU, block.timestamp + 1 days);
        _countExecutor(id, 0, 1);
        assertEq(uint8(o.stateOf(id)), uint8(Spectral.State.Settled));
        assertEq(o.credits(executor), PPU);
        _assertConserved(id);
    }

    // ---------- A2 no double count ----------

    function testUnitCannotBeCountedTwice() public {
        uint256 id = _create(block.timestamp + 1 days);
        vm.prank(executor);
        o.countUnit(id, 0, keccak256("r0"));
        vm.prank(executor);
        vm.expectRevert(Spectral.UnitAlreadyCounted.selector);
        o.countUnit(id, 0, keccak256("r0-again"));
    }

    function testZeroReceiptRefused() public {
        uint256 id = _create(block.timestamp + 1 days);
        vm.prank(executor);
        vm.expectRevert(Spectral.EmptyReceipt.selector);
        o.countUnit(id, 0, bytes32(0));
    }

    function testOutOfRangeUnitRefused() public {
        uint256 id = _create(block.timestamp + 1 days);
        vm.prank(executor);
        vm.expectRevert(Spectral.UnitOutOfRange.selector);
        o.countUnit(id, UNITS, keccak256("out"));
    }

    function testStrangerCannotCount() public {
        uint256 id = _create(block.timestamp + 1 days);
        vm.prank(stranger);
        vm.expectRevert(Spectral.NotExecutor.selector);
        o.countUnit(id, 0, keccak256("x"));
    }

    // ---------- A8 stall rules ----------

    function testExecutorMayStallImmediately() public {
        uint256 id = _create(block.timestamp + 1 days);
        vm.prank(executor);
        o.declareStalled(id);
        assertEq(uint8(o.stateOf(id)), uint8(Spectral.State.Stalled));
    }

    function testStrangerCannotStallBeforeDeadline() public {
        uint256 id = _create(block.timestamp + 1 days);
        vm.prank(stranger);
        vm.expectRevert(Spectral.DeadlineNotReached.selector);
        o.declareStalled(id);
    }

    function testAnyoneMayStallAfterDeadline() public {
        uint256 id = _create(block.timestamp + 1 days);
        vm.warp(block.timestamp + 2 days);
        vm.prank(stranger);
        o.declareStalled(id);
        assertEq(uint8(o.stateOf(id)), uint8(Spectral.State.Stalled));
    }

    // ---------- the core path: stall, takeover, completion ----------

    function testStallThenTakeoverCompletes() public {
        uint256 id = _create(block.timestamp + 1 days);
        _countExecutor(id, 0, 4); // 4 of 10 done, then the executor dies

        _take(id);

        assertEq(o.remainingUnits(id), 6);
        _countTaker(id, 4, UNITS);

        assertEq(uint8(o.stateOf(id)), uint8(Spectral.State.Settled));
        assertEq(o.credits(executor), 4 * PPU, "executor paid for what it did");
        // taker: 6 units of work + bond returned
        assertEq(o.credits(taker), 6 * PPU + ESCROW / 2, "taker paid remainder + bond");
        assertEq(o.credits(buyer), 0);
        _assertConserved(id);
    }

    // ---------- G1 the taker also fails ----------

    function testTakerFailureForfeitsBondToBuyer() public {
        uint256 id = _create(block.timestamp + 1 days);
        _countExecutor(id, 0, 4);
        _take(id);
        _countTaker(id, 4, 7); // taker does 3 more, then fails

        vm.warp(block.timestamp + TAKER_DEADLINE_OFFSET + 1);
        o.closeFailed(id);

        assertEq(uint8(o.stateOf(id)), uint8(Spectral.State.Closed));
        assertEq(o.credits(executor), 4 * PPU);
        assertEq(o.credits(taker), 3 * PPU, "taker paid for counted units only");
        assertEq(o.credits(buyer), 3 * PPU + ESCROW / 2, "remainder refunded + bond forfeited");
        _assertConserved(id);
    }

    function testCloseBeforeTakerDeadlineRefused() public {
        uint256 id = _create(block.timestamp + 1 days);
        _countExecutor(id, 0, 4);
        _take(id);
        vm.expectRevert(Spectral.DeadlineNotReached.selector);
        o.closeFailed(id);
    }

    // ---------- G4/G8/G9 takeover guards ----------

    function testCannotTakeBeforeStall() public {
        uint256 id = _create(block.timestamp + 1 days);
        vm.prank(taker);
        vm.expectRevert(Spectral.NothingToTake.selector);
        o.takeObligation{value: ESCROW}(id);
    }

    function testCannotTakeWithoutBond() public {
        uint256 id = _create(block.timestamp + 1 days);
        vm.prank(executor);
        o.declareStalled(id);
        o.listObligation(id, block.timestamp + 1 days);
        vm.prank(taker);
        vm.expectRevert(abi.encodeWithSelector(Spectral.BondTooSmall.selector, ESCROW / 2));
        o.takeObligation{value: ESCROW / 2 - 1}(id);
    }

    function testSecondTakerRefused() public {
        uint256 id = _create(block.timestamp + 1 days);
        _take(id);
        address late = address(uint160(uint256(keccak256("late-taker"))));
        vm.deal(late, 100 ether);
        vm.prank(late);
        vm.expectRevert(Spectral.NothingToTake.selector);
        o.takeObligation{value: ESCROW}(id);
    }

    function testBuyerCannotWithdrawMidWork() public {
        uint256 id = _create(block.timestamp + 1 days);
        vm.prank(buyer);
        vm.expectRevert(Spectral.NothingToClaim.selector);
        o.claim();
    }

    // ---------- A6 terminal states are final ----------

    function testNoResettleAfterSettlement() public {
        uint256 id = _create(block.timestamp + 1 days);
        _countExecutor(id, 0, UNITS);
        vm.prank(executor);
        vm.expectRevert(Spectral.JobNotOpen.selector);
        o.countUnit(id, 0, keccak256("post"));
    }

    function testCannotCloseASettledJob() public {
        uint256 id = _create(block.timestamp + 1 days);
        _countExecutor(id, 0, UNITS);
        vm.warp(block.timestamp + 10 days);
        vm.expectRevert(Spectral.NothingToTake.selector);
        o.closeFailed(id);
    }

    // ---------- claim ----------

    function testClaimPaysOut() public {
        uint256 id = _create(block.timestamp + 1 days);
        _countExecutor(id, 0, UNITS);
        uint256 before = executor.balance;
        vm.prank(executor);
        o.claim();
        assertEq(executor.balance, before + ESCROW);
        assertEq(address(o).balance, 0);
    }

    // ---------- fuzz: conservation holds for any split ----------

    function testFuzzConservation(uint256 executorUnits, uint256 takerUnits) public {
        executorUnits = bound(executorUnits, 0, UNITS);
        takerUnits = bound(takerUnits, 0, UNITS - executorUnits);

        uint256 id = _create(block.timestamp + 1 days);
        _countExecutor(id, 0, executorUnits);
        if (executorUnits + takerUnits == UNITS) {
            _assertConserved(id);
            return;
        }
        _take(id);
        _countTaker(id, executorUnits, executorUnits + takerUnits);
        _assertConserved(id);
    }

    // ---------- G7 integer edges ----------

    /// A zero price is legal and moves nothing: escrow is units x 0 = 0, so no party
    /// can be harmed and conservation holds trivially. Recorded rather than hidden.
    function testZeroPriceJobIsVacuousNotUnsafe() public {
        uint256 id;
        vm.prank(buyer);
        id = o.createJob{value: 0}(executor, 3, 0, block.timestamp + 1 days);

        for (uint256 i = 0; i < 3; i++) {
            vm.prank(executor);
            o.countUnit(id, i, keccak256(abi.encodePacked("zero-price", i)));
        }

        (, , , , uint256 esc, uint256 eu, uint256 tu, , , , uint256 bond, Spectral.State st) = o.jobs(id);

        assertEq(esc, 0, "a zero-price job escrows nothing");
        assertEq(bond, 0, "and its bond requirement is nothing");
        assertEq(uint256(st), uint256(Spectral.State.Settled), "it still settles by the ordinary rule");
        assertEq(eu, 3, "every unit was counted");
        assertEq(tu, 0, "no taker was involved");
        assertEq(o.credits(executor), 0, "and no credit was created out of nothing");
        assertEq(address(o).balance, 0, "the venue holds nothing");
    }

    /// units x price that overflows uint256 must revert, and must not create a job.
    function testCreateRejectsOverflowingEscrow() public {
        uint256 before = o.jobCount();
        vm.prank(buyer);
        vm.expectRevert();
        o.createJob{value: 0}(executor, type(uint256).max, 2, block.timestamp + 1 days);
        assertEq(o.jobCount(), before, "no job was created by an overflowing escrow calculation");
    }

    // ---------- G6 reentrancy ----------

    /// The attacker earns a genuine credit on one job, then re-enters claim() from the
    /// payout callback while the venue still holds another job's money. Credits are zeroed
    /// before the transfer, so the re-entry finds nothing and the other job is untouched.
    function testReentrantClaimCannotDrainAnotherJob() public {
        ReentrantClaimer attacker = new ReentrantClaimer(o);

        // job A: the attacker is the executor and is owed 10 ether
        vm.prank(buyer);
        uint256 jobA = o.createJob{value: ESCROW}(address(attacker), UNITS, PPU, block.timestamp + 1 days);
        for (uint256 i = 0; i < UNITS; i++) attacker.countIt(jobA, i);

        // job B: someone else is owed 4 ether, and their money is still in the venue
        vm.prank(buyer);
        uint256 jobB = o.createJob{value: 4 ether}(executor, 4, PPU, block.timestamp + 1 days);
        for (uint256 i = 0; i < 4; i++) {
            vm.prank(executor);
            o.countUnit(jobB, i, keccak256(abi.encodePacked("jobB", i)));
        }

        assertEq(address(o).balance, ESCROW + 4 ether, "the venue holds both claims before the attack");
        assertEq(o.credits(address(attacker)), ESCROW, "the attacker has a real credit");

        attacker.claimIt();

        assertEq(attacker.attempts(), 1, "the callback did try to re-enter");
        assertTrue(attacker.reentryReverted(), "and the re-entry was refused, not silently ignored");
        assertEq(address(attacker).balance, ESCROW, "the attacker received exactly its own credit");
        assertEq(o.credits(address(attacker)), 0, "its credit was consumed once");
        assertEq(address(o).balance, 4 ether, "the other job's money is untouched");
        assertEq(o.credits(executor), 4 ether, "and still owed to its owner");
    }

}

/// A minimal attacker: it claims once, and re-enters from the payout callback.
contract ReentrantClaimer {
    Spectral public venue;
    uint256 public attempts;
    bool public reentryReverted;

    constructor(Spectral v) {
        venue = v;
    }

    function countIt(uint256 jobId, uint256 unitIndex) external {
        venue.countUnit(jobId, unitIndex, keccak256(abi.encodePacked("attacker", unitIndex)));
    }

    function claimIt() external {
        venue.claim();
    }

    receive() external payable {
        if (attempts == 0) {
            attempts = 1;
            try venue.claim() {
                reentryReverted = false;
            } catch {
                reentryReverted = true;
            }
        }
    }
}
