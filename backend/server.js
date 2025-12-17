import express from "express";
import fetch from "node-fetch";
import cors from "cors";

/* ------------------------------------
   Distance (Haversine) in meters
------------------------------------ */
function distance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ------------------------------------
   App setup
------------------------------------ */
const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;

/* ------------------------------------
   STRICT NEARBY PLACES API
------------------------------------ */
app.get("/places", async (req, res) => {
  try {
    const {
      query = "cafe",
      lat = "28.6139",
      lng = "77.2090",
      limit = 20,
    } = req.query;

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    // 🔹 STRICT radius (~5km)
    const delta = 0.05;

    const viewbox = [
      longitude - delta,
      latitude + delta,
      longitude + delta,
      latitude - delta,
    ].join(",");

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query
    )}&viewbox=${viewbox}&bounded=1&limit=50`;

    console.log("🔍 Nominatim URL:", url);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Smart-Places-App/1.0 (education)",
        Accept: "application/json",
      },
    });

    const data = await response.json();

    // 🔹 FINAL distance filtering (≤ 5km)
    const results = data
      .map((p) => {
        const dist = distance(
          latitude,
          longitude,
          parseFloat(p.lat),
          parseFloat(p.lon)
        );

        return {
          id: p.place_id,
          name: p.display_name,
          lat: parseFloat(p.lat),
          lng: parseFloat(p.lon),
          distance: dist,
        };
      })
      .filter((p) => p.distance <= 5000) // 🚫 remove far places
      .sort((a, b) => a.distance - b.distance)
      .slice(0, Number(limit));

    res.json({ results });
  } catch (err) {
    console.error("❌ Backend error:", err);
    res.status(500).json({ error: "Failed to fetch places" });
  }
});

/* ------------------------------------
   Start server
------------------------------------ */
app.listen(PORT, () => {
  console.log(`✅ Backend running at http://localhost:${PORT}`);
});
