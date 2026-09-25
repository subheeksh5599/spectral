# Source verification — is the deployed bytecode the code in `src/`?

Reading the contract tells you what it does. This answers the other question, and it is the
one that a reader cannot answer by reading: **is the code running on chain the code in this
repository?**

Verified on **Sourcify**, which rebuilds the sources in this repository and compares them to
the bytecode actually deployed — creation and runtime separately. It is free, needs no
account, no API key and no paid plan, and it supports X Layer testnet (chain 1952), which is
why it is the route taken here.

## Result — 2026-09-25

| Contract | Address | Match | Creation | Runtime | Match ID |
|---|---|---|---|---|---|
| `Spectral` | `0x2899EB0972F86cC90d054d19a5816233d9Af56D9` | `match` | `match` | `match` | 52236721 |
| `SpectralToken` | `0x232a35C819BEcf3D10eA24Aa3E7F9aC616B287B5` | `exact_match` | `exact_match` | `exact_match` | 52236800 |
| `TestnetEquity` | `0x7E7789c15E2792798176533d8843935947732b3C` | `exact_match` | `exact_match` | `exact_match` | 52236822 |
| `SpectralToken` (the dollar market) | `0x0fdaa54F00475b87f9A389a84b639B8a21e9406e` | `exact_match` | `exact_match` | `exact_match` | 52289156 |

`exact_match` is the stronger of the two levels: every source file, every metadata field and
every compilation setting matched. `match` means the compiled result is functionally identical
with a non-identical metadata hash.

## Re-check it without trusting this file

```bash
$ python3 verify_source.py

  Spectral       0x2899EB0972F86cC90d054d19a5816233d9Af56D9  match
  SpectralToken  0x232a35C819BEcf3D10eA24Aa3E7F9aC616B287B5  exact_match
  TestnetEquity  0x7E7789c15E2792798176533d8843935947732b3C  exact_match
  SpectralToken (USD) 0x0fdaa54f00475b87f9a389a84b639b8a21e9406e  exact_match

4/4 deployed contracts rebuilt from source and matched
```

The script holds no key and reads nothing from this repository: it queries Sourcify's public
API for each address and fails if any match level is not one of `match` / `exact_match`. The
same answers are available directly:

```bash
curl -s https://sourcify.dev/server/v2/contract/1952/0x232a35C819BEcf3D10eA24Aa3E7F9aC616B287B5
# {"matchId":"52236800","creationMatch":"exact_match","runtimeMatch":"exact_match",
#  "verifiedAt":"2026-09-25T10:02:51Z","match":"exact_match","chainId":"1952","address":"0x23…"}
```

## How each one was submitted

```bash
forge verify-contract 0x2899EB0972F86cC90d054d19a5816233d9Af56D9 \
  src/Spectral.sol:Spectral --verifier sourcify --chain 1952 --watch

forge verify-contract 0x232a35C819BEcf3D10eA24Aa3E7F9aC616B287B5 \
  src/SpectralToken.sol:SpectralToken --verifier sourcify --chain 1952 --watch

forge verify-contract 0x7E7789c15E2792798176533d8843935947732b3C \
  src/TestnetEquity.sol:TestnetEquity --verifier sourcify --chain 1952 --watch

# the market that escrows a token this build did not deploy: the constructor argument is the
# asset's address, and it is the only difference in the submission
forge verify-contract 0x0fdaa54F00475b87f9A389a84b639B8a21e9406e \
  src/SpectralToken.sol:SpectralToken --verifier sourcify --chain 1952 \
  --constructor-args $(cast abi-encode "constructor(address)" 0x9e29b3aada05bf2d2c827af80bd28dc0b9b4fb0c) --watch
```

Nothing is patched, flattened or hand-edited for verification: `foundry.toml` is the same
configuration that produced the deployed bytecode, and the sources submitted are the files in
`src/`.

## What is still not done, said plainly

- **OKX's own explorer verification is not done.** Its verification route is gated behind a
  paid plan and no such credential exists in this build, so the explorer shows the contract
  unverified. That is a gap in presentation, not in evidence: the bytecode is matched to the
  source by Sourcify above, and every claim about behaviour is re-derived from the chain by
  `verify.py` and `verify_token.py`.
- **The token's source is verified; the token's value is not a claim in any direction.** It
  is a replica with an open faucet. Verification says the code is this code; it says nothing
  about the asset, which is worth nothing and is documented as worth nothing.
- **Verification is not an audit.** It proves the shipped code is the reviewed code. Nobody
  outside this project has reviewed it.
