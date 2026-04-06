import React, { useState } from 'react'
import { useApp } from '../AppContext'
import { SectionHeader } from './AmbulancePanel'

export default function HospitalPanel() {
  const { state, executeDispatch, set } = useApp()
  const { rankedHospitals, selectedHospital, sosPhase, hospitalsLoading } = state
  const [search, setSearch] = useState('')

  const list = rankedHospitals.filter(h =>
    !search || h.name.toLowerCase().includes(search.toLowerCase()) ||
    (h.specializations ?? []).some(s => s.includes(search.toLowerCase()))
  ).slice(0, 40)

  if (hospitalsLoading) return (
    <div style={{ textAlign: 'center', padding: 24, color: '#8a6068', fontFamily: 'Rajdhani', fontSize: 12 }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>Loading hospitals…
    </div>
  )

  return (
    <div>
      <SectionHeader icon="🏥" count={rankedHospitals.length} label="NEARBY HOSPITALS" />

      {/* Search */}
      <input
        placeholder="Search hospitals or specializations…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{
          width: '100%', padding: '7px 10px', marginBottom: 10,
          border: '1px solid rgba(204,0,24,0.2)', borderRadius: 7,
          fontFamily: 'Rajdhani', fontSize: 11, color: '#333',
          outline: 'none', background: '#fff',
          boxSizing: 'border-box',
        }}
      />

      {list.map((h, i) => {
        const hId       = h.id ?? h.osmId
        const selId     = selectedHospital?.id ?? selectedHospital?.osmId
        const isSelected = hId === selId
        const typeColor  = h.type === 'government' ? '#0055cc' : '#cc0018'

        return (
          <div key={hId ?? i} style={{
            background: '#fff',
            border: `1px solid ${isSelected ? '#cc0018' : 'rgba(200,0,24,0.1)'}`,
            borderLeft: `4px solid ${isSelected ? '#cc0018' : 'rgba(200,0,24,0.25)'}`,
            borderRadius: 8, padding: '10px 12px', marginBottom: 8,
            transition: 'all 0.2s',
            boxShadow: isSelected ? '0 3px 12px rgba(204,0,24,0.15)' : '0 1px 4px rgba(0,0,0,0.04)',
            cursor: 'default',
          }}>
            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Name with H badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 3, background: '#cc0018', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ color: '#fff', fontWeight: 900, fontSize: 11 }}>H</span>
                  </div>
                  <div style={{
                    fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 12, color: '#1a1a1a',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180,
                  }} title={h.name}>{h.name}</div>
                  {i === 0 && (
                    <span style={{ background: '#cc0018', color: '#fff', fontSize: 8, padding: '1px 5px', borderRadius: 10, fontWeight: 700 }}>★ BEST</span>
                  )}
                </div>

                {/* Stats row */}
                <div style={{ display: 'flex', gap: 10, fontFamily: 'Share Tech Mono', fontSize: 9, color: '#888', flexWrap: 'wrap', marginBottom: 4 }}>
                  {h.distKm && <span>📍 {h.distKm} km</span>}
                  {h.etaMin && <span>⏱ ~{h.etaMin} min</span>}
                </div>

                {/* Badges */}
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: 8.5, padding: '2px 6px', borderRadius: 10, fontWeight: 700,
                    background: `${typeColor}18`, color: typeColor, border: `1px solid ${typeColor}40`,
                  }}>{(h.type ?? 'PRIVATE').toUpperCase()}</span>
                  {h.emergency && (
                    <span style={{ fontSize: 8.5, padding: '2px 6px', borderRadius: 10, fontWeight: 700, background: 'rgba(204,0,24,0.1)', color: '#cc0018', border: '1px solid rgba(204,0,24,0.25)' }}>24H ER</span>
                  )}
                  {(h.specializations ?? []).slice(0, 2).map(s => (
                    <span key={s} style={{ fontSize: 8, padding: '2px 5px', borderRadius: 10, background: '#f5f5f5', color: '#666', border: '1px solid #e0e0e0', textTransform: 'capitalize' }}>{s}</span>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                {/* Select as target */}
                <button
                  onClick={() => set({ selectedHospital: h })}
                  style={{
                    padding: '4px 8px', borderRadius: 5, fontSize: 9, fontWeight: 700,
                    fontFamily: 'Rajdhani', letterSpacing: 0.5, cursor: 'pointer',
                    border: `1px solid ${isSelected ? '#cc0018' : 'rgba(204,0,24,0.25)'}`,
                    background: isSelected ? '#cc0018' : '#fff',
                    color: isSelected ? '#fff' : '#cc0018',
                  }}
                >
                  {isSelected ? '✓ SELECTED' : 'SELECT'}
                </button>

                {/* Dispatch to this hospital */}
                {sosPhase === 'idle' && (
                  <button
                    onClick={() => executeDispatch({ mode: 'direct', hospital: h })}
                    style={{
                      padding: '4px 8px', borderRadius: 5, fontSize: 9, fontWeight: 700,
                      fontFamily: 'Rajdhani', letterSpacing: 0.5, cursor: 'pointer',
                      border: 'none',
                      background: 'linear-gradient(135deg, #cc0018, #990012)',
                      color: '#fff',
                      boxShadow: '0 1px 4px rgba(204,0,24,0.3)',
                    }}
                  >
                    DISPATCH
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })}

      {list.length === 0 && (
        <div style={{ textAlign: 'center', color: '#8a6068', fontFamily: 'Rajdhani', fontSize: 12, padding: 16 }}>
          No hospitals match your search
        </div>
      )}
    </div>
  )
}
