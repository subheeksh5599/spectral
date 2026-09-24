// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Spectral} from "../src/Spectral.sol";

/// @notice Part one of the live gate sequence. Actor keys come from the environment.
/// A live chain's clock cannot be warped, so the deadline rule is exercised across two
/// scripts with real elapsed time between them — see LiveGatesClose.s.sol.
///
/// 1) a fresh job, with one unit counted (a target for the duplicate-index refusal)
/// 2) the zero-price edge mined for real
/// 3) stall, then list with a short takeover window
/// 4) a taker takes the remainder against a real bond
contract LiveGatesOpen is Script {
    function run() external {
        uint256 buyerKey = vm.envUint("TESTNET_BUYER_KEY");
        uint256 executorKey = vm.envUint("TESTNET_EXECUTOR_KEY");
        uint256 takerKey = vm.envUint("TESTNET_TAKER_KEY");
        address executor = vm.addr(executorKey);
        address venue = vm.envAddress("VENUE");

        uint256 units = vm.envUint("GATE_UNITS");
        uint256 ppu = vm.envUint("GATE_PRICE_PER_UNIT_WEI");
        uint256 window = vm.envUint("GATE_TAKER_WINDOW_SECONDS");

        Spectral o = Spectral(payable(venue));
        uint256 escrow = units * ppu;

        console.log("venue", venue);
        console.log("executor", executor);

        vm.startBroadcast(buyerKey);
        uint256 job = o.createJob{value: escrow}(executor, units, ppu, block.timestamp + 2 hours);
        vm.stopBroadcast();
        console.log("fresh job id", job);
        console.log("escrow wei", escrow);

        vm.startBroadcast(executorKey);
        o.countUnit(job, 0, keccak256(abi.encodePacked("gate-unit-0")));
        vm.stopBroadcast();
        console.log("unit 0 counted by the executor");

        // the zero-price edge, mined: escrows nothing, moves nothing
        vm.startBroadcast(buyerKey);
        uint256 vacuous = o.createJob{value: 0}(executor, 3, 0, block.timestamp + 2 hours);
        vm.stopBroadcast();
        console.log("zero-price job id", vacuous);

        vm.startBroadcast(executorKey);
        o.declareStalled(job);
        o.listObligation(job, block.timestamp + window);
        vm.stopBroadcast();
        console.log("listed; taker deadline", block.timestamp + window);
        console.log("GATE_JOB_ID", job);

        uint256 remaining = (units - 1) * ppu;
        uint256 bond = (remaining * o.MIN_BOND_BPS()) / o.BPS();

        vm.startBroadcast(takerKey);
        o.takeObligation{value: bond}(job);
        vm.stopBroadcast();
        console.log("taken by the taker; bond wei", bond);

        (, , , , , uint256 eu, uint256 tu, , , , uint256 held, Spectral.State st) = o.jobs(job);
        console.log("state", uint256(st), "executorUnits", eu);
        console.log("takerUnits", tu, "bond held wei", held);
    }
}
