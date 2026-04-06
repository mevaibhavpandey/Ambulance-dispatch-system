import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../AppContext'
import { firstAidGuides } from '../utils/firstAid'

export default function FirstAidPanel() {
  const { state } = useApp()
  const { emType } = state

  const guide = emType ? firstAidGuides[emType] : null

  return (
    <div>
      <div className="panel-title">◈ FIRST-AID GUIDE</div>

      {!guide && (
        <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-dim)' }}>
          Select emergency type for guidance.
        </div>
      )}

      <AnimatePresence mode="wait">
        {guide && (
          <motion.div
            key={emType}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="font-bold mb-3 text-sm tracking-wide"
              style={{ color: guide.color }}
            >
              {guide.title}
            </div>
            {guide.steps.map((step, i) => (
              <div key={i} className="firstaid-step">
                <div style={{ fontSize: 16, flexShrink: 0, lineHeight: 1 }}>{step.icon}</div>
                <div style={{ fontSize: 11, color: 'var(--text)', lineHeight: 1.6 }}>{step.text}</div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
