// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Obligo} from "../src/Obligo.sol";

/// @notice testnet deploy. No defaults: the key must come from the environment.
contract DeployObligo is Script {
    function run() external returns (address deployed) {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(pk);
        Obligo o = new Obligo();
        vm.stopBroadcast();
        deployed = address(o);
        console.log("OBLIGO_DEPLOYED", deployed);
    }
}
