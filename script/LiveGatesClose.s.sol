// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Spectral} from "../src/Spectral.sol";

/// @notice Part two: run only after the taker's window has genuinely elapsed.
/// The taker never finished, so the bond must move to the buyer by rule — no jury,
/// no discretion, no admin call.
contract LiveGatesClose is Script {
    function run() external {
        uint256 buyerKey = vm.envUint("TESTNET_BUYER_KEY");
        address venue = vm.envAddress("VENUE");
        uint256 job = vm.envUint("GATE_JOB_ID");

        Spectral o = Spectral(payable(venue));

        (address jobBuyer, address executor, , , uint256 escrow, uint256 eu, uint256 tu, , uint256 takerDeadline, address taker, uint256 bond, Spectral.State st) = o.jobs(job);
        console.log("before: state", uint256(st), "now", block.timestamp);
        console.log("takerDeadline", takerDeadline, "bond wei", bond);

        require(block.timestamp > takerDeadline, "the taker window has not elapsed yet");
        require(
            st == Spectral.State.Taken,
            "the job is not in the taken state"
        );

        uint256 buyerBefore = jobBuyer.balance;

        vm.startBroadcast(buyerKey);
        o.closeFailed(job);
        vm.stopBroadcast();

        (, , , , , eu, tu, , , , , st) = o.jobs(job);
        console.log("after: state", uint256(st), "executorUnits", eu);
        console.log("takerUnits", tu, "escrow wei", escrow);
        console.log("buyer balance delta wei", jobBuyer.balance - buyerBefore);
        console.log("taker", taker);
        console.log("executor", executor);
    }
}
