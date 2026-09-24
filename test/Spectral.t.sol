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
}
