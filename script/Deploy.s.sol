// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Spectral} from "../src/Spectral.sol";

/// @notice testnet deploy. No defaults: the key must come from the environment.
contract DeploySpectral is Script {
    function run() external returns (address deployed) {
        uint256 pk = vm.envUint("DEPLOYER_KEY");
        vm.startBroadcast(pk);
        Spectral o = new Spectral();
        vm.stopBroadcast();
        deployed = address(o);
        console.log("SPECTRAL_DEPLOYED", deployed);
    }
}
