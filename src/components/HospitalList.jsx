import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../AppContext'

export default function HospitalList() {
  const { state, set, log } = useApp()
  const { rankedHospitals, selectedHospital, hospitalsLoading, hospitals } = state

  const select = (h) => {
    set({ selectedHospital: h })
    log(`Hospital selected: ${h.name}`, 'info')
  }

  if (hospitalsLoading) {
    return (
      <div>
        <div className="panel-title">◈ HOSPITALS</div>
        <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-dim)' }}>
          Fetching from OpenStreetMap...
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>◈ HOSPITALS</span>
        {hospitals.length > 0 && (
          <span className="font-mono" style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: 0 }}>
            {hospitals.length} nearby
          </span>
        )}
      </div>

      {rankedHospitals.length === 0 && (
        <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-dim)' }}>
          Set location to load hospitals.
        </div>
      )}

      <AnimatePresence>
        {rankedHospitals.map((h, i) => (
          <motion.div
            key={h.id || h.osmId || i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            className={`hosp-card ${selectedHospital?.id === h.id || selectedHospital?.osmId === h.osmId ? 'best' : ''}`}
            onClick={() => select(h)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="font-bold" style={{ fontSize: 12, color: 'var(--cyan)', flex: 1, marginRight: 8 }}>
                {i === 0 && <span style={{ color: 'var(--amber)' }}>★ </span>}
                {h.name}
              </div>
              <div className="font-mono" style={{ fontSize: 10, color: 'var(--green)', whiteSpace: 'nowrap' }}>
                {h.score} pts
              </div>
            </div>
            <div className="font-mono mt-0.5" style={{ fontSize: 10, color: 'var(--text-dim)' }}>
              {h.distKm} km · ~{h.etaMin} min
            </div>
            <div className="font-mono" style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 2 }}>
              {(h.specializations || []).join(', ')}
            </div>
            <div style={{ marginTop: 4 }}>
              <span
                className="font-mono"
                style={{
                  fontSize: 9,
                  padding: '2px 6px',
                  borderRadius: 2,
                  background: h.type === 'government' ? 'rgba(0,212,255,0.1)' : 'rgba(255,176,0,0.1)',
                  color: h.type === 'government' ? 'var(--cyan)' : 'var(--amber)',
                }}
              >
                {(h.type || 'private').toUpperCase()}
              </span>
              {h.emergency && (
                <span className="font-mono ml-1" style={{ fontSize: 9, padding: '2px 6px', borderRadius: 2, background: 'rgba(255,34,51,0.1)', color: 'var(--red)' }}>
                  24H ER
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
