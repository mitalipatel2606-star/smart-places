import React, { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";

/* ---------- Constants ---------- */

const DEFAULT_LOCATION = { lat: 40.7128, lng: -74.0060 };

const CATEGORY_TO_QUERY = {
  date: "cafe",
  restaurant: "restaurant",
  quick: "fast_food",
};

/* ---------- Helper to Recenter Map ---------- */

function RecenterMap({ location }) {
  const map = useMap();

  useEffect(() => {
    map.setView(location, map.getZoom(), {
      animate: true,
    });
  }, [location, map]);

  return null;
}

/* ---------- App Component ---------- */

function App() {
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [places, setPlaces] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [placeDetails, setPlaceDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
 const isSelected = (place) =>
    selectedPlace && selectedPlace.id === place.id;
  /* ---------- Get User Location ---------- */

  function getMyLocation() {
    if (!navigator.geolocation) {
      alert("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => {
        alert("Location permission denied. Using default location.");
        setLocation(DEFAULT_LOCATION);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }

  /* ---------- Fetch Nearby Places ---------- */

  useEffect(() => {
    if (!category) return;

    const fetchPlaces = async () => {
      setLoading(true);
      setError("");

      try {
        const query = CATEGORY_TO_QUERY[category];

        const res = await fetch(
          `http://localhost:3001/places?query=${query}&lat=${location.lat}&lng=${location.lng}&limit=30`
        );

        if (!res.ok) throw new Error("Failed to fetch places");

        const data = await res.json();

        const sorted = (data.results || []).sort(
          (a, b) => (a.distance || 0) - (b.distance || 0)
        );

        setPlaces(sorted);
        setSelectedPlace(null);
        setPlaceDetails(null);
      } catch (err) {
        setError("Failed to load places");
      } finally {
        setLoading(false);
      }
    };

    fetchPlaces();
  }, [category, location]);

  /* ---------- Fetch Wikipedia Details ---------- */

  useEffect(() => {
    if (!selectedPlace) return;

    const fetchDetails = async () => {
      try {
        const title = selectedPlace.name.split(",")[0];

        const res = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
            title
          )}`
        );

        if (!res.ok) {
          setPlaceDetails(null);
          return;
        }

        const data = await res.json();
        setPlaceDetails(data);
      } catch {
        setPlaceDetails(null);
      }
    };

    fetchDetails();
  }, [selectedPlace]);

  /* ---------- UI ---------- */

  return (
    <div className="container">
      <h1>Smart Nearby Places</h1>

      <div className="buttons">
        <button onClick={getMyLocation}>📍 Get My Location</button>
        <button onClick={() => setCategory("date")}>💖 Date Cafes</button>
        <button onClick={() => setCategory("restaurant")}>
          🍽 Restaurants
        </button>
        <button onClick={() => setCategory("quick")}>⚡ Quick Bite</button>
      </div>

      {loading && <p>Loading places...</p>}
      {error && <p className="error">{error}</p>}

      <MapContainer
        center={location}
        zoom={13}
        style={{ height: "400px", width: "100%" }}
      >
        <RecenterMap location={location} />

        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <Marker position={location}>
          <Popup>You are here</Popup>
        </Marker>

        {places.map((p) => (
          <Marker
            key={p.id}
            position={{ lat: p.lat, lng: p.lng }}
            eventHandlers={{
              click: () => setSelectedPlace(p),
            }}
          >
           <Popup maxWidth={300}>
  <div className="popup-content">
    <h3>{p.name.split(",")[0]}</h3>

    {isSelected(p) && placeDetails?.thumbnail && (
      <img
        src={placeDetails.thumbnail.source}
        alt={placeDetails.title}
        style={{ width: "100%", borderRadius: "8px" }}
      />
    )}

    {isSelected(p) && placeDetails?.extract && (
      <p style={{ fontSize: "0.85rem" }}>
        {placeDetails.extract.slice(0, 200)}...
      </p>
    )}

    {isSelected(p) && placeDetails?.content_urls && (
      <a
        href={placeDetails.content_urls.desktop.page}
        target="_blank"
        rel="noreferrer"
      >
        Read more
      </a>
    )}
  </div>
</Popup>

          </Marker>
        ))}
      </MapContainer>

      {places.length > 0 && (
        <div className="places-list">
          <h2>Recommended Places</h2>
          <ul>
            {places.map((p) => (
              <li
                key={p.id}
                className="clickable"
                onClick={() => setSelectedPlace(p)}
              >
                {p.name}
                {p.distance && (
                  <span className="distance">
                    {" "}
                    – {(p.distance / 1000).toFixed(1)} km
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {placeDetails && (
        <div className="details-card">
          <h2>{placeDetails.title}</h2>

          {placeDetails.thumbnail && (
            <img
              src={placeDetails.thumbnail.source}
              alt={placeDetails.title}
            />
          )}

          <p>{placeDetails.extract}</p>

          <a
            href={placeDetails.content_urls.desktop.page}
            target="_blank"
            rel="noreferrer"
          >
            Read more on Wikipedia
          </a>
        </div>
      )}
    </div>
  );
}

export default App;
