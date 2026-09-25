// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {SpectralToken, IERC20} from "../src/SpectralToken.sol";

/// The market's IERC20 is deliberately minimal — it needs transfer/approve/allowance and nothing
/// else. The script wants the asset's own name for its output, so it declares that here rather than
/// widening the interface the contract compiles against.
interface IAssetMeta {
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
}

/// @notice A market denominated in a token that already exists on this chain, rather than one this
/// build deploys. Everything else is the same contract: the market does not care whose ERC-20 it
/// escrows, and it reads that asset's own `decimals()` when it formats amounts.
///
/// Two environment keys, no defaults: `USD_DEPLOYER_KEY` (pays for the deploy) and `USD_TOKEN`
/// (the address of the asset to denominate in). Nothing is minted and nothing is simulated — the
/// deployer wallet must already hold only gas, and the asset must already exist.
///
/// The jobs that follow are opened from the venue page, by the wallet that holds the asset, so this
/// script stays exactly what it is: one deployment.
contract UsdMarket is Script {
    function run() external returns (SpectralToken market) {
        uint256 deployKey = vm.envUint("USD_DEPLOYER_KEY");
        address asset = vm.envAddress("USD_TOKEN");

        console.log("== asset ==");
        console.log("token   ", asset);
        console.log("symbol  ", IAssetMeta(asset).symbol());
        console.log("decimals", IAssetMeta(asset).decimals());

        vm.startBroadcast(deployKey);
        market = new SpectralToken(IERC20(asset));
        vm.stopBroadcast();

        console.log("== deployed ==");
        console.log("market  ", address(market));
        console.log("asset   ", address(market.asset()));
        console.log("deployer", vm.addr(deployKey));
    }
}
