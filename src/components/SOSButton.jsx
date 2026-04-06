import React, { useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../AppContext'
import { startBuzzer, stopBuzzer } from '../services/soundService'
import { rankHospitals } from '../services/hospitalService'
import { getAmbulanceRoutes } from '../services/routingService'
import { haversine, lerpLatLng } from '../utils/geo'
import { rankRoutes, generateAmbulanceFleet } from '../utils/trafficSim'
import { db } from '../db'

const TICK_MS = 80 // animation tick interval (ms)

export default function SOSButton() {
  const { state, set, log, countdownRef, ambAnimRef, speedRef } = useApp()
  const { sosPhase, countdown, location, hospitals, emType, ambulanceFleet } = state

  // ── Countdown tick ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (sosPhase !== 'countdown') return
    countdownRef.current = setInterval(() => {
      set({ countdown: state.countdown - 1 })
    }, 1000)
    return () => clearInterval(countdownRef.current)
  }, [sosPhase, state.countdown])

  // Auto-confirm at 0
  useEffect(() => {
    if (sosPhase === 'countdown' && countdown <= 0) {
      clearInterval(countdownRef.current)
      confirmDispatch()
    }
  }, [countdown, sosPhase])

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const triggerSOS = useCallback(async () => {
    if (sosPhase !== 'idle') return
    set({ sosPhase: 'countdown', countdown: 60 })
    startBuzzer()
    if (!location) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude, label: 'GPS Location' }
          set({ location: loc })
          const fleet = generateAmbulanceFleet(loc.lat, loc.lng)
          set({ ambulanceFleet: fleet })
        },
        () => {
          const fallback = { lat: 12.9716, lng: 77.5946, label: 'Bengaluru (approx)' }
          set({ location: fallback })
        }
      )
    }
  }, [sosPhase, location])

  const cancelSOS = useCallback(() => {
    clearInterval(countdownRef.current)
    clearInterval(ambAnimRef.current)
    stopBuzzer()
    set({
      sosPhase: 'idle', countdown: 60,
      leg1Route: null, leg2Route: null,
      leg1AltRoutes: [], leg2AltRoutes: [],
      ambPosition: null, selectedAmbulance: null,
      ambPhase: 'enroute_patient',
    })
  }, [])

  const confirmDispatch = useCallback(async () => {
    stopBuzzer()
    set({ sosPhase: 'dispatched' })

    const loc = location || { lat: 12.9716, lng: 77.5946 }

    // ── Pick nearest ambulance from fleet ──────────────────────────────────────
    let fleet = ambulanceFleet.length > 0 ? ambulanceFleet : generateAmbulanceFleet(loc.lat, loc.lng)
    if (ambulanceFleet.length === 0) set({ ambulanceFleet: fleet })

    const amb = fleet
      .map(a => ({ ...a, dist: haversine(loc.lat, loc.lng, a.lat, a.lng) }))
      .sort((a, b) => a.dist - b.dist)[0]

    set({ selectedAmbulance: amb, ambPosition: { lat: amb.lat, lng: amb.lng } })

    // ── Rank hospitals ─────────────────────────────────────────────────────────
    const hosp = hospitals.length > 0 ? hospitals : await db.hospitals.toArray()
    const ranked = rankHospitals(hosp, emType || 'general', loc.lat, loc.lng, 999)
    const bestHosp = ranked[0]
    set({ rankedHospitals: ranked, selectedHospital: bestHosp })

    // ── Fetch all route alternatives ───────────────────────────────────────────
    try {
      const hospLat = bestHosp?.lat ?? loc.lat + 0.05
      const hospLng = bestHosp?.lng ?? loc.lng + 0.05

      const { leg1, leg2, leg1Routes, leg2Routes } = await getAmbulanceRoutes(
        amb.lat, amb.lng, loc.lat, loc.lng, hospLat, hospLng
      )

      // Apply traffic scoring to each leg's alternatives
      const rankedLeg1 = rankRoutes(leg1Routes)
      const rankedLeg2 = rankRoutes(leg2Routes)

      set({
        leg1Route: leg1,
        leg2Route: leg2,
        leg1AltRoutes: rankedLeg1,
        leg2AltRoutes: rankedLeg2,
        selectedRouteIdx: 0,
      })

      // Animate along optimal leg1 route
      animateAmbulance(rankedLeg1[0]?.coordinates ?? leg1.coordinates,
                       rankedLeg2[0]?.coordinates ?? leg2.coordinates,
                       hosp)
    } catch {
      // Fallback: linear interpolation
      animateLinear(amb, loc, bestHosp)
    }
  }, [location, hospitals, emType, ambulanceFleet])

  // ── Animation functions (speed-aware, use speedRef for live updates) ─────────
  const animateAmbulance = (leg1coords, leg2coords, hosp) => {
    const coords = [...leg1coords]
    let idx = 0
    clearInterval(ambAnimRef.current)

    ambAnimRef.current = setInterval(() => {
      const skip = Math.max(1, Math.ceil((coords.length / 120) * speedRef.current))
      idx += skip
      if (idx >= coords.length) {
        clearInterval(ambAnimRef.current)
        set({ ambPhase: 'pickup' })
        setTimeout(() => animateLeg2(leg2coords, hosp), Math.max(300, 1500 / speedRef.current))
        return
      }
      const [lat, lng] = coords[Math.min(idx, coords.length - 1)]
      set({ ambPosition: { lat, lng }, ambPhase: 'enroute_patient' })
    }, TICK_MS)
  }

  const animateLeg2 = (leg2coords, hosp) => {
    const coords = [...leg2coords]
    let idx = 0

    ambAnimRef.current = setInterval(() => {
      const skip = Math.max(1, Math.ceil((coords.length / 120) * speedRef.current))
      idx += skip
      if (idx >= coords.length) {
        clearInterval(ambAnimRef.current)
        set({ ambPhase: 'delivered' })
        return
      }
      const [lat, lng] = coords[Math.min(idx, coords.length - 1)]
      set({ ambPosition: { lat, lng }, ambPhase: 'enroute_hospital' })
    }, TICK_MS)
  }

  const animateLinear = (amb, patient, hosp) => {
    const STEPS = 60
    let step = 0
    clearInterval(ambAnimRef.current)
    ambAnimRef.current = setInterval(() => {
      step += Math.max(1, Math.round(speedRef.current / 5))
      const t = Math.min(step / STEPS, 1)
      set({ ambPosition: lerpLatLng({ lat: amb.lat, lng: amb.lng }, patient, t), ambPhase: 'enroute_patient' })
      if (step >= STEPS) {
        clearInterval(ambAnimRef.current)
        set({ ambPhase: 'pickup' })
        if (hosp) {
          setTimeout(() => {
            let s2 = 0
            ambAnimRef.current = setInterval(() => {
              s2 += Math.max(1, Math.round(speedRef.current / 5))
              set({ ambPosition: lerpLatLng(patient, { lat: hosp.lat, lng: hosp.lng }, Math.min(s2 / STEPS, 1)), ambPhase: 'enroute_hospital' })
              if (s2 >= STEPS) { clearInterval(ambAnimRef.current); set({ ambPhase: 'delivered' }) }
            }, TICK_MS)
          }, 800)
        }
      }
    }, TICK_MS)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, paddingTop: 4 }}>
      <AnimatePresence mode="wait">

        {/* IDLE */}
        {sosPhase === 'idle' && (
          <motion.div key="idle"
            initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}
          >
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="sos-ring-1" style={{ width: 158, height: 158, position: 'absolute', top: -11, left: -11 }} />
              <div className="sos-ring-2" style={{ width: 178, height: 178, position: 'absolute', top: -21, left: -21 }} />
              <button
                onClick={triggerSOS}
                style={{
                  width: 136, height: 136, borderRadius: '50%',
                  border: '2.5px solid #cc0018',
                  background: 'radial-gradient(circle, rgba(204,0,24,0.18), rgba(204,0,24,0.04))',
                  boxShadow: '0 0 40px rgba(204,0,24,0.25), inset 0 0 30px rgba(204,0,24,0.06)',
                  color: '#cc0018', fontFamily: 'Rajdhani', fontWeight: 800,
                  fontSize: 38, letterSpacing: 4, cursor: 'pointer',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  position: 'relative', zIndex: 1,
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.06)'; e.currentTarget.style.boxShadow = '0 0 60px rgba(204,0,24,0.4), inset 0 0 40px rgba(204,0,24,0.1)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 0 40px rgba(204,0,24,0.25), inset 0 0 30px rgba(204,0,24,0.06)' }}
              >
                SOS
              </button>
            </div>
            <div style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: '#8a6068', letterSpacing: 1, textAlign: 'center' }}>
              TAP TO TRIGGER EMERGENCY DISPATCH
            </div>
          </motion.div>
        )}

        {/* COUNTDOWN */}
        {sosPhase === 'countdown' && (
          <motion.div key="countdown"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: '100%' }}
          >
            <div style={{ fontSize: 64, fontFamily: 'Share Tech Mono', fontWeight: 700,
              color: countdown <= 10 ? '#cc0018' : '#c46000',
              textShadow: countdown <= 10 ? '0 0 20px rgba(204,0,24,0.4)' : 'none',
            }}>
              {countdown}
            </div>
            <div style={{ fontSize: 11, textAlign: 'center', color: '#555', lineHeight: 1.5, fontFamily: 'Rajdhani' }}>
              Emergency triggered. Cancel within <strong style={{ color: '#c46000' }}>{countdown}s</strong> if accidental.
            </div>
            <button
              onClick={cancelSOS}
              style={{
                padding: '8px 24px', border: '1.5px solid #c46000', borderRadius: 6,
                background: 'transparent', color: '#c46000', fontFamily: 'Rajdhani',
                fontWeight: 700, fontSize: 12, letterSpacing: 2, cursor: 'pointer',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(196,96,0,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              CANCEL SOS
            </button>
          </motion.div>
        )}

        {/* DISPATCHED */}
        {sosPhase === 'dispatched' && (
          <motion.div key="dispatched"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: '100%' }}
          >
            <div style={{ fontSize: 28 }}>🚑</div>
            <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 13, color: '#007a3d', letterSpacing: 2 }}>
              AMBULANCE DISPATCHED
            </div>
            {state.selectedAmbulance && (
              <div style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: '#888', textAlign: 'center' }}>
                {state.selectedAmbulance.vehicleId} · {state.selectedAmbulance.type}
              </div>
            )}
            {state.selectedHospital && (
              <div style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: '#cc0018', textAlign: 'center', marginTop: 2 }}>
                → {state.selectedHospital.name}
              </div>
            )}
            <button
              onClick={cancelSOS}
              style={{
                marginTop: 4, padding: '5px 16px', border: '1px solid rgba(204,0,24,0.35)',
                borderRadius: 6, background: 'transparent', color: '#999',
                fontFamily: 'Rajdhani', fontSize: 10, letterSpacing: 2, cursor: 'pointer',
              }}
            >
              ABORT DISPATCH
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
