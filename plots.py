"""Generate figures for the loggerhead analysis (English labels for glyph safety)."""
import json
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.colors import LogNorm
from shapely.geometry import shape

EXT = [-7, 33, 30, 45]  # lon_min, lon_max, lat_min, lat_max
plt.rcParams.update({"figure.dpi": 130, "font.size": 10, "axes.titlesize": 12})

df = pd.read_csv("loggerhead_filtered.csv")
df["eventDate"] = pd.to_datetime(df["eventDate"], utc=True)
per = pd.read_csv("per_individual.csv")
grid = pd.read_csv("hotspots.csv")
F = json.load(open("findings.json"))

# coastline segments
coast = json.load(open("ne_50m_coastline.geojson"))
segs = []
for ft in coast["features"]:
    g = shape(ft["geometry"])
    if g.geom_type == "LineString":
        segs.append(np.array(g.coords))
    else:
        for part in g.geoms:
            segs.append(np.array(part.coords))

def draw_coast(ax, color="0.55", lw=0.5):
    for s in segs:
        ax.plot(s[:, 0], s[:, 1], color=color, lw=lw, zorder=1)
    ax.set_xlim(EXT[0], EXT[1]); ax.set_ylim(EXT[2], EXT[3])
    ax.set_xlabel("Longitude"); ax.set_ylabel("Latitude")
    ax.set_aspect(1 / np.cos(np.deg2rad(37.5)))

# land polygons — used to fill land and to suppress track segments that cross it
# (a loggerhead cannot swim over land, so a straight line between two fixes that
#  crosses land is an artifact of connecting the dots, not a real path)
from shapely.geometry import LineString, box
from shapely.ops import unary_union
from shapely.prepared import prep
from pyproj import Geod
GEOD = Geod(ellps="WGS84")

EXTBOX = box(EXT[0], EXT[2], EXT[1], EXT[3])
_admin = json.load(open("ne_50m_admin_0_countries.geojson"))
_land_polys = []
for ft in _admin["features"]:
    g = shape(ft["geometry"]).buffer(0).intersection(EXTBOX)
    if not g.is_empty:
        _land_polys.append(g)
land_prep = prep(unary_union(_land_polys))

def _poly_xy(geom):
    if geom.geom_type == "Polygon":
        return [np.array(geom.exterior.coords)]
    if geom.geom_type in ("MultiPolygon", "GeometryCollection"):
        out = []
        for p in geom.geoms:
            out += _poly_xy(p)
        return out
    return []

def draw_land(ax, fc="#e7e1d3", ec="#b7ad95", lw=0.4):
    for geom in _land_polys:
        for xy in _poly_xy(geom):
            ax.fill(xy[:, 0], xy[:, 1], facecolor=fc, edgecolor=ec, lw=lw, zorder=1)

def _draw_seg(ax, xs, ys, color):
    if len(xs) >= 2:
        ax.plot(xs, ys, lw=0.8, alpha=0.85, color=color, zorder=3, solid_capstyle="round")

OCEAN = "#eaf3fb"
BAR = "#2b6d9c"

def style_chart(ax, grid_axis="y"):
    ax.spines[["top", "right"]].set_visible(False)
    ax.grid(axis=grid_axis, color="0.88", lw=0.6, zorder=0)
    ax.set_axisbelow(True)

# ---------------------------------------------------------------- 1. tracks
fig, ax = plt.subplots(figsize=(9, 5.2))
ax.set_facecolor("#eaf3fb")          # ocean
draw_land(ax)                         # filled land so over-land lines are obvious/absent
inds = df["individual"].unique()
cmap = plt.colormaps["turbo"]
MAX_GAP = np.timedelta64(5, "D")      # break the line across time gaps longer than 5 days
MAX_STEP_KM = 150.0                    # break straight jumps longer than 150 km (missing data, not a real path)
n_drop_land = n_drop_gap = n_drop_far = 0
for i, ind in enumerate(inds):
    g = df[df["individual"] == ind].sort_values("eventDate")
    lon = g["lon"].to_numpy(); lat = g["lat"].to_numpy(); t = g["eventDate"].to_numpy()
    col = cmap(i / max(1, len(inds) - 1))
    xs = [lon[0]]; ys = [lat[0]]
    for k in range(1, len(lon)):
        gap = (t[k] - t[k - 1]) > MAX_GAP
        far = GEOD.inv(lon[k - 1], lat[k - 1], lon[k], lat[k])[2] / 1000.0 > MAX_STEP_KM
        crosses = land_prep.intersects(LineString([(lon[k - 1], lat[k - 1]), (lon[k], lat[k])]))
        if gap or far or crosses:
            _draw_seg(ax, xs, ys, col)
            xs = [lon[k]]; ys = [lat[k]]
            n_drop_gap += gap; n_drop_far += (far and not gap); n_drop_land += (crosses and not gap and not far)
        else:
            xs.append(lon[k]); ys.append(lat[k])
    _draw_seg(ax, xs, ys, col)
ax.set_xlim(EXT[0], EXT[1]); ax.set_ylim(EXT[2], EXT[3])
ax.set_xlabel("Longitude"); ax.set_ylabel("Latitude")
ax.set_aspect(1 / np.cos(np.deg2rad(37.5)))
ax.set_title(f"Western-Mediterranean loggerhead tracks (n={F['n_individuals']} turtles, "
             f"{len(df):,} at-sea fixes, 2016-2018)")
fig.tight_layout(); fig.savefig("fig_tracks.png"); plt.close(fig)
print(f"tracks: broke {n_drop_land} land-crossing + {n_drop_far} long-jump + {n_drop_gap} gap segments")

# ---------------------------------------------------------------- 2. density hotspots
CELL = 0.25
lon_edges = np.arange(EXT[0], EXT[1] + CELL, CELL)
lat_edges = np.arange(EXT[2], EXT[3] + CELL, CELL)
H, _, _ = np.histogram2d(df["lon"], df["lat"], bins=[lon_edges, lat_edges])
Hm = np.ma.masked_where(H.T == 0, H.T)
fig, ax = plt.subplots(figsize=(9, 5.2))
ax.set_facecolor(OCEAN)
draw_land(ax)
pc = ax.pcolormesh(lon_edges, lat_edges, Hm, cmap="hot_r", norm=LogNorm(vmin=1, vmax=H.max()), zorder=2)
draw_coast(ax, color="0.35", lw=0.4)
cb = fig.colorbar(pc, ax=ax, shrink=0.85); cb.set_label("fixes per 0.25 deg cell (log)")
top = grid.iloc[0]
ax.scatter([top["glon"] + CELL / 2], [top["glat"] + CELL / 2], s=90, facecolors="none",
           edgecolors="cyan", lw=1.6, zorder=4, label="busiest cell")
ax.legend(loc="upper right", fontsize=8)
ax.set_title("Aggregation hotspots — candidate priority cells for protection")
fig.tight_layout(); fig.savefig("fig_hotspots.png"); plt.close(fig)

# ---------------------------------------------------------------- 3. EEZ usage bar
jc = df["jurisdiction"].value_counts()
fig, ax = plt.subplots(figsize=(7.5, 4.2))
ax.barh(jc.index[::-1], jc.values[::-1], color=BAR)
ax.set_xlabel("number of fixes"); ax.set_title("Fixes by national jurisdiction (EEZ proxy, nearest country <=200 nm)")
for y, v in enumerate(jc.values[::-1]):
    ax.text(v + jc.max() * 0.01, y, f"{v:,}", va="center", fontsize=8)
style_chart(ax, "x")
fig.tight_layout(); fig.savefig("fig_eez.png"); plt.close(fig)

# ---------------------------------------------------------------- 4. SST preference
sst = df["sst"].dropna()
fig, ax = plt.subplots(figsize=(7.5, 4.2))
ax.hist(sst, bins=np.arange(np.floor(sst.min()), np.ceil(sst.max()) + 1, 0.5),
        color=BAR, edgecolor="white", zorder=2)
ax.axvspan(18, 26, color="orange", alpha=0.15, label="18-26 C preference band", zorder=1)
ax.axvline(sst.median(), color="#c0392b", lw=1.4, ls="--", label=f"median {sst.median():.1f} C", zorder=3)
ax.set_xlabel("sea-surface temperature at fix (C)"); ax.set_ylabel("number of fixes")
ax.set_title(f"SST at turtle locations — {F['sst_pct_in_18_26C']}% within 18-26 C")
ax.set_xlim(sst.min() - 0.5, sst.max() + 0.5)
style_chart(ax, "y"); ax.legend(fontsize=8, framealpha=0.9)
fig.tight_layout(); fig.savefig("fig_sst.png"); plt.close(fig)

# ---------------------------------------------------------------- 5. countries per individual
fig, ax = plt.subplots(figsize=(7.5, 4.2))
vc = per["n_countries_eez"].value_counts().sort_index()
ax.bar(vc.index, vc.values, color=BAR, edgecolor="white", zorder=2)
for x, v in zip(vc.index, vc.values):
    ax.text(x, v + 0.15, str(int(v)), ha="center", va="bottom", fontsize=8)
ax.set_xlabel("number of distinct national EEZs an individual used")
ax.set_ylabel("number of turtles")
ax.set_title("Most individuals cross several jurisdictions (median "
             f"{int(per['n_countries_eez'].median())}, max {int(per['n_countries_eez'].max())})")
ax.set_xticks(range(int(per["n_countries_eez"].max()) + 1))
style_chart(ax, "y")
fig.tight_layout(); fig.savefig("fig_countries.png"); plt.close(fig)

print("wrote: fig_tracks.png, fig_hotspots.png, fig_eez.png, fig_sst.png, fig_countries.png")
