#!/usr/bin/env python3
"""verify_source.py — proves the deployed bytecode is the source in this repository.

Reading the contract tells you what it does. This answers the other question: is the code
running on chain actually the code in `src/`? Sourcify rebuilds the sources in this repo and
compares them against the deployed bytecode, for creation and runtime separately, and it
works on X Layer testnet without an account, an API key, or a paid plan.

No key, no credential, no trust in this repository: every line below is an HTTP read of
Sourcify's public API for the addresses named below.

    python3 verify_source.py
"""
import json
import sys
import urllib.request

CHAIN = "1952"
CONTRACTS = [
    ("Spectral", "0x2899EB0972F86cC90d054d19a5816233d9Af56D9"),
    ("SpectralToken", "0x232a35C819BEcf3D10eA24Aa3E7F9aC616B287B5"),
    ("TestnetEquity", "0x7E7789c15E2792798176533d8843935947732b3C"),
    ("SpectralToken (USD)", "0x0fdaa54f00475b87f9a389a84b639b8a21e9406e"),
]
GOOD = ("exact_match", "match")
API = "https://sourcify.dev/server/v2/contract/{chain}/{address}"


def fetch(url):
    with urllib.request.urlopen(url, timeout=30) as r:
        return json.load(r)


results = []
for name, address in CONTRACTS:
    url = API.format(chain=CHAIN, address=address)
    try:
        d = fetch(url)
    except Exception as e:  # noqa: BLE001 — any failure is a failed check, reported as such
        results.append((name, False, f"no answer from Sourcify: {e}"))
        print(f"  {name:14s} UNVERIFIED — {e}")
        continue

    match = d.get("match")
    creation = d.get("creationMatch")
    runtime = d.get("runtimeMatch")
    ok = (match in GOOD) and (creation in GOOD) and (runtime in GOOD)
    results.append(
        (
            name,
            ok,
            f"{match} (creation {creation}, runtime {runtime}) verified {d.get('verifiedAt')} · {url}",
        )
    )
    print(f"  {name:14s} {address}  {match}")

print()
for name, ok, detail in results:
    print(f"  [{'PASS' if ok else 'FAIL'}] {name}: {detail}")

passed = sum(1 for _, ok, _ in results if ok)
print(f"\n{passed}/{len(results)} deployed contracts rebuilt from source and matched")
sys.exit(0 if passed == len(results) else 1)
