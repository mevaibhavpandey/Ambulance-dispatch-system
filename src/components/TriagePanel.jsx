import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../AppContext'
import { triageQuestions } from '../utils/triage'

const sevConfig = {
  critical: { label: 'CRITICAL', cls: 'sev-critical', dot: '#ff2233' },
  moderate: { label: 'MODERATE', cls: 'sev-moderate', dot: '#ffb000' },
  low: { label: 'LOW', cls: 'sev-low', dot: '#00ff88' },
}

export default function TriagePanel() {
  const { state, set, log } = useApp()
  const { emType, severity } = state

  const q = emType ? triageQuestions[emType] : null

  const selectSeverity = (sev) => {
    set({ severity: sev })
    log(`Triage complete — Severity: ${sev.toUpperCase()}`, sev === 'critical' ? 'error' : sev === 'moderate' ? 'warn' : 'success')
  }

  return (
    <div>
      <div className="panel-title">◈ AI TRIAGE</div>

      {!emType && (
        <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-dim)' }}>
          Select an emergency type to begin triage.
        </div>
      )}

      <AnimatePresence mode="wait">
        {q && (
          <motion.div
            key={emType}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="mb-2 leading-relaxed" style={{ fontSize: 12, color: 'var(--text)' }}>
              {q.question}
            </div>
            <div className="flex flex-col gap-1.5">
              {q.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => selectSeverity(opt.severity)}
                  className="text-left px-3 py-2 rounded transition-all"
                  style={{
                    border: `0.5px solid ${severity === opt.severity ? (opt.severity === 'critical' ? 'var(--red)' : opt.severity === 'moderate' ? 'var(--amber)' : 'var(--green)') : 'var(--border)'}`,
                    background: severity === opt.severity ? 'rgba(0,212,255,0.06)' : 'transparent',
                    color: 'var(--text)',
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  {opt.text}
                </button>
              ))}
            </div>

            {severity && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-3"
              >
                <span className={`severity-badge ${sevConfig[severity].cls}`}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: sevConfig[severity].dot, display: 'inline-block' }} />
                  SEVERITY: {sevConfig[severity].label}
                </span>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
