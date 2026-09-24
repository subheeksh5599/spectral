// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Spectral} from "../src/Spectral.sol";

/// @notice Part 2: after the chain's clock has genuinely passed the taker deadline, close the
/// failed obligation by rule and pay everyone. Needs VENUE and JOB_ID from the environment.
contract FinalizeSpectral is Script {
    function run() external {
        address venue = vm.envAddress("VENUE");
        uint256 jobId = vm.envUint("JOB_ID");
        uint256 buyerKey = vm.envUint("BUYER_KEY");
        uint256 executorKey = vm.envUint("EXECUTOR_KEY");
        uint256 takerKey = vm.envUint("TAKER_KEY");
        address buyer = vm.addr(buyerKey);
        address executor = vm.addr(executorKey);
        address taker = vm.addr(takerKey);

        Spectral o = Spectral(venue);

        vm.startBroadcast(buyerKey);
        o.closeFailed(jobId);
        vm.stopBroadcast();
        console.log("closed by rule; state (5=Closed)", uint256(o.stateOf(jobId)));
        console.log("executor credit", o.credits(executor));
        console.log("taker credit   ", o.credits(taker));
        console.log("buyer credit   ", o.credits(buyer));

        vm.startBroadcast(executorKey);
        o.claim();
        vm.stopBroadcast();
        vm.startBroadcast(takerKey);
        o.claim();
        vm.stopBroadcast();
        vm.startBroadcast(buyerKey);
        o.claim();
        vm.stopBroadcast();

        console.log("venue balance after all claims", address(o).balance);
        console.log("executor final balance", executor.balance);
        console.log("taker final balance   ", taker.balance);
        console.log("buyer final balance   ", buyer.balance);
    }
}
