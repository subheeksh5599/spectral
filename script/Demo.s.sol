// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Spectral} from "../src/Spectral.sol";

/// @notice End-to-end lifecycle on a live node (works unchanged on testnet 1952).
/// Actor keys come from the environment — there are no defaults in this file.
/// On a local chain these are Foundry's public anvil dev keys; on 1952 they are
/// three funded testnet wallets. Nothing here is simulated: every step is a real
/// transaction producing a real state change.
contract DemoSpectral is Script {
    // amounts come from the environment: testnet gas money is tiny, mainnet-scale escrows
    // would be unfundable. No defaults here by design.
    uint256 UNITS;
    uint256 PPU;
    uint256 ESCROW;

    function run() external {
        uint256 buyerKey = vm.envUint("BUYER_KEY");
        uint256 executorKey = vm.envUint("EXECUTOR_KEY");
        uint256 takerKey = vm.envUint("TAKER_KEY");
        address buyer = vm.addr(buyerKey);
        address executor = vm.addr(executorKey);
        address taker = vm.addr(takerKey);

        uint256 deployKey = vm.envUint("DEPLOYER_KEY");
        UNITS = vm.envUint("DEMO_UNITS");
        PPU = vm.envUint("DEMO_PRICE_PER_UNIT_WEI");
        uint256 takerWindow = vm.envUint("DEMO_TAKER_WINDOW_SECONDS");
        ESCROW = UNITS * PPU;

        console.log("== actors ==");
        console.log("buyer   ", buyer);
        console.log("executor", executor);
        console.log("taker   ", taker);

        vm.startBroadcast(deployKey);
        Spectral o = new Spectral();
        vm.stopBroadcast();
        console.log("== venue deployed ==");
        console.log("Spectral", address(o));

        // ---------- job 1: stall, takeover, completion ----------
        vm.startBroadcast(buyerKey);
        uint256 id = o.createJob{value: ESCROW}(executor, UNITS, PPU, block.timestamp + 1 days);
        vm.stopBroadcast();
        console.log("== job 1 created ==", id);

        for (uint256 i = 0; i < 4; i++) {
            vm.startBroadcast(executorKey);
            o.countUnit(id, i, keccak256(abi.encodePacked("unit", id, i)));
            vm.stopBroadcast();
        }
        console.log("executor counted 4 of 10, then stops");

        vm.startBroadcast(executorKey);
        o.declareStalled(id);
        vm.stopBroadcast();

        vm.startBroadcast(buyerKey);
        o.listObligation(id, block.timestamp + 1 days);
        vm.stopBroadcast();
        console.log("obligation listed; remaining units:", o.remainingUnits(id));

        vm.startBroadcast(takerKey);
        o.takeObligation{value: o.requiredBond(id)}(id);
        vm.stopBroadcast();
        console.log("taker posted bond:", o.requiredBond(id));

        for (uint256 i = 4; i < UNITS; i++) {
            vm.startBroadcast(takerKey);
            o.countUnit(id, i, keccak256(abi.encodePacked("unit", id, i)));
            vm.stopBroadcast();
        }
        console.log("== job 1 settled ==");
        console.log("executor credit", o.credits(executor));
        console.log("taker credit   ", o.credits(taker));
        console.log("buyer credit   ", o.credits(buyer));
        console.log("state (4=Settled)", uint256(o.stateOf(id)));

        // ---------- job 2: the taker also fails ----------
        vm.startBroadcast(buyerKey);
        uint256 id2 = o.createJob{value: ESCROW}(executor, UNITS, PPU, block.timestamp + 1 days);
        vm.stopBroadcast();

        for (uint256 i = 0; i < 4; i++) {
            vm.startBroadcast(executorKey);
            o.countUnit(id2, i, keccak256(abi.encodePacked("unit", id2, i)));
            vm.stopBroadcast();
        }
        vm.startBroadcast(executorKey);
        o.declareStalled(id2);
        vm.stopBroadcast();
        vm.startBroadcast(buyerKey);
        o.listObligation(id2, block.timestamp + takerWindow);
        vm.stopBroadcast();
        vm.startBroadcast(takerKey);
        o.takeObligation{value: o.requiredBond(id2)}(id2);
        vm.stopBroadcast();

        for (uint256 i = 4; i < 7; i++) {
            vm.startBroadcast(takerKey);
            o.countUnit(id2, i, keccak256(abi.encodePacked("unit", id2, i)));
            vm.stopBroadcast();
        }
        console.log("job2: taker counted 3 more, then also failed");
        console.log("JOB2_ID", id2);
        console.log("job2 state (3=Taken)", uint256(o.stateOf(id2)));
        console.log("next: advance the chain clock past the deadline, then run Finalize.s.sol");
    }
}
