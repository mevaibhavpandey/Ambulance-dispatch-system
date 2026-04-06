import React, { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { useApp } from '../AppContext'
import { SEVERITY_CONFIG } from '../utils/trafficSim'
import { TT_TRAFFIC_TILE } from '../services/tomtomService'
import { fetchHospitals, rankHospitals } from '../services/hospitalService'
import { generateAmbulanceFleet } from '../utils/trafficSim'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const svg = (html, size) => L.divIcon({ html, iconSize: size, iconAnchor: [size[0]/2, size[1]/2], className: '' })

const userIcon = (pulsing) => svg(`
  <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
    ${pulsing ? '<circle cx="22" cy="22" r="20" fill="#cc0018" fill-opacity="0.12"><animate attributeName="r" values="14;22;14" dur="2s" repeatCount="indefinite"/><animate attributeName="fill-opacity" values="0.2;0.04;0.2" dur="2s" repeatCount="indefinite"/></circle>' : ''}
    <circle cx="22" cy="22" r="10" fill="#cc0018" fill-opacity="0.2" stroke="#cc0018" stroke-width="1.5"/>
    <circle cx="22" cy="22" r="5.5" fill="#cc0018"/>
  </svg>`, [44, 44])

const patientClickIcon = svg(`
  <svg width="36" height="36" viewBox="0 0 36 36">
    <circle cx="18" cy="18" r="16" fill="rgba(204,0,24,0.15)" stroke="#cc0018" stroke-width="2" stroke-dasharray="4,3"/>
    <text x="18" y="23" text-anchor="middle" font-size="16">🧍</text>
  </svg>`, [36, 36])

const ambulanceActiveIcon = (color = '#cc0018') => svg(`
  <svg width="48" height="48" viewBox="0 0 48 48">
    <circle cx="24" cy="24" r="22" fill="rgba(204,0,24,0.08)" stroke="${color}" stroke-width="1.5" stroke-dasharray="4,3">
      <animate attributeName="stroke-opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite"/>
    </circle>
    <rect x="5" y="13" width="38" height="20" rx="4" fill="${color}"/>
    <rect x="22" y="16" width="5" height="13" fill="white"/>
    <rect x="15" y="21" width="18" height="5" fill="white"/>
    <rect x="6" y="16" width="10" height="7" rx="1" fill="white" opacity="0.85"/>
    <circle cx="14" cy="36" r="4.5" fill="#222" stroke="white" stroke-width="1.5"/>
    <circle cx="34" cy="36" r="4.5" fill="#222" stroke="white" stroke-width="1.5"/>
    <circle cx="14" cy="36" r="1.8" fill="${color}"/>
    <circle cx="34" cy="36" r="1.8" fill="${color}"/>
    <rect x="20" y="8" width="9" height="4" rx="2" fill="#ff6600" opacity="0.9"/>
  </svg>`, [48, 48])

const ambulanceFleetIcon = svg(`
  <svg width="28" height="28" viewBox="0 0 28 28">
    <rect x="2" y="7" width="24" height="14" rx="3" fill="#cc0018" opacity="0.75"/>
    <rect x="12" y="9" width="3" height="10" fill="white"/>
    <rect x="8" y="12" width="11" height="3" fill="white"/>
    <rect x="3" y="9" width="6" height="5" rx="1" fill="white" opacity="0.8"/>
    <circle cx="8" cy="23" r="3" fill="#333" stroke="white" stroke-width="1"/>
    <circle cx="20" cy="23" r="3" fill="#333" stroke="white" stroke-width="1"/>
  </svg>`, [28, 28])

const hospitalIconSm = svg(`<svg width="24" height="24" viewBox="0 0 24 24"><rect x="1" y="1" width="22" height="22" rx="4" fill="#cc0018" stroke="white" stroke-width="1.3"/><rect x="6" y="5" width="3" height="14" fill="white"/><rect x="15" y="5" width="3" height="14" fill="white"/><rect x="6" y="10" width="12" height="4" fill="white"/></svg>`, [24, 24])
const selectedHospIcon = svg(`<svg width="38" height="38" viewBox="0 0 38 38"><filter id="ds"><feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#cc0018" flood-opacity="0.6"/></filter><rect x="2" y="2" width="34" height="34" rx="6" fill="#990012" stroke="white" stroke-width="2" filter="url(#ds)"/><rect x="9" y="7" width="5" height="20" fill="white"/><rect x="24" y="7" width="5" height="20" fill="white"/><rect x="9" y="15" width="20" height="5" fill="white"/></svg>`, [38, 38])
const topHospIcon = svg(`<svg width="30" height="30" viewBox="0 0 30 30"><rect x="2" y="2" width="26" height="26" rx="5" fill="#cc0018" stroke="#ffcc00" stroke-width="1.5"/><rect x="7" y="5" width="4" height="16" fill="white"/><rect x="19" y="5" width="4" height="16" fill="white"/><rect x="7" y="11" width="16" height="5" fill="white"/><circle cx="24" cy="6" r="5" fill="#ffcc00"/><text x="24" y="9" text-anchor="middle" font-size="6" fill="#7a4000" font-weight="bold">★</text></svg>`, [30, 30])

// Dispatch colors for multiple concurrent dispatches
const DISPATCH_COLORS = ['#cc0018', '#0055cc', '#007a3d', '#c46000', '#6a00cc']

// ── MapEvents: click to set patient location ─────────────────────────────────
function MapClickHandler() {
  const { state, set, log } = useApp()
  useMapEvents({
    async click(e) {
      const { lat, lng } = e.latlng
      const label = `${lat.toFixed(5)}, ${lng.toFixed(5)} (Map pin)`
      const loc = { lat, lng, label }
      set({ location: loc, hospitalsLoading: true })
      log(`Patient location set: ${lat.toFixed(4)}, ${lng.toFixed(4)}`, 'info')
      try {
        const hospitals = await fetchHospitals(lat, lng, log)
        const ranked    = rankHospitals(hospitals, state.emType, lat, lng, 999)
        const fleet     = generateAmbulanceFleet(lat, lng)
        set({ hospitals, rankedHospitals: ranked, hospitalsLoading: false, selectedHospital: ranked[0] ?? null, ambulanceFleet: fleet })
      } catch {
        set({ hospitalsLoading: false })
      }
    }
  })
  return null
}

// ── Map fit helpers ──────────────────────────────────────────────────────────
function MapFitter({ locations, trigger }) {
  const map = useMap()
  useEffect(() => {
    if (!locations?.length) return
    const b = L.latLngBounds(locations)
    if (b.isValid()) map.fitBounds(b, { padding: [50, 50], maxZoom: 14 })
  }, [trigger])
  return null
}

function MapCenter({ center, zoom }) {
  const map = useMap()
  const prev = useRef(null)
  useEffect(() => {
    if (!center) return
    const k = `${center[0]},${center[1]}`
    if (k !== prev.current) { map.setView(center, zoom ?? map.getZoom()); prev.current = k }
  }, [center])
  return null
}

// ════════════════════════════════════════════════════════════════════════════
export default function MapView() {
  const { state } = useApp()
  const {
    location, hospitals, rankedHospitals, selectedHospital,
    trafficZones, ambulanceFleet,
    activeDispatches, sosPhase,
    leg1AltRoutes, leg2AltRoutes, selectedLeg2RouteIdx,
    leg1Route, leg2Route,
  } = state

  const selId  = selectedHospital?.id ?? selectedHospital?.osmId
  const topIds = new Set(rankedHospitals.slice(0, 5).map(h => h.id ?? h.osmId))

  // Collect locations for map fitting
  const hospLocs = hospitals.map(h => [h.lat, h.lng])
  if (location) hospLocs.push([location.lat, location.lng])

  const dispLocs = activeDispatches.flatMap(d => [
    d.ambPosition ? [d.ambPosition.lat, d.ambPosition.lng] : null,
    d.hospital ? [d.hospital.lat, d.hospital.lng] : null,
    location ? [location.lat, location.lng] : null,
  ]).filter(Boolean)

  // Dispatched ambulance IDs set
  const dispatchedAmbIds = new Set(activeDispatches.map(d => d.ambulance?.id))

  return (
    <MapContainer center={[12.9716, 77.5946]} zoom={12}
      style={{ height: '100%', width: '100%' }} zoomControl>

      {/* Base tile */}
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap' opacity={0.87} />

      {/* TomTom real-time traffic flow */}
      <TileLayer url={TT_TRAFFIC_TILE} opacity={0.55} zIndex={200} />

      {/* Click to pin patient location */}
      <MapClickHandler />

      {/* Auto-fit bounds */}
      {hospitals.length > 0 && sosPhase === 'idle' && (
        <MapFitter locations={hospLocs} trigger={hospitals.length} />
      )}
      {activeDispatches.length > 0 && dispLocs.length > 1 && (
        <MapFitter locations={dispLocs} trigger={`d${activeDispatches.length}`} />
      )}
      {location && sosPhase === 'idle' && hospitals.length === 0 && (
        <MapCenter center={[location.lat, location.lng]} zoom={13} />
      )}

      {/* Simulated traffic circles (background hint) */}
      {(trafficZones ?? []).map(zone => {
        const cfg = SEVERITY_CONFIG[zone.severity]
        return (
          <Circle key={zone.id} center={[zone.lat, zone.lng]} radius={zone.radius}
            pathOptions={{ color: cfg.color, fillColor: cfg.color, fillOpacity: 0.08, weight: 1, opacity: 0.3, dashArray: '6,4' }}>
            <Popup>
              <div style={{ fontFamily: 'Rajdhani', fontSize: 12 }}>
                <strong style={{ color: cfg.color }}>{cfg.label} — {zone.name}</strong><br />
                <span style={{ color: '#666', fontSize: 10 }}>Est. +{cfg.delayMin} min · Radius {zone.radius}m</span>
              </div>
            </Popup>
          </Circle>
        )
      })}

      {/* User / patient location */}
      {location && (
        <>
          <Marker position={[location.lat, location.lng]} icon={userIcon(activeDispatches.length === 0)}>
            <Popup>
              <div style={{ fontFamily: 'Rajdhani' }}>
                <strong style={{ color: '#cc0018' }}>📍 PATIENT LOCATION</strong><br />
                {location.label}<br />
                <span style={{ fontSize: 10, color: '#888' }}>Click anywhere on map to move</span>
              </div>
            </Popup>
          </Marker>
          <Circle center={[location.lat, location.lng]} radius={300}
            pathOptions={{ color: '#cc0018', fillColor: '#cc0018', fillOpacity: 0.05, weight: 1 }} />
        </>
      )}

      {/* Idle ambulance fleet */}
      {ambulanceFleet.filter(a => !dispatchedAmbIds.has(a.id)).map(amb => (
        <Marker key={amb.id} position={[amb.lat, amb.lng]} icon={ambulanceFleetIcon}>
          <Popup>
            <div style={{ fontFamily: 'Rajdhani', fontSize: 12 }}>
              <strong style={{ color: '#cc0018' }}>🚑 {amb.vehicleId}</strong> — {amb.type}<br />
              <span style={{ color: '#007a3d' }}>✓ Available</span>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Hospital markers */}
      {hospitals.map((h, i) => {
        const hId  = h.id ?? h.osmId
        const isSel = selId && hId === selId
        const isTop = topIds.has(hId)
        const icon  = isSel ? selectedHospIcon : isTop ? topHospIcon : hospitalIconSm
        const ranked = rankedHospitals.find(r => (r.id ?? r.osmId) === hId)
        return (
          <Marker key={hId ?? i} position={[h.lat, h.lng]} icon={icon}>
            <Popup>
              <div style={{ fontFamily: 'Rajdhani', fontSize: 12, minWidth: 175 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                  <div style={{ width: 18, height: 18, background: isSel ? '#990012' : '#cc0018', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#fff', fontWeight: 900, fontSize: 11 }}>H</span>
                  </div>
                  <strong style={{ color: isSel ? '#990012' : '#cc0018' }}>{h.name}</strong>
                </div>
                {ranked && <div style={{ color: '#555', fontSize: 11 }}>📍 {ranked.distKm} km · ⏱ ~{ranked.etaMin} min</div>}
                <div style={{ color: '#777', fontSize: 10 }}>{(h.specializations ?? []).join(', ')}</div>
              </div>
            </Popup>
          </Marker>
        )
      })}

      {/* ── Per-dispatch routes and moving ambulance ── */}
      {activeDispatches.map((d, di) => {
        const dispColor = DISPATCH_COLORS[di % DISPATCH_COLORS.length]

        // For the LATEST dispatch, use the global alt routes state (for route switching)
        const isLatest = di === activeDispatches.length - 1
        const routes1  = isLatest && leg1AltRoutes.length ? leg1AltRoutes : (d.leg1AltRoutes.length ? d.leg1AltRoutes : (d.leg1Route ? [d.leg1Route] : []))
        const routes2  = isLatest && leg2AltRoutes.length ? leg2AltRoutes : (d.leg2AltRoutes.length ? d.leg2AltRoutes : (d.leg2Route ? [d.leg2Route] : []))
        const selIdx   = isLatest ? selectedLeg2RouteIdx : (d.selectedRouteIdx ?? 0)

        return (
          <React.Fragment key={d.id}>
            {/* Leg1 routes */}
            {routes1.map((r, i) => (
              <Polyline key={`l1-${d.id}-${i}`} positions={r.coordinates ?? []}
                pathOptions={{ color: r.color ?? dispColor, weight: i === 0 ? 4 : 2.5, opacity: i === 0 ? 0.8 : 0.3, dashArray: i === 0 ? '9,5' : '6,4' }} />
            ))}

            {/* Leg2 routes */}
            {routes2.map((r, i) => (
              <Polyline key={`l2-${d.id}-${i}`} positions={r.coordinates ?? []}
                pathOptions={{ color: r.color ?? '#1a7a00', weight: r.weight ?? 4, opacity: i === selIdx ? 0.92 : 0.22, dashArray: i === selIdx ? null : r.dashArray ?? '10,6' }} />
            ))}

            {/* Moving ambulance */}
            {d.ambPosition && (
              <Marker position={[d.ambPosition.lat, d.ambPosition.lng]} icon={ambulanceActiveIcon(dispColor)}>
                <Popup>
                  <div style={{ fontFamily: 'Rajdhani', fontSize: 12 }}>
                    <strong style={{ color: dispColor }}>🚑 {d.ambulance?.vehicleId}</strong> · {d.ambulance?.type}<br />
                    <strong>→</strong> {d.hospital?.name}<br />
                    <span style={{ fontSize: 10, color: dispColor }}>
                      {d.ambPhase === 'enroute_patient'  && 'Heading to patient'}
                      {d.ambPhase === 'pickup'           && 'Loading patient'}
                      {d.ambPhase === 'enroute_hospital' && 'Heading to hospital'}
                      {d.ambPhase === 'delivered'        && '✓ Patient delivered'}
                    </span>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Destination hospital marker overlay */}
            {d.hospital && d.ambPhase !== 'delivered' && (
              <Circle center={[d.hospital.lat, d.hospital.lng]} radius={180}
                pathOptions={{ color: dispColor, fillColor: dispColor, fillOpacity: 0.1, weight: 1.5 }} />
            )}
          </React.Fragment>
        )
      })}
    </MapContainer>
  )
}
