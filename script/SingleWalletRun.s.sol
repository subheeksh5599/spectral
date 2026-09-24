// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Spectral} from "../src/Spectral.sol";

/// @notice One wallet, the whole lifecycle.
///
/// The contract restricts *addresses*, not the number of wallets: nothing stops the buyer
/// naming itself as the executor and later taking its own obligation over as taker. This
/// script does exactly that against the deployed venue, so the path a single visitor can
/// walk is on the record rather than argued for.
contract SingleWalletRun is Script {
    function run() external {
        uint256 pk = vm.envUint("TESTNET_TAKER_KEY");
        address wallet = vm.addr(pk);
        Spectral venue = Spectral(vm.envAddress("VENUE"));

        uint256 units = 3;
        uint256 ppu = 0.0005 ether;

        vm.startBroadcast(pk);
        uint256 id = venue.createJob{value: units * ppu}(wallet, units, ppu, block.timestamp + 1 hours);
        venue.countUnit(id, 0, keccak256("single-wallet:unit:0"));
        venue.declareStalled(id);
        venue.listObligation(id, block.timestamp + 180);
        uint256 bond = venue.requiredBond(id);
        venue.takeObligation{value: bond}(id);
        venue.countUnit(id, 1, keccak256("single-wallet:unit:1"));
        venue.countUnit(id, 2, keccak256("single-wallet:unit:2"));
        uint256 owed = venue.credits(wallet);
        venue.claim();
        vm.stopBroadcast();

        console.log("wallet (buyer + executor + taker)", wallet);
        console.log("job id", id);
        console.log("bond posted (wei)", bond);
        console.log("credited before claim (wei)", owed);
        console.log("state (4 == Settled)", uint256(venue.stateOf(id)));
        console.log("escrow in (wei)", units * ppu);
        console.log("bond in (wei)", bond);
    }
}
