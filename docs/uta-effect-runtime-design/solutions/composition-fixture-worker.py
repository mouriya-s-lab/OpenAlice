#!/usr/bin/env python3
"""Small local UTA conformance worker; no credentials, network, or broker calls."""

import json
import sys
import time


def candle(instrument: str, index: int, invalid: bool) -> dict[str, object]:
    if invalid:
        return {"instrument": instrument, "openedAt": index}
    price = 100.0 + index
    return {
        "instrument": {"nativeId": "python-fixture-btc", "symbol": instrument},
        "interval": "5m",
        "openedAt": 1757000000000 + index * 300000,
        "temporalProjection": {
            "tag": "unknown",
            "reason": "fixture has no provider temporal-boundary evidence",
        },
        "open": price,
        "high": price + 1.0,
        "low": price - 1.0,
        "close": price + 0.5,
        "volume": {
            "tag": "present",
            "amount": "3.25",
            "measure": {
                "basis": "traded-quantity",
                "unit": "instrument-native",
                "evidence": {
                    "tag": "local-observation",
                    "operation": "python-fixture-worker.volume",
                    "version": "1",
                    "sourceEvidence": {
                        "tag": "known",
                        "identity": "composition-fixture-worker",
                    },
                },
            },
        },
        "finality": (
            {"tag": "unknown", "reason": "fixture has no provider closure proof"}
            if index % 2 == 0
            else {"tag": "open"}
        ),
        "revision": {"tag": "original"},
        "evidence": {
            "tag": "local-observation",
            "operation": "python-fixture-worker.candle",
            "version": "1",
            "sourceEvidence": {
                "tag": "known",
                "identity": "composition-fixture-worker",
            },
        },
        "vwap": price + 0.25,
        "tradeCount": index + 1,
        "session": {"tag": "regular"},
        "correction": {"tag": "none"},
    }


def main() -> None:
    for line in sys.stdin:
        request = json.loads(line)
        instrument = request["instrument"]
        count = request["count"]
        invalid = request["mode"] == "invalid-output"
        index = 0
        while count is None or index < count:
            frame = {"sequence": index, "value": candle(instrument, index, invalid)}
            sys.stdout.write(json.dumps(frame, separators=(",", ":")) + "\n")
            sys.stdout.flush()
            index += 1
            time.sleep(0.02)


if __name__ == "__main__":
    main()
