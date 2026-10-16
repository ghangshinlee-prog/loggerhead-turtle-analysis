"""Download the full OBIS loggerhead western-Mediterranean dataset and parse to a clean CSV.

Dataset: e69a5cc7-2c7d-4ef7-8662-a68a326bddad
"Satellite-tracking of loggerhead sea turtles tracked from western Mediterranean"
occurrenceID encodes: {individual}_{tagtype}_{tagid}_{tsZ}_{lon}_{lat}_{argosClass}_Caretta_caretta
"""
import requests, csv, re, sys, time

DATASET = "e69a5cc7-2c7d-4ef7-8662-a68a326bddad"
BASE = "https://api.obis.org/v3/occurrence"
FIELDS = ["id", "occurrenceID", "eventDate", "decimalLatitude", "decimalLongitude",
          "sst", "sss", "bathymetry", "shoredistance"]

# Argos location classes ranked best->worst (3,2,1,0 are nominal-accuracy; A,B,Z are unestimated; Z = invalid)
ARGOS = {"3", "2", "1", "0", "A", "B", "Z"}


def parse_occid(occid):
    """Return (individual, tagtype, tagid, argos_class) from the occurrenceID."""
    # strip trailing _Caretta_caretta
    s = re.sub(r"_Caretta_caretta$", "", occid)
    parts = s.split("_")
    # last token is the argos class letter/number
    argos = parts[-1] if parts[-1] in ARGOS else ""
    individual = parts[0]
    tagtype = parts[1] if len(parts) > 1 else ""
    tagid = parts[2] if len(parts) > 2 else ""
    return individual, tagtype, tagid, argos


def fetch_all():
    rows = []
    after = None
    session = requests.Session()
    total = None
    while True:
        params = {"datasetid": DATASET, "size": 5000}  # full records (fields= drops derived sst/sss)
        if after:
            params["after"] = after
        for attempt in range(4):
            try:
                r = session.get(BASE, params=params, timeout=60)
                r.raise_for_status()
                break
            except Exception as e:
                if attempt == 3:
                    raise
                time.sleep(2 * (attempt + 1))
        data = r.json()
        if total is None:
            total = data.get("total")
        results = data.get("results", [])
        if not results:
            break
        rows.extend(results)
        after = results[-1]["id"]
        print(f"  fetched {len(rows)}/{total}", file=sys.stderr)
        if len(rows) >= total:
            break
    return rows


def main():
    raw = fetch_all()
    out = "loggerhead_clean.csv"
    cols = ["individual", "tagtype", "tagid", "argos", "eventDate",
            "lat", "lon", "sst", "sss", "bathymetry", "shoredistance", "occurrenceID"]
    n = 0
    with open(out, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(cols)
        for rec in raw:
            occid = rec.get("occurrenceID", "")
            ind, tt, tid, argos = parse_occid(occid)
            w.writerow([ind, tt, tid, argos,
                        rec.get("eventDate"), rec.get("decimalLatitude"),
                        rec.get("decimalLongitude"), rec.get("sst"), rec.get("sss"),
                        rec.get("bathymetry"), rec.get("shoredistance"), occid])
            n += 1
    print(f"WROTE {n} rows -> {out}")


if __name__ == "__main__":
    main()
