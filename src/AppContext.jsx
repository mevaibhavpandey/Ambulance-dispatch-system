import React, { createContext, useContext, useReducer, useRef, useCallback, useEffect } from 'react'
import { BENGALURU_TRAFFIC_ZONES, generateAmbulanceFleet } from './utils/trafficSim'
import { rankHospitals } from './services/hospitalService'
import { getFullTomTomRoutes, getTomTomRoutes } from './services/tomtomService'
import { haversine, lerpLatLng } from './utils/geo'
import { db } from './db'

const AppContext = createContext(null)
const TICK_MS = 80

const initialState = {
  location: null, locationLoading: false,
  emType: null, severity: null,
  hospitals: [], hospitalsLoading: false, rankedHospitals: [], selectedHospital: null,
  ambulanceFleet: [],

  // ── Multiple concurrent dispatches ──────────────────────────────────────────
  // Each: { id, ambulance, hospital, patient, ambPosition, ambPhase, leg1Route, leg2Route, leg1AltRoutes, leg2AltRoutes, selectedRouteIdx }
  activeDispatches: [],

  // Backwards-compat: latest dispatch summary fields
  selectedAmbulance: null, ambPosition: null, ambPhase: 'enroute_patient',
  leg1Route: null, leg2Route: null,
  leg1AltRoutes: [], leg2AltRoutes: [], selectedLeg2RouteIdx: 0,

  // Cancel window for latest SOS dispatch
  canCancel: false, cancelCountdown: 60, dispatchMode: null,

  // Reroute
  rerouteAvailable: false,

  // Map / UI
  trafficZones: BENGALURU_TRAFFIC_ZONES,
  speedMultiplier: 10,
  bystander: false, logs: [],
  mapCenter: [12.9716, 77.5946],
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET': return { ...state, ...action.payload }
    case 'LOG': {
      const e = { msg: action.msg, type: action.logType || 'info', ts: new Date().toLocaleTimeString('en-IN', { hour12: false }) }
      return { ...state, logs: [e, ...state.logs].slice(0, 30) }
    }
    // Update a single dispatch inside activeDispatches by ID
    case 'UPDATE_DISPATCH': {
      const updated = state.activeDispatches.map(d =>
        d.id === action.id ? { ...d, ...action.payload } : d
      )
      return { ...state, activeDispatches: updated }
    }
    case 'REMOVE_DISPATCH': {
      const filtered = state.activeDispatches.filter(d => d.id !== action.id)
      return { ...state, activeDispatches: filtered }
    }
    case 'RESET_ALL': return { ...initialState, hospitals: state.hospitals, rankedHospitals: state.rankedHospitals, ambulanceFleet: state.ambulanceFleet, location: state.location, trafficZones: state.trafficZones }
    default: return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const stateRef      = useRef(state)
  const speedRef      = useRef(10)
  const cancelWinRef  = useRef(null)
  const cancelCountRef= useRef(60)
  const rerouteRef    = useRef(null)
  // Per-dispatch animation intervals: Map<dispatchId, intervalId>
  const animRefs      = useRef(new Map())
  // Per-dispatch leg2 coords refs for mid-flight rerouting: Map<dispatchId, {coords, idx}>
  const leg2Refs      = useRef(new Map())

  useEffect(() => { stateRef.current = state }, [state])

  const set = useCallback((p) => {
    if ('speedMultiplier' in p) speedRef.current = p.speedMultiplier
    dispatch({ type: 'SET', payload: p })
  }, [])
  const log = useCallback((msg, type = 'info') => dispatch({ type: 'LOG', msg, logType: type }), [])

  const updateDispatch = useCallback((id, payload) => {
    dispatch({ type: 'UPDATE_DISPATCH', id, payload })
    // Also mirror latest dispatch to top-level state for backward compat
    const latest = stateRef.current.activeDispatches.find(d => d.id === id)
    if (latest) {
      const merged = { ...latest, ...payload }
      // If this is the most recent dispatch, mirror it
      const isLatest = stateRef.current.activeDispatches[stateRef.current.activeDispatches.length - 1]?.id === id
      if (isLatest) {
        const mirror = {}
        if ('ambPosition'    in payload) mirror.ambPosition    = payload.ambPosition
        if ('ambPhase'       in payload) mirror.ambPhase       = payload.ambPhase
        if ('leg1Route'      in payload) mirror.leg1Route      = payload.leg1Route
        if ('leg2Route'      in payload) mirror.leg2Route      = payload.leg2Route
        if ('leg1AltRoutes'  in payload) mirror.leg1AltRoutes  = payload.leg1AltRoutes
        if ('leg2AltRoutes'  in payload) mirror.leg2AltRoutes  = payload.leg2AltRoutes
        if (Object.keys(mirror).length) dispatch({ type: 'SET', payload: mirror })
      }
    }
  }, [])

  // ── Cancel window ─────────────────────────────────────────────────────────
  const startCancelWindow = useCallback(() => {
    cancelCountRef.current = 60
    set({ canCancel: true, cancelCountdown: 60 })
    clearInterval(cancelWinRef.current)
    cancelWinRef.current = setInterval(() => {
      cancelCountRef.current -= 1
      set({ cancelCountdown: cancelCountRef.current })
      if (cancelCountRef.current <= 0) { clearInterval(cancelWinRef.current); set({ canCancel: false }) }
    }, 1000)
  }, [set])

  // ── Cancel latest SOS dispatch ────────────────────────────────────────────
  const cancelDispatch = useCallback(() => {
    if (!stateRef.current.canCancel) return
    const dispatches = stateRef.current.activeDispatches
    const latest = dispatches[dispatches.length - 1]
    if (latest) {
      const interval = animRefs.current.get(latest.id)
      if (interval) { clearInterval(interval); animRefs.current.delete(latest.id) }
      dispatch({ type: 'REMOVE_DISPATCH', id: latest.id })
    }
    clearInterval(cancelWinRef.current)
    clearInterval(rerouteRef.current)
    set({ canCancel: false, cancelCountdown: 60, dispatchMode: null })
    // If no more dispatches, reset
    if (dispatches.length <= 1) {
      set({ selectedAmbulance: null, ambPosition: null, ambPhase: 'enroute_patient', leg1Route: null, leg2Route: null, leg1AltRoutes: [], leg2AltRoutes: [] })
    }
  }, [set])

  // ── Reset all dispatches ──────────────────────────────────────────────────
  const resetAll = useCallback(() => {
    animRefs.current.forEach(clearInterval)
    animRefs.current.clear()
    leg2Refs.current.clear()
    clearInterval(cancelWinRef.current)
    clearInterval(rerouteRef.current)
    dispatch({ type: 'RESET_ALL' })
  }, [])

  // ── Animation helpers ─────────────────────────────────────────────────────
  const animateLeg = useCallback((dispatchId, coords, phase, onDone) => {
    const existing = animRefs.current.get(dispatchId)
    if (existing) clearInterval(existing)

    // Store coords in the leg2 ref (so rerouting can swap them)
    if (phase === 'enroute_hospital') {
      leg2Refs.current.set(dispatchId, { coords, idx: 0 })
    }

    let idx = 0
    const interval = setInterval(() => {
      // For leg2, read from leg2Ref (allows mid-flight rerouting)
      let currentCoords = coords
      let currentIdx    = idx
      if (phase === 'enroute_hospital') {
        const ref = leg2Refs.current.get(dispatchId)
        if (ref) { currentCoords = ref.coords; currentIdx = ref.idx }
      }

      const skip = Math.max(1, Math.ceil((currentCoords.length / 100) * speedRef.current))
      const nextIdx = currentIdx + skip

      if (nextIdx >= currentCoords.length) {
        clearInterval(interval)
        animRefs.current.delete(dispatchId)
        if (phase === 'enroute_hospital') leg2Refs.current.delete(dispatchId)
        onDone?.()
        return
      }

      const [lat, lng] = currentCoords[Math.min(nextIdx, currentCoords.length - 1)]
      updateDispatch(dispatchId, { ambPosition: { lat, lng }, ambPhase: phase })
      if (phase === 'enroute_hospital') {
        const ref = leg2Refs.current.get(dispatchId)
        if (ref) ref.idx = nextIdx
      } else {
        idx = nextIdx
      }
    }, TICK_MS)

    animRefs.current.set(dispatchId, interval)
  }, [updateDispatch])

  // ── Main dispatch function ────────────────────────────────────────────────
  const executeDispatch = useCallback(async (opts = {}) => {
    const { mode = 'direct', ambulance = null, hospital = null } = opts
    const loc = stateRef.current.location || { lat: 12.9716, lng: 77.5946 }

    // Pick an ambulance that isn't already dispatched
    const dispatchedAmbIds = new Set(stateRef.current.activeDispatches.map(d => d.ambulance?.id))
    let fleet = stateRef.current.ambulanceFleet
    if (!fleet.length) fleet = generateAmbulanceFleet(loc.lat, loc.lng)

    const amb = ambulance || [...fleet]
      .filter(a => !dispatchedAmbIds.has(a.id))
      .map(a => ({ ...a, dist: haversine(loc.lat, loc.lng, a.lat, a.lng) }))
      .sort((a, b) => a.dist - b.dist)[0]

    if (!amb) { log('No available ambulances', 'error'); return }

    const hosp = hospital || stateRef.current.rankedHospitals[0] || stateRef.current.hospitals[0]
    if (!hosp) { log('No hospital selected', 'error'); return }

    const dispatchId = Date.now()
    const newDispatch = {
      id: dispatchId, ambulance: amb, hospital: hosp, patient: loc,
      ambPosition: { lat: amb.lat, lng: amb.lng }, ambPhase: 'enroute_patient',
      leg1Route: null, leg2Route: null, leg1AltRoutes: [], leg2AltRoutes: [], selectedRouteIdx: 0,
    }

    dispatch({ type: 'SET', payload: {
      activeDispatches: [...stateRef.current.activeDispatches, newDispatch],
      ambulanceFleet: fleet,
      selectedAmbulance: amb,
      selectedHospital: hosp,
      ambPosition: { lat: amb.lat, lng: amb.lng },
      ambPhase: 'enroute_patient',
      dispatchMode: mode,
      leg1AltRoutes: [], leg2AltRoutes: [],
    }})

    if (mode === 'sos') startCancelWindow()

    // Fetch TomTom routes
    try {
      const { leg1Routes, leg2Routes, leg1, leg2 } = await getFullTomTomRoutes(
        amb.lat, amb.lng, loc.lat, loc.lng, hosp.lat, hosp.lng
      )
      updateDispatch(dispatchId, { leg1Route: leg1, leg2Route: leg2, leg1AltRoutes: leg1Routes, leg2AltRoutes: leg2Routes })
      dispatch({ type: 'SET', payload: { leg1Route: leg1, leg2Route: leg2, leg1AltRoutes: leg1Routes, leg2AltRoutes: leg2Routes, selectedLeg2RouteIdx: 0 }})

      // Animate leg1
      animateLeg(dispatchId, leg1Routes[0]?.coordinates ?? leg1.coordinates, 'enroute_patient', () => {
        updateDispatch(dispatchId, { ambPhase: 'pickup' })
        setTimeout(() => {
          // Animate leg2
          animateLeg(dispatchId, leg2Routes[0]?.coordinates ?? leg2.coordinates, 'enroute_hospital', () => {
            updateDispatch(dispatchId, { ambPhase: 'delivered' })
          })
        }, Math.max(200, 800 / speedRef.current))
      })

      // Reroute check
      startRerouteCheck(dispatchId, loc, hosp)

    } catch (err) {
      // Fallback: linear interpolation between points
      const STEPS = 80
      let s = 0
      const interval = setInterval(() => {
        s += Math.max(1, Math.round(speedRef.current / 4))
        const t = Math.min(s / STEPS, 1)
        if (t < 1) {
          updateDispatch(dispatchId, { ambPosition: lerpLatLng({ lat: amb.lat, lng: amb.lng }, loc, t), ambPhase: 'enroute_patient' })
        } else {
          clearInterval(interval)
          updateDispatch(dispatchId, { ambPhase: 'pickup' })
          setTimeout(() => {
            let s2 = 0
            const i2 = setInterval(() => {
              s2 += Math.max(1, Math.round(speedRef.current / 4))
              const t2 = Math.min(s2 / STEPS, 1)
              updateDispatch(dispatchId, { ambPosition: lerpLatLng(loc, { lat: hosp.lat, lng: hosp.lng }, t2), ambPhase: 'enroute_hospital' })
              if (t2 >= 1) { clearInterval(i2); updateDispatch(dispatchId, { ambPhase: 'delivered' }) }
            }, TICK_MS)
            animRefs.current.set(`${dispatchId}_2`, i2)
          }, 800)
        }
      }, TICK_MS)
      animRefs.current.set(dispatchId, interval)
    }
  }, [set, startCancelWindow, animateLeg, updateDispatch, log])

  // ── Reroute check ─────────────────────────────────────────────────────────
  const startRerouteCheck = useCallback((dispatchId, patLoc, hosp) => {
    clearInterval(rerouteRef.current)
    rerouteRef.current = setInterval(async () => {
      const dispatch_ = stateRef.current.activeDispatches.find(d => d.id === dispatchId)
      if (!dispatch_ || dispatch_.ambPhase === 'delivered') { clearInterval(rerouteRef.current); return }
      try {
        const routes = await getTomTomRoutes(patLoc.lat, patLoc.lng, hosp.lat, hosp.lng, 2)
        const cur = dispatch_.leg2AltRoutes[0]
        if (cur && routes[0] && routes[0].etaMin < cur.etaMin - 2) {
          updateDispatch(dispatchId, { leg2AltRoutes: routes })
          set({ rerouteAvailable: true, leg2AltRoutes: routes })
        }
      } catch {}
    }, 30000)
  }, [set, updateDispatch])

  // ── Select a leg2 route (mid-flight rerouting) ────────────────────────────
  const selectLeg2Route = useCallback((idx, dispatchId = null) => {
    const dis = stateRef.current.activeDispatches
    const tgt = dispatchId
      ? dis.find(d => d.id === dispatchId)
      : dis[dis.length - 1]
    if (!tgt) return

    const route = tgt.leg2AltRoutes[idx]
    if (!route) return

    // Swap coords mid-flight if currently animating leg2
    if (tgt.ambPhase === 'enroute_hospital') {
      const ref = leg2Refs.current.get(tgt.id)
      if (ref) {
        // Find closest point on new route to current ambPosition
        const cur = tgt.ambPosition
        if (cur) {
          let best = 0, bestDist = Infinity
          route.coordinates.forEach(([lat, lng], i) => {
            const d = Math.abs(lat - cur.lat) + Math.abs(lng - cur.lng)
            if (d < bestDist) { bestDist = d; best = i }
          })
          ref.coords = route.coordinates
          ref.idx = best
        } else {
          ref.coords = route.coordinates
          ref.idx = 0
        }
      }
    }

    updateDispatch(tgt.id, { leg2Route: route, selectedRouteIdx: idx })
    set({ leg2Route: route, selectedLeg2RouteIdx: idx, rerouteAvailable: false })
  }, [updateDispatch, set])

  // ── Current dispatch status helper ────────────────────────────────────────
  const sosPhase = state.activeDispatches.length > 0 ? 'dispatched' : 'idle'

  return (
    <AppContext.Provider value={{
      state: { ...state, sosPhase },
      dispatch, set, log,
      speedRef, animRefs,
      executeDispatch, cancelDispatch, selectLeg2Route, resetAll,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
