# The second market: the same state machine, denominated in a token

This is the part of the project that answers a fair objection. The main market escrows native
value (OKB on X Layer testnet), and native value cannot be a share. So this deployment of the
same contract escrows an **ERC-20 that is shaped like a tokenized equity** — and rather than
mock one, the token is a real ERC-20 that this project deployed on the same testnet, with real
transfers, real balances and real allowances.

## What the token is, and what it is not

`0x7E7789c15E2792798176533d8843935947732b3C` — `name()` returns `Testnet Equity Replica: TSLA`,
`symbol()` returns `tTSLA`, 18 decimals.

It **is**: a standard ERC-20 on X Layer testnet (chain 1952), deployed by this project, with an
open `mint()` faucet so anyone can obtain it, and with balances and approvals that behave
exactly like the ERC-20 the market code consumes.

It is **not**: an xStock, a Backed-issued asset, a Tesla share, a claim on anything, or an
investment of any kind. There is no issuer, no transfer agent, no redemption path and no price.
The name says "replica" and the contract says so in its first line of comments. It exists so
that the market can be denominated in a token that behaves like the asset it stands in for,
instead of in a number in a UI.

## The market

`0x232a35C819BEcf3D10eA24Aa3E7F9aC616B287B5` — `SpectralToken`, deployed with the equity as its
`asset`. The asset is `immutable`: this contract can never be repointed at another token.

The state machine is the one in the main market, unchanged: units are counted and an index can
never be counted twice, a stall is declarable, the obligation is listed, anyone may take it by
posting a bond of at least half the remaining escrow, a taker that fails forfeits that bond to
the buyer, settlement is arithmetic over counted units, and there is no owner, admin, oracle,
jury, pause or upgrade path. Two things differ, and both are in the source:

| | native market | this market |
|---|---|---|
| escrow and bond | `msg.value` | `transferFrom` — the allowance must cover it |
| extra requirement | — | `approve` the market before creating or taking |
| `takeObligation` | takes a payable bond | takes `(jobId, bondAmount)` |

## Receipts, on chain, 2026-09-25

Three distinct wallets, all real transactions, all status `success`:

| role | address |
|---|---|
| deployer + buyer | `0xA6cFa92Ee3CF71cb74773BEBeDd79ae01755de62` |
| executor | `0x79f92531dDfe27F03742117f43e94026Da540F37` |
| taker | `0x017C2e8785aDDE2Cac9a5527bf7C5bb729AaD16C` |

| step | transaction |
|---|---|
| deploy the equity | [`0x093debbe9519c83dba3756ef7b6e2ce24af49fc75482ec0fb81a0f21500ac3c1`](https://www.okx.com/web3/explorer/xlayer-test/tx/0x093debbe9519c83dba3756ef7b6e2ce24af49fc75482ec0fb81a0f21500ac3c1) |
| deploy the market | [`0x1aaca8d99773fc9f9916e6431712ed95236e30ee4512c2fb53c0ce10b86ee620`](https://www.okx.com/web3/explorer/xlayer-test/tx/0x1aaca8d99773fc9f9916e6431712ed95236e30ee4512c2fb53c0ce10b86ee620) |
| job 1 created (10 units) | [`0x72c52f0c599f278d55ae23ce24094188b586b8863a7e64460466e71cd9f3fd80`](https://www.okx.com/web3/explorer/xlayer-test/tx/0x72c52f0c599f278d55ae23ce24094188b586b8863a7e64460466e71cd9f3fd80) |
| job 1 taken over, 2.5 tTSLA bond | [`0x6470798f2e1800c5bfebe8a44060b17d5452c10dee129b3a1801cc5a3eb8410a`](https://www.okx.com/web3/explorer/xlayer-test/tx/0x6470798f2e1800c5bfebe8a44060b17d5452c10dee129b3a1801cc5a3eb8410a) |
| job 2 created (10 units) | [`0x7324d2f249132c91a646ae5d9f84a47124815b7f5e975cf8359f6c7b5e6cdb57`](https://www.okx.com/web3/explorer/xlayer-test/tx/0x7324d2f249132c91a646ae5d9f84a47124815b7f5e975cf8359f6c7b5e6cdb57) |
| job 2 taken over, 4.5 tTSLA bond | [`0xeaee7d4f00f6b30427f18c8a9a2414bbe14446a08f7598011b3a6be3fb64ba0e`](https://www.okx.com/web3/explorer/xlayer-test/tx/0xeaee7d4f00f6b30427f18c8a9a2414bbe14446a08f7598011b3a6be3fb64ba0e) |
| job 2 closed as failed | [`0xa0e145d413991f9d09a7828d4f81d578551a5b02bc31bd7310b5ebba0088fa53`](https://www.okx.com/web3/explorer/xlayer-test/tx/0xa0e145d413991f9d09a7828d4f81d578551a5b02bc31bd7310b5ebba0088fa53) |

31 transactions across blocks 41871109–41871298, gas used 3,609,687 (about 0.00016 OKB at the
0.043 gwei this chain charged). Every one of them is in
`broadcast/TokenMarket.s.sol/1952/run-latest.json` and `broadcast/TokenFailClose.s.sol/1952/run-latest.json`.

## What jobs 1 and 2 demonstrate

(A third job, opened later, is a live listing rather than a completed run — it is at the end of this file.)

**Job 1 — a stall that a taker rescues.** Escrow 10 tTSLA (10 units at 1 tTSLA). The executor
counted 5 units and stopped. It declared the stall and listed the remainder itself. A different
wallet took the obligation for the 2.5 tTSLA bond the contract asked for, finished the five
remaining units, and the job settled by arithmetic: 5 tTSLA to the executor, 5 tTSLA plus the
returned 2.5 tTSLA bond to the taker.

**Job 2 — a taker that fails.** Escrow 10 tTSLA. The executor counted 1 unit. The taker bought
the nine-unit remainder for a 4.5 tTSLA bond and then finished nothing. After the taker
deadline anyone could close it, and closing it moved the money exactly as specified: 1 tTSLA to
the executor for the unit it counted, 9 tTSLA of unearned escrow back to the buyer, and the
4.5 tTSLA bond forfeited to that same buyer — 13.5 tTSLA. The market held 14.5 tTSLA before the
close and 0 after the payouts.

## Re-verify it yourself

```bash
RPC_URL=https://testrpc.xlayer.tech/terigon \
VENUE=0x232a35C819BEcf3D10eA24Aa3E7F9aC616B287B5 \
python3 verify_token.py
```

No key, no wallet, no file of truths: every line is a live read of the market and of the token
it names. It checks escrow arithmetic per job, that counted units never exceed registered units,
that the bond was never below half the remainder, that each job is in one of the six states the
contract defines, that the market's token balance is exactly its credits plus what is still in
flight, that the market holds no native value at all (this contract has no payable path), and
that the token supply is a plain faucet mint.

Read it from anywhere else with the same public board API the main market uses:

```bash
curl -s "https://spectral-venue.vercel.app/api/board?market=token"
node app/scripts/board-cli.mjs --rpc https://testrpc.xlayer.tech/terigon \
  --venue 0x232a35C819BEcf3D10eA24Aa3E7F9aC616B287B5 --symbol tTSLA
```

The venue page at `/app` shows this market as a read-only panel, with the same numbers, read
from that endpoint.

## Reproduce the run

Keys and amounts come from the environment; there are no defaults in the scripts.

```bash
export TOKEN_DEPLOYER_KEY=… TOKEN_BUYER_KEY=… TOKEN_EXECUTOR_KEY=… TOKEN_TAKER_KEY=…
export TOKEN_UNITS=10 TOKEN_PRICE_PER_UNIT=1000000000000000000 \
       TOKEN_WORK_WINDOW_SECONDS=1800 TOKEN_TAKER_WINDOW_SECONDS=90 \
       TOKEN_MINT_AMOUNT=1000000000000000000000

forge script script/TokenMarket.s.sol --rpc-url $XLAYER_TESTNET_RPC --broadcast --slow

# wait out TOKEN_TAKER_WINDOW_SECONDS, then close the failed job
export TOKEN_MARKET=… TOKEN_EQUITY=… TOKEN_JOB2=2
forge script script/TokenFailClose.s.sol --rpc-url $XLAYER_TESTNET_RPC --broadcast --slow
```

Before any of that, the whole thing runs on a local chain for free:

```bash
anvil &
export TOKEN_DEPLOYER_KEY=$LOCAL_DEPLOYER_KEY TOKEN_BUYER_KEY=$BUYER_KEY \
       TOKEN_EXECUTOR_KEY=$EXECUTOR_KEY TOKEN_TAKER_KEY=$TAKER_KEY
forge script script/TokenMarket.s.sol --rpc-url $LOCAL_RPC --broadcast
```

`test/SpectralToken.t.sol` covers the same paths against the same contract without a chain:
lifecycle, every refusal the contract defines, conservation fuzzed across mixed paths, and a
hostile ERC-20 that re-enters `claim()` from inside `transfer()` to show the credit is zeroed
before any transfer happens.

## Job 3 — the one still open, so the market is not inert

Jobs 1 and 2 are history; this one is current. Ten units at 1 tTSLA, the executor counted one and
stopped, stalled it and listed the nine-unit remainder itself. It is **listed and takeable right
now**: `requiredBond(3)` reads 4.5 tTSLA and the taker deadline is 2026-09-26 10:05 UTC.

| # | step | tx |
|---|---|---|
| 1 | createJob (10 units at 1 tTSLA) | [0x26e5111c1300…](https://www.okx.com/web3/explorer/xlayer-test/tx/0x26e5111c1300c6fff0eb8d20acf5fe00d33e912be0fc9df4cc577971108f8999) |
| 2 | countUnit 0 | [0xf6e85cec75cd…](https://www.okx.com/web3/explorer/xlayer-test/tx/0xf6e85cec75cd7dc67909ae8addc11c30a56a3dcaf017bf5faa58e0156fd06cd3) |
| 3 | declareStalled | [0x5fc192526432…](https://www.okx.com/web3/explorer/xlayer-test/tx/0x5fc19252643263d0d85705b6d5144cd1e145b2a413178a56c59e95e5b5fa760b) |
| 4 | listObligation(3, 2026-09-26 10:05 UTC) | [0x5ff03310c082…](https://www.okx.com/web3/explorer/xlayer-test/tx/0x5ff03310c082b5ab250f42297eaf584cb74c153f7a25a2ce44cfe83bac54ebdd) |

`verify_token.py` includes it: the third job's bond is checked against the half-of-remainder rule
exactly as the settled and closed ones are, which is why the same command prints 35/35 over all
six jobs. Whoever takes it gets 9 tTSLA of escrow if they finish the nine units, and forfeits the
4.5 tTSLA bond to the buyer if they do not.

## Taking a listing from the page — signed in the app, not typed into a terminal

A market whose only taker is its own author is a demo, and this was the weakest thing about this
second market: the panel showed a listing nobody could act on without a shell. It is signed from
the page now, by three contracts calls in the order the contracts require, and the app shows each
one as it lands.

| # | step | why it exists | tx |
|---|---|---|---|
| 1 | `equity.mint(you, shortfall)` | the bond is an ERC-20, so a taker who holds none has to get some; this replica's faucet is open and the page mints just the shortfall (bond + a tenth, rounded to whole tokens) | [0xee692d1aa5b8…](https://www.okx.com/web3/explorer/xlayer-test/tx/0xee692d1aa5b854703891f03517d8689b4afa8cf10dd3865a56ecad5da96a33d3) |
| 2 | `equity.approve(market, bond)` | the market pulls the bond with `transferFrom`, so the allowance has to exist first — and it has to be **confirmed** before the take, or the take simulates against no allowance and reverts | [0xf5e2fa9cab5c…](https://www.okx.com/web3/explorer/xlayer-test/tx/0xf5e2fa9cab5c39f270b67cb2d47f0b7e6dda00f8e5d1184aa131f524dc1eb5e3) |
| 3 | `market.takeObligation(job, bond)` | the takeover itself: the bond moves into the market, the uncounted units become the taker's to finish at the job's own price | [0xb48a568b6cfb…](https://www.okx.com/web3/explorer/xlayer-test/tx/0xb48a568b6cfb7215962974750408308058a43f25784a1ec8de09204a53abe915) |

That sequence was run three times on the live chain, twice against a local build of the same
commit and once against the **production URL**, by a wallet that had **never held the token**
(deployed for the test, funded with OKB only, `0x52F581F2769c1260Ef7E8B3BC564D43E2227640c`). The
first row in the table is that wallet holding `0 tTSLA`.

Because extensions cannot be driven headlessly, the browser was given an injected EIP-1193
provider backed by that real key: the app signed through `eth_sendTransaction` and the chain
confirmed it. **The UI's own success message is not the evidence — the receipts are:**

| job | the three steps, in order | blocks |
|---|---|---|
| 4 (local build) | mint [`0xee692d1a…`](https://www.okx.com/web3/explorer/xlayer-test/tx/0xee692d1aa5b854703891f03517d8689b4afa8cf10dd3865a56ecad5da96a33d3) → approve [`0xf5e2fa9c…`](https://www.okx.com/web3/explorer/xlayer-test/tx/0xf5e2fa9cab5c39f270b67cb2d47f0b7e6dda00f8e5d1184aa131f524dc1eb5e3) → take [`0xb48a568b…`](https://www.okx.com/web3/explorer/xlayer-test/tx/0xb48a568b6cfb7215962974750408308058a43f25784a1ec8de09204a53abe915) | 41873003 / 41873006 / 41873008 |
| 5 (local build) | mint [`0xdf67ae98…`](https://www.okx.com/web3/explorer/xlayer-test/tx/0xdf67ae989df9d515c1fd07c6d9b075eefe59bf54794c3c1d06e32ddb742be27f) → approve [`0x98b6a4b0…`](https://www.okx.com/web3/explorer/xlayer-test/tx/0x98b6a4b0992b51d06bcd0304a02faf3f83b346fbeff3b862b2017f61fc5a1c50) → take [`0x4c2ce93a…`](https://www.okx.com/web3/explorer/xlayer-test/tx/0x4c2ce93a2feb3d9bdf4c6017cfe03f7b65a186c6559acef0346fb329ad1f8157) | 41873085 / 41873086 / 41873088 |
| 6 (production URL) | mint [`0xa0460977…`](https://www.okx.com/web3/explorer/xlayer-test/tx/0xa0460977de97a32342159245962fed1a6e8abc9cecf998ed65c5be6ccc8de75f) → approve [`0xe009411b…`](https://www.okx.com/web3/explorer/xlayer-test/tx/0xe009411bb92feaafa6d6c751fea8585e119e68bbe39d97bda5a34d7e97ef4870) → take [`0xfe287471…`](https://www.okx.com/web3/explorer/xlayer-test/tx/0xfe287471f12dc25cc2280f1d364db1ba37a32738709f6a54084220a7308c78b0) | 41873184 / 41873187 / 41873189 |

The listings those takes consumed were opened the same way job 3's was — create, stall, list, by
the buyer and executor of this market:

| job | createJob | declareStalled | listObligation |
|---|---|---|---|
| 4 | [`0x35c9fef4…`](https://www.okx.com/web3/explorer/xlayer-test/tx/0x35c9fef49c20ea0c5ee59a47500a8a8b0b3602c9a5f963a705f1b457bca1d160) | [`0x17797417…`](https://www.okx.com/web3/explorer/xlayer-test/tx/0x17797417d51a5337b4100f69be056c436cd1423f8e8cfb114edd8eb5ac5b09bb) | [`0x7c535433…`](https://www.okx.com/web3/explorer/xlayer-test/tx/0x7c535433b5a5407e48dd471572980ad1928bfd1b12b9d53066dab504d6bed4df) |
| 5 | [`0x49b97e49…`](https://www.okx.com/web3/explorer/xlayer-test/tx/0x49b97e49a3ee25f470250ac527722d8108160aec0832c2e60582dfdd838151b6) | [`0x7b837f86…`](https://www.okx.com/web3/explorer/xlayer-test/tx/0x7b837f86a23946a7609d9f6dba78b5cb861b73bf14524560f4f304639d72b40b) | [`0x85996869…`](https://www.okx.com/web3/explorer/xlayer-test/tx/0x85996869bc608fda744701d523188cd2470bfd2314b8c428f64309d52309fe5a) |
| 6 | [`0x95918915…`](https://www.okx.com/web3/explorer/xlayer-test/tx/0x95918915505852edff741b43d81d72a3174b456d4ca129b1d31cf1c78f319c4a) | [`0x387f0184…`](https://www.okx.com/web3/explorer/xlayer-test/tx/0x387f0184726ea0c24d67ed1ade65c358751f04791e404ef74653a8e34dde3417) | [`0x96dadeee…`](https://www.okx.com/web3/explorer/xlayer-test/tx/0x96dadeee41381bc86cf61846d662cd33e7c1e196bd4e7c20a92e672584e10b17) |

What the app can and cannot do with this market, stated exactly:

- **can**: read it without a wallet, and sign a takeover of any listed obligation — mint if short,
  approve, take — with each step's confirmation and explorer link shown, and the table above the
  button re-read on the server so the row stops saying `Listed` the moment it is taken.
- **cannot**: create, count, stall, list or close from the page. Those are
  `script/TokenMarket.s.sol` and the scripts under `script/`, because one signed action is the
  honest surface for a market whose entire lifecycle is already proven in tests; a control room
  would be interface, not capability.

One more thing the test caught: on the first run the table above the button still read `Listed`
after a successful take, because that table is server-rendered and nothing asked the server again.
The client now refreshes the route on a confirmed write, and the second run showed `Taken` in
place. It is the kind of bug only a real signed transaction in a real browser finds.
