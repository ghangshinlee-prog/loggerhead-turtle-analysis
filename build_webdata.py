"""Build compact JSON payloads for the interactive storyline map."""
import json
import numpy as np
import pandas as pd
from shapely.geometry import shape, box, mapping

REGION = box(-10, 30, 32, 46)        # lon/lat window for the Mediterranean scene
MAXPTS = 160                          # downsample cap per individual (smooth animation, small file)

# ---------------- tracks ----------------
df = pd.read_csv("loggerhead_filtered.csv")
df["eventDate"] = pd.to_datetime(df["eventDate"], utc=True)
per = pd.read_csv("per_individual.csv").set_index("individual")

def downsample(g, n):
    if len(g) <= n:
        return g
    idx = np.linspace(0, len(g) - 1, n).round().astype(int)
    return g.iloc[np.unique(idx)]

tracks = []
for ind, g in df.groupby("individual"):
    g = g.sort_values("eventDate")
    g = downsample(g, MAXPTS)
    pts = [[round(float(la), 4), round(float(lo), 4)] for la, lo in zip(g["lat"], g["lon"])]
    juris = g["jurisdiction"].tolist()
    sst = [None if pd.isna(s) else round(float(s), 1) for s in g["sst"]]
    dates = [d.strftime("%Y-%m-%d") for d in g["eventDate"]]
    info = per.loc[ind] if ind in per.index else None
    tracks.append({
        "id": ind,
        "pts": pts,
        "juris": juris,
        "sst": sst,
        "dates": dates,
        "path_km": float(info["path_km"]) if info is not None else None,
        "n_countries": int(info["n_countries_eez"]) if info is not None else None,
        "countries": (info["countries_eez"] if info is not None else ""),
        "days": float(info["days_tracked"]) if info is not None else None,
    })

# order: longest journeys first
tracks.sort(key=lambda t: -(t["path_km"] or 0))

# ---------------- country borders (simplified) ----------------
countries = json.load(open("ne_50m_admin_0_countries.geojson"))
feats, labels = [], []
for ft in countries["features"]:
    g = shape(ft["geometry"])
    if not g.intersects(REGION):
        continue
    clip = g.intersection(REGION.buffer(2))
    if clip.is_empty:
        continue
    simp = clip.simplify(0.03, preserve_topology=True)
    name = ft["properties"]["ADMIN"]
    feats.append({"type": "Feature", "properties": {"name": name}, "geometry": mapping(simp)})
    # label point = representative point of largest part within region
    rp = clip.intersection(REGION).representative_point() if clip.intersects(REGION) else clip.representative_point()
    labels.append({"name": name, "lat": round(rp.y, 3), "lon": round(rp.x, 3)})

borders = {"type": "FeatureCollection", "features": feats}

# ---------------- hotspots (top cells) ----------------
grid = pd.read_csv("hotspots.csv").head(40)
hot = [{"lat": round(r.glat + 0.125, 3), "lon": round(r.glon + 0.125, 3),
        "n": int(r.n), "ni": int(r.n_ind)} for r in grid.itertuples()]

F = json.load(open("findings.json"))

payload = {"tracks": tracks, "borders": borders, "labels": labels, "hot": hot, "findings": F}
json.dump(payload, open("webdata.json", "w"), ensure_ascii=False, separators=(",", ":"))
import os
print("tracks:", len(tracks), "| borders:", len(feats), "| hotspots:", len(hot),
      "| webdata.json:", round(os.path.getsize("webdata.json") / 1024, 1), "KB")
print("longest 6:", [(t["id"], round(t["path_km"]), t["n_countries"]) for t in tracks[:6]])
