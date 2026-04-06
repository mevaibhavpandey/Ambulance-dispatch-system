import React, { useState, useEffect } from 'react'
import { useApp } from '../AppContext'
import { fetchHospitals, rankHospitals } from '../services/hospitalService'
import { generateAmbulanceFleet } from '../utils/trafficSim'

export default function LocationPanel() {
  const { state, set, log } = useApp()
  const { location, locationLoading, emType } = state

  const loadHospitalsAndFleet = async (loc) => {
    set({ hospitalsLoading: true })
    const hospitals = await fetchHospitals(loc.lat, loc.lng, log)
    const ranked    = rankHospitals(hospitals, emType, loc.lat, loc.lng, 999)
    // Seed ambulance fleet around this location
    const fleet     = generateAmbulanceFleet(loc.lat, loc.lng)
    set({
      hospitals, rankedHospitals: ranked,
      hospitalsLoading: false,
      selectedHospital: ranked[0] ?? null,
      ambulanceFleet: fleet,
    })
    log(`${hospitals.length} hospitals loaded · ${fleet.length} ambulances on standby`, 'success')
  }

  // Auto-load on mount with Bengaluru default
  useEffect(() => {
    if (!location) {
      const loc = { lat: 12.9716, lng: 77.5946, label: 'Bengaluru, Karnataka' }
      set({ location: loc })
      loadHospitalsAndFleet(loc)
    }
  }, [])

  const detectGPS = () => {
    if (!navigator.geolocation) { log('Geolocation not supported', 'warn'); return }
    set({ locationLoading: true })
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = {
          lat:   pos.coords.latitude,
          lng:   pos.coords.longitude,
          label: `GPS (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`,
          accuracy: pos.coords.accuracy,
        }
        set({ location: loc, locationLoading: false })
        await loadHospitalsAndFleet(loc)
      },
      () => { set({ locationLoading: false }); log('GPS denied — using Bengaluru default', 'warn') },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const useBengaluru = () => {
    const loc = { lat: 12.9716, lng: 77.5946, label: 'Bengaluru, Karnataka' }
    set({ location: loc })
    loadHospitalsAndFleet(loc)
  }

  return (
    <div>
      <div className="panel-title">◈ LOCATION</div>

      {/* Location chip */}
      <div style={{
        fontFamily: 'Share Tech Mono', fontSize: 10, padding: '6px 10px',
        borderRadius: 6, marginBottom: 8,
        background: location ? 'rgba(204,0,24,0.05)' : '#f5f5f5',
        border: '1px solid rgba(200,0,24,0.15)',
        color: location ? '#cc0018' : '#8a6068',
        display: 'flex', alignItems: 'center', gap: 6
      }}>
        <span style={{ fontSize: 8, display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: location ? '#cc0018' : '#ccc' }} className={location ? 'pulse-dot' : ''} />
        {location ? location.label : '○ No location set'}
      </div>

      <button
        onClick={detectGPS}
        disabled={locationLoading}
        className="hud-btn w-full py-2 rounded text-sm font-semibold tracking-wider mb-2"
      >
        {locationLoading ? 'ACQUIRING GPS...' : '◎ DETECT MY LOCATION'}
      </button>

      <button
        onClick={useBengaluru}
        style={{
          width: '100%', padding: '6px', borderRadius: 6, marginBottom: 6,
          border: '1px solid rgba(200,0,24,0.2)', background: 'transparent',
          color: '#8a6068', cursor: 'pointer', fontFamily: 'Rajdhani',
          fontSize: 11, fontWeight: 600, letterSpacing: 1,
        }}
      >
        USE BENGALURU DEFAULT
      </button>

      {location && (
        <button
          onClick={async () => {
            const { db } = await import('../db')
            await db.hospitals.clear()
            await loadHospitalsAndFleet(location)
          }}
          disabled={locationLoading}
          style={{
            width: '100%', padding: '6px', borderRadius: 6,
            border: '1px solid rgba(0,122,61,0.4)', background: 'rgba(0,122,61,0.05)',
            color: '#007a3d', cursor: 'pointer', fontFamily: 'Rajdhani',
            fontSize: 11, fontWeight: 600, letterSpacing: 1,
            opacity: locationLoading ? 0.5 : 1,
          }}
        >
          ↻ REFRESH ALL HOSPITALS
        </button>
      )}
    </div>
  )
}
