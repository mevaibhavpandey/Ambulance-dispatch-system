# AMBUAI — AI Smart Ambulance Dispatch System

A production-grade emergency response web application for Bengaluru, India.

## Features

- **Real Interactive Map** — Leaflet.js with OpenStreetMap tiles (dark-filtered)
- **Live GPS Detection** — Browser Geolocation API with permission handling
- **Live Hospital Data** — Fetched from OpenStreetMap Overpass API (30+ hospitals)
- **IndexedDB Caching** — Dexie.js caches hospital data for 6 hours (offline support)
- **Real Road Routing** — OSRM public API for road-based ambulance routes
- **Smart Hospital Ranking** — Weighted score: travel time + specialization + capacity
- **SOS with 60s Cancel** — Buzzer, flashing UI, countdown, abort button
- **Ambulance Animation** — Moves along real road route from depot → patient → hospital
- **AI Triage** — Symptom questions → severity classification (critical/moderate/low)
- **First Aid Guides** — Step-by-step for all 6 emergency types
- **Bystander Mode** — Simplified UI for helpers
- **Dark HUD Design** — Futuristic neon cyberpunk interface

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Usage

1. **Set Location** — Click "Detect My Location" (allow GPS) or use Bengaluru default
2. **Select Emergency Type** — Cardiac, Neurological, Trauma, etc.
3. **Complete Triage** — Answer the symptom question
4. **View Ranked Hospitals** — See top 5 matches on map and in panel
5. **Press SOS** — Starts 60-second countdown
   - Click **CANCEL SOS** within 60s to abort
   - If not cancelled — ambulance dispatches, moves along real roads to patient then hospital

## Architecture

```
src/
  components/
    MapView.jsx         — Leaflet map, markers, routes
    LeftPanel.jsx       — Tab container for all controls
    SOSButton.jsx       — SOS trigger, countdown, dispatch logic
    LocationPanel.jsx   — GPS + manual location
    EmergencyTypePanel  — Emergency category selector
    TriagePanel.jsx     — Symptom assessment
    HospitalList.jsx    — Ranked hospital cards
    FirstAidPanel.jsx   — Step-by-step first aid
    AmbulanceStatus.jsx — Live dispatch tracker
    MapOverlay.jsx      — HUD chips on top of map
    SystemLog.jsx       — Live event log
  services/
    hospitalService.js  — Overpass API + IndexedDB cache + ranking
    routingService.js   — OSRM road-based routing
    soundService.js     — Web Audio buzzer
  db/
    index.js            — Dexie.js schema + ambulance fleet seed
  utils/
    geo.js              — Haversine, ETA, scoring formula, lerp
    firstAid.js         — First aid content for all emergency types
    triage.js           — Triage question trees
  AppContext.jsx        — Global state (useReducer)
```

## APIs Used

| API | Purpose | Cost |
|-----|---------|------|
| OpenStreetMap Overpass | Live hospital data | Free |
| OSRM (router.project-osrm.org) | Road routing | Free |
| Browser Geolocation | GPS location | Free |
| Web Audio API | SOS buzzer | Built-in |

## Offline Mode

When no internet is available:
- Hospital data served from IndexedDB cache (6-hour TTL)
- Falls back to 10 known Bengaluru hospitals if cache is empty
- Routing disabled (straight-line ETA estimate shown)

## Hospital Scoring Formula

```
score = 0.5 × travel_time_score + 0.3 × specialization_match + 0.2 × capacity_score
```

Where:
- `travel_time_score = 1 - (etaMinutes / 60)` — closer is better
- `specialization_match = 1.0` if hospital treats this emergency type, else `0.2`
- `capacity_score = capacity / 100`
