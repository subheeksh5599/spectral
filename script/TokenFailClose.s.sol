// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {TestnetEquity} from "../src/TestnetEquity.sol";
import {SpectralToken, IERC20} from "../src/SpectralToken.sol";

/// @notice Run after the job-2 taker deadline has passed. Closes the failed job and pays out.
/// Env: TOKEN_MARKET, TOKEN_EQUITY, TOKEN_JOB2, TOKEN_BUYER_KEY, TOKEN_EXECUTOR_KEY.
contract TokenFailClose is Script {
    function run() external {
        SpectralToken market = SpectralToken(vm.envAddress("TOKEN_MARKET"));
        TestnetEquity equity = TestnetEquity(vm.envAddress("TOKEN_EQUITY"));
        uint256 job2 = vm.envUint("TOKEN_JOB2");
        uint256 buyerKey = vm.envUint("TOKEN_BUYER_KEY");
        uint256 executorKey = vm.envUint("TOKEN_EXECUTOR_KEY");
        address buyer = vm.addr(buyerKey);
        address executor = vm.addr(executorKey);

        uint256 marketHeldBefore = equity.balanceOf(address(market));
        vm.startBroadcast(buyerKey);
        market.closeFailed(job2);
        vm.stopBroadcast();

        uint256 owedBuyer = market.credits(buyer);
        uint256 owedExecutor = market.credits(executor);
        vm.startBroadcast(buyerKey);
        market.claim();
        vm.stopBroadcast();
        vm.startBroadcast(executorKey);
        market.claim();
        vm.stopBroadcast();

        console.log("job 2 closed. refunded to buyer", owedBuyer, "paid to executor", owedExecutor);
        console.log("market held before close", marketHeldBefore);
        console.log("market holds after payouts", equity.balanceOf(address(market)));
        console.log("state(2)", uint256(market.stateOf(job2)));
    }
}
