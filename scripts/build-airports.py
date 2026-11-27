"""Builds packages/core/src/airports.data.ts from the OurAirports list.

OurAirports is public domain: https://ourairports.com/data/
Download airports.csv from there, then run from the repo root:

    uv run scripts/build-airports.py path/to/airports.csv

Kept: airports in the lower 48 states with scheduled airline service.
"""

import csv
import json
import sys
from pathlib import Path

SIZES = {"large_airport": 3, "medium_airport": 2, "small_airport": 1}
SKIP_REGIONS = {"US-AK", "US-HI"}
OUT = Path(__file__).resolve().parent.parent / "packages/core/src/airports.data.ts"


def main(source: str) -> None:
    with open(source, encoding="utf-8") as file:
        rows = list(csv.DictReader(file))

    kept = []
    for row in rows:
        if row["iso_country"] != "US" or row["iso_region"] in SKIP_REGIONS:
            continue
        if row["scheduled_service"] != "yes" or not row["iata_code"]:
            continue
        if row["type"] not in SIZES:
            continue
        kept.append(
            [
                row["iata_code"],
                row["name"],
                row["municipality"],
                row["iso_region"].removeprefix("US-"),
                round(float(row["latitude_deg"]), 4),
                round(float(row["longitude_deg"]), 4),
                SIZES[row["type"]],
            ]
        )
    kept.sort(key=lambda entry: entry[0])

    lines = [
        "// Made by scripts/build-airports.py from the public-domain OurAirports",
        "// list. Do not edit by hand: run the script again.",
        "// Each row: code, name, city, state, latitude, longitude, size (1 to 3).",
        "export const AIRPORT_ROWS: [",
        "  string,",
        "  string,",
        "  string,",
        "  string,",
        "  number,",
        "  number,",
        "  number,",
        "][] = [",
    ]
    lines += [f"  {json.dumps(entry, ensure_ascii=False)}," for entry in kept]
    lines += ["];", ""]
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"{len(kept)} airports written to {OUT}")


if __name__ == "__main__":
    main(sys.argv[1])
