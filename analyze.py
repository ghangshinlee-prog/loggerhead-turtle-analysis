"""Spatial + environmental analysis of the OBIS western-Mediterranean loggerhead dataset.

Outputs:
  loggerhead_filtered.csv   quality-filtered fixes with jurisdiction label
  per_individual.csv        per-turtle summary
  hotspots.csv              top density grid cells
  findings.json             headline numbers used in the write-up
"""
import json, math, sys
import numpy as np
import pandas as pd
from pyproj import Geod
from shapely.geometry import shape, Point
from shapely.ops import nearest_points
from shapely import STRtree

GEOD = Geod(ellps="WGS84")
EEZ_NM = 200.0
EEZ_M = EEZ_NM * 1852.0          # 200 nautical miles in metres
MAX_SPEED_KMH = 10.0             # plausible sustained loggerhead travel speed ceiling
DROP_CLASSES = {"Z"}             # Argos Z = invalid/unusable location

# ---------------------------------------------------------------- load
df = pd.read_csv("loggerhead_clean.csv")
df["eventDate"] = pd.to_datetime(df["eventDate"], utc=True, errors="coerce")
df = df.dropna(subset=["lat", "lon", "eventDate"])
n_raw = len(df)

# ---------------------------------------------------------------- country polygons
countries = json.load(open("ne_50m_admin_0_countries.geojson"))
geoms, names = [], []
for ft in countries["features"]:
    geoms.append(shape(ft["geometry"]))
    names.append(ft["properties"]["ADMIN"])
geoms = np.array(geoms, dtype=object)
names = np.array(names)
tree = STRtree(geoms)

# ---------------------------------------------------------------- filter 1: Argos class
df = df[~df["argos"].isin(DROP_CLASSES)].copy()
n_after_argos = len(df)

# ---------------------------------------------------------------- filter 2: drop on-land fixes
pts = [Point(x, y) for x, y in zip(df["lon"], df["lat"])]
on_land = np.zeros(len(df), dtype=bool)
# query each point for any intersecting country polygon
res = tree.query(pts, predicate="intersects")  # 2xN array [point_idx, geom_idx]
on_land[np.unique(res[0])] = True
df["on_land"] = on_land
df = df[~df["on_land"]].copy().reset_index(drop=True)
n_after_land = len(df)

# ---------------------------------------------------------------- filter 3: per-individual speed filter
def speed_filter(g):
    g = g.sort_values("eventDate")
    lons = g["lon"].to_numpy(); lats = g["lat"].to_numpy()
    times = g["eventDate"].to_numpy()
    keep = np.ones(len(g), dtype=bool)
    last = 0
    for i in range(1, len(g)):
        dt_h = (times[i] - times[last]) / np.timedelta64(1, "h")
        if dt_h <= 0:
            keep[i] = False
            continue
        _, _, dist_m = GEOD.inv(lons[last], lats[last], lons[i], lats[i])
        if (dist_m / 1000.0) / dt_h > MAX_SPEED_KMH:
            keep[i] = False
        else:
            last = i
    g = g[keep]
    return g

df = pd.concat([speed_filter(g) for _, g in df.groupby("individual")], ignore_index=True)
n_after_speed = len(df)

# ---------------------------------------------------------------- jurisdiction (EEZ proxy)
pts = [Point(x, y) for x, y in zip(df["lon"], df["lat"])]
nearest_idx = tree.nearest(pts)             # index into geoms of nearest country
juris = np.empty(len(df), dtype=object)
dist_km = np.empty(len(df))
for i, (p, gi) in enumerate(zip(pts, nearest_idx)):
    poly = geoms[gi]
    np1, np2 = nearest_points(p, poly)
    _, _, d = GEOD.inv(np1.x, np1.y, np2.x, np2.y)
    dist_km[i] = d / 1000.0
    juris[i] = names[gi] if d <= EEZ_M else "High seas (ABNJ)"
df["nearest_country"] = names[nearest_idx]
df["dist_to_shore_km"] = dist_km
df["jurisdiction"] = juris

df.to_csv("loggerhead_filtered.csv", index=False)

# ---------------------------------------------------------------- per-individual summary
def ind_summary(g):
    g = g.sort_values("eventDate")
    lons = g["lon"].to_numpy(); lats = g["lat"].to_numpy()
    # path length
    if len(g) > 1:
        _, _, seg = GEOD.inv(lons[:-1], lats[:-1], lons[1:], lats[1:])
        path_km = np.nansum(seg) / 1000.0
        _, _, disp = GEOD.inv(lons[0], lats[0], lons[-1], lats[-1])
        # max displacement from start
        _, _, dall = GEOD.inv(np.full(len(g), lons[0]), np.full(len(g), lats[0]), lons, lats)
        maxdisp = np.nanmax(dall) / 1000.0
    else:
        path_km = disp = maxdisp = 0.0
    days = (g["eventDate"].max() - g["eventDate"].min()).total_seconds() / 86400.0
    eez = set(g.loc[g["jurisdiction"] != "High seas (ABNJ)", "jurisdiction"])
    return pd.Series({
        "n_fix": len(g),
        "days_tracked": round(days, 1),
        "path_km": round(path_km, 1),
        "max_disp_km": round(maxdisp, 1),
        "n_countries_eez": len(eez),
        "countries_eez": ", ".join(sorted(eez)),
        "uses_high_seas": bool((g["jurisdiction"] == "High seas (ABNJ)").any()),
        "pct_high_seas": round(100.0 * (g["jurisdiction"] == "High seas (ABNJ)").mean(), 1),
        "sst_min": round(np.nanmin(g["sst"]), 1) if g["sst"].notna().any() else None,
        "sst_max": round(np.nanmax(g["sst"]), 1) if g["sst"].notna().any() else None,
    })

per = pd.DataFrame({ind: ind_summary(g) for ind, g in df.groupby("individual")}).T
per.index.name = "individual"
per = per.sort_values("path_km", ascending=False)
per.to_csv("per_individual.csv")

# ---------------------------------------------------------------- density hotspots (0.25 deg grid)
CELL = 0.25
df["glat"] = (np.floor(df["lat"] / CELL) * CELL).round(2)
df["glon"] = (np.floor(df["lon"] / CELL) * CELL).round(2)
grid = (df.groupby(["glat", "glon"])
          .agg(n=("lat", "size"), n_ind=("individual", "nunique"),
               sst=("sst", "mean"))
          .reset_index()
          .sort_values("n", ascending=False))
grid.to_csv("hotspots.csv", index=False)

# ---------------------------------------------------------------- SST preference
sst = df["sst"].dropna()
in_band = ((sst >= 18) & (sst <= 26)).mean() * 100

# ---------------------------------------------------------------- jurisdiction tallies
all_eez = set(df.loc[df["jurisdiction"] != "High seas (ABNJ)", "jurisdiction"])
juris_counts = df["jurisdiction"].value_counts()
ind_high_seas = per["uses_high_seas"].sum()

findings = {
    "n_raw_fixes": int(n_raw),
    "n_after_drop_argosZ": int(n_after_argos),
    "n_after_drop_onland": int(n_after_land),
    "n_after_speedfilter": int(n_after_speed),
    "pct_retained": round(100 * n_after_speed / n_raw, 1),
    "n_individuals": int(df["individual"].nunique()),
    "date_start": str(df["eventDate"].min().date()),
    "date_end": str(df["eventDate"].max().date()),
    "n_countries_eez_total": len(all_eez),
    "countries_eez_total": sorted(all_eez),
    "n_individuals_using_high_seas": int(ind_high_seas),
    "pct_fixes_high_seas": round(100 * (df["jurisdiction"] == "High seas (ABNJ)").mean(), 1),
    "top5_eez_by_fixes": juris_counts.head(6).to_dict(),
    "median_countries_per_individual": float(per["n_countries_eez"].median()),
    "max_countries_one_individual": int(per["n_countries_eez"].max()),
    "median_path_km": round(float(per["path_km"].median()), 1),
    "max_path_km": round(float(per["path_km"].max()), 1),
    "sst_pct_in_18_26C": round(float(in_band), 1),
    "sst_median": round(float(sst.median()), 1),
    "top_hotspot_cell": {"glat": float(grid.iloc[0]["glat"]), "glon": float(grid.iloc[0]["glon"]),
                          "n_fixes": int(grid.iloc[0]["n"]), "n_ind": int(grid.iloc[0]["n_ind"])},
}
json.dump(findings, open("findings.json", "w"), indent=2, ensure_ascii=False)

print("=== FILTERING ===")
print(f"raw {n_raw} -> drop Argos-Z {n_after_argos} -> drop on-land {n_after_land} -> speed-filter {n_after_speed} ({findings['pct_retained']}% kept)")
print("\n=== JURISDICTION (EEZ proxy, nearest country <=200nm) ===")
print(f"distinct national EEZs used: {len(all_eez)} -> {sorted(all_eez)}")
print(f"individuals using high seas (ABNJ): {ind_high_seas}/{df['individual'].nunique()}")
print(f"fixes on high seas: {findings['pct_fixes_high_seas']}%")
print("top zones by fixes:")
print(juris_counts.head(8).to_string())
print("\n=== PER-INDIVIDUAL (countries crossed) ===")
print(f"median countries/individual: {per['n_countries_eez'].median()}, max: {per['n_countries_eez'].max()}")
print(f"median path length: {per['path_km'].median():.0f} km, max: {per['path_km'].max():.0f} km")
print("\n=== SST ===")
print(f"median SST {sst.median():.1f} C; {in_band:.1f}% of fixes within 18-26 C")
print("\n=== TOP HOTSPOT CELLS (0.25deg) ===")
print(grid.head(8)[["glat","glon","n","n_ind"]].to_string(index=False))
print("\nwrote: loggerhead_filtered.csv, per_individual.csv, hotspots.csv, findings.json")
