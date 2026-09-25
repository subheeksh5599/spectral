// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {TestnetEquity} from "../src/TestnetEquity.sol";
import {SpectralToken, IERC20} from "../src/SpectralToken.sol";

/// @notice The token-denominated market, start to finish, on whatever chain the RPC points at.
/// Four environment keys, no defaults: TOKEN_DEPLOYER_KEY, TOKEN_BUYER_KEY, TOKEN_EXECUTOR_KEY,
/// TOKEN_TAKER_KEY. Amounts also come from the environment.
///
/// This opens two jobs:
///   job 1 — the executor does half the units, stalls, a taker buys the remainder and finishes it
///   job 2 — the taker buys the remainder and fails; run TokenFailClose.s.sol after the taker
///           deadline to watch the bond move and the remainder go back to the buyer
///
/// Nothing here is simulated: every step is a transaction, and the equity token is a real
/// ERC-20 deployed on the same chain by this script.
contract TokenMarket is Script {
    uint256 units;
    uint256 price;
    uint256 workWindow;
    uint256 takerWindow;

    function run() external {
        uint256 deployKey = vm.envUint("TOKEN_DEPLOYER_KEY");
        uint256 buyerKey = vm.envUint("TOKEN_BUYER_KEY");
        uint256 executorKey = vm.envUint("TOKEN_EXECUTOR_KEY");
        uint256 takerKey = vm.envUint("TOKEN_TAKER_KEY");

        units = vm.envUint("TOKEN_UNITS");
        price = vm.envUint("TOKEN_PRICE_PER_UNIT");
        workWindow = vm.envUint("TOKEN_WORK_WINDOW_SECONDS");
        takerWindow = vm.envUint("TOKEN_TAKER_WINDOW_SECONDS");
        uint256 mintAmount = vm.envUint("TOKEN_MINT_AMOUNT");

        console.log("== actors ==");
        console.log("buyer   ", vm.addr(buyerKey));
        console.log("executor", vm.addr(executorKey));
        console.log("taker   ", vm.addr(takerKey));

        (TestnetEquity equity, SpectralToken market) =
            _deploy(deployKey, buyerKey, executorKey, takerKey, mintAmount);

        uint256 job1 = _jobOneRescued(equity, market, buyerKey, executorKey, takerKey);
        uint256 job2 = _jobTwoFailed(market, buyerKey, executorKey, takerKey);

        console.log("wait at least TOKEN_TAKER_WINDOW_SECONDS, then run TokenFailClose.s.sol");
        console.log("JOB1", job1);
        console.log("JOB2", job2);
        console.log("TAKER_WINDOW_SECONDS", takerWindow);
    }

    function _deploy(uint256 deployKey, uint256 buyerKey, uint256 executorKey, uint256 takerKey,
                     uint256 mintAmount) internal returns (TestnetEquity, SpectralToken) {
        vm.startBroadcast(deployKey);
        TestnetEquity equity = new TestnetEquity("Testnet Equity Replica: TSLA", "tTSLA");
        SpectralToken market = new SpectralToken(IERC20(address(equity)));
        // the faucet is open by design: a testnet replica nobody can obtain is useless
        equity.mint(vm.addr(buyerKey), mintAmount);
        equity.mint(vm.addr(executorKey), mintAmount);
        equity.mint(vm.addr(takerKey), mintAmount);
        vm.stopBroadcast();
        console.log("== deployed ==");
        console.log("equity ", address(equity));
        console.log("market ", address(market));
        console.log("minted per actor", mintAmount);
        return (equity, market);
    }

    function _jobOneRescued(TestnetEquity equity, SpectralToken market, uint256 buyerKey,
                            uint256 executorKey, uint256 takerKey) internal returns (uint256 job1) {
        vm.startBroadcast(buyerKey);
        equity.approve(address(market), type(uint256).max);
        job1 = market.createJob(vm.addr(executorKey), units, price, block.timestamp + workWindow);
        vm.stopBroadcast();
        console.log("== job 1 created ==", job1);

        _count(executorKey, market, job1, 0, units / 2);
        console.log("executor counted half of job 1, then stops");

        vm.startBroadcast(executorKey);
        market.declareStalled(job1);
        market.listObligation(job1, block.timestamp + takerWindow);
        vm.stopBroadcast();
        console.log("job 1 stalled and listed");

        vm.startBroadcast(takerKey);
        equity.approve(address(market), type(uint256).max);
        market.takeObligation(job1, market.requiredBond(job1));
        vm.stopBroadcast();
        console.log("taker took job 1, bond posted", market.requiredBond(job1));

        _count(takerKey, market, job1, units / 2, units);
        console.log("taker finished job 1 -> settled");

        console.log("job 1 paid out: executor", market.credits(vm.addr(executorKey)),
                    "taker", market.credits(vm.addr(takerKey)));
        _claim(executorKey, market);
        _claim(takerKey, market);
    }

    function _jobTwoFailed(SpectralToken market, uint256 buyerKey, uint256 executorKey,
                           uint256 takerKey) internal returns (uint256 job2) {
        vm.startBroadcast(buyerKey);
        job2 = market.createJob(vm.addr(executorKey), units, price, block.timestamp + workWindow);
        vm.stopBroadcast();
        console.log("== job 2 created ==", job2);

        vm.startBroadcast(executorKey);
        market.countUnit(job2, 0, keccak256(abi.encodePacked("unit", job2, uint256(0))));
        market.declareStalled(job2);
        market.listObligation(job2, block.timestamp + takerWindow);
        vm.stopBroadcast();
        console.log("job 2: executor counted 1 unit, stalled, listed");

        vm.startBroadcast(takerKey);
        market.takeObligation(job2, market.requiredBond(job2));
        vm.stopBroadcast();
        console.log("job 2 taken, then the taker goes quiet");
    }

    function _count(uint256 key, SpectralToken market, uint256 jobId, uint256 from, uint256 to) internal {
        for (uint256 i = from; i < to; i++) {
            vm.startBroadcast(key);
            market.countUnit(jobId, i, keccak256(abi.encodePacked("unit", jobId, i)));
            vm.stopBroadcast();
        }
    }

    function _claim(uint256 key, SpectralToken market) internal {
        vm.startBroadcast(key);
        market.claim();
        vm.stopBroadcast();
    }
}
