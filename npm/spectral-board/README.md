# spectral-board

Read an obligation market straight from the chain: **who is owed what when a job stopped halfway.**

Most work systems answer *is the job done?* A job that stalls halfway has no representation for the
work already finished, so it is either refunded whole or argued over. A Spectral market counts the
finished units, lists the remainder, prices it by whoever takes it, bonds it, and settles by
arithmetic. Nobody votes and no key exists that can move the money.

This package is the read side of that, and nothing else. It holds no key, signs nothing, writes
nothing, and needs no login. It is the same reader the venue's `GET /api/board` uses, lifted out of
the app so a terminal, a script or an agent can ask the contract directly.

## Use

```bash
npx spectral-board                    # the native-value market, live on X Layer testnet
npx spectral-board --market token      # the ERC-20 market (tTSLA, a replica with an open faucet)
npx spectral-board --market usd        # the market denominated in the chain's own testnet dollar
npx spectral-board --state Listed      # only the remainders anyone can take over
npx spectral-board --job 6             # one job
npx spectral-board --json              # the whole board, machine-readable
```

```
X Layer testnet · native market · 0x2899eb0972f86cc90d054d19a5816233d9af56d9
6 job(s) · 21/42 units counted · 2 live · 0.01 OKB still locked · block 41879528

  id  state     counted   remaining   escrow            bond to take    takeable
   6  Listed     0/10        10            0.01 OKB        0.005 OKB   yes
   5  Settled    3/3          0          0.0015 OKB            0 OKB   no
   4  Open       0/3          3               0 OKB            0 OKB   no
   3  Closed     1/6          5           0.003 OKB            0 OKB   no
   2  Closed     7/10         3            0.01 OKB            0 OKB   no
   1  Settled   10/10         0            0.01 OKB            0 OKB   no
```

That is one real read, copied out of a terminal — the block number grows every block, and every
amount here is the contract's answer, not arithmetic done by this package.

`--json` prints the same read with the raw integer alongside every amount (`wei`), so nothing is
rounded away, and each job carries its buyer, executor, taker, deadlines and per-unit price.

## Your own deployment

```bash
npx spectral-board --rpc https://your-rpc --venue 0xYourMarket [--symbol TOKEN] [--decimals 6]
```

The defaults above are the project's own testnet deployments and are declared in
`lib/markets.json`; `--list-markets` prints them. A market is read through the ABI in `lib/abi.json`
— `jobCount()`, `jobs(uint256)`, `remainingUnits(uint256)`, `requiredBond(uint256)` — so any
deployment of the same contract works here. On the defaults the amount divisor is read from the
escrowed asset itself rather than assumed: the replica answers `18` and the dollar answers `6`, and
`--market usd` divides by the second because the asset says so. Divide by the wrong one and five
dollars reads `0.000000000005` — off by a trillion, which is why the divisor is a read and not a
constant.

## Exit codes

`0` read OK · `2` read failed (and `--help` exits `0`), so this is safe in a script.

## License

MIT.
