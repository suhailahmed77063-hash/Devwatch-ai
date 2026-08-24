import { createContext, useContext, useState, useCallback } from 'react'

/**
 * Active-case context (SIH26047 §59). The case-taking flow screens
 * (/cases/smart-taking, /cases/ai-questions, …) are fixed paths, not
 * parameterized by caseId, so we thread the "case in progress" through context
 * and mirror it to localStorage to survive reloads during a demo.
 *
 * Shape: { id, caseNumber, patient: { id, name, publicId?, age?, gender? },
 *          chiefComplaint?, duration?, severity? }
 * The optional clinical fields hydrate the shared right-rail PatientSummary as
 * the doctor moves through the flow, without every screen re-fetching.
 */

const CaseContext = createContext(null)
const STORAGE_KEY = 'casecare.activeCase'

function readStored() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
  } catch {
    return null
  }
}

export function CaseProvider({ children }) {
  const [activeCase, setActiveCaseState] = useState(readStored)

  const setActiveCase = useCallback((next) => {
    setActiveCaseState(next)
    try {
      if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* storage unavailable — context still works for this session */
    }
  }, [])

  const clearActiveCase = useCallback(() => setActiveCase(null), [setActiveCase])

  return (
    <CaseContext.Provider value={{ activeCase, setActiveCase, clearActiveCase }}>
      {children}
    </CaseContext.Provider>
  )
}

export function useActiveCase() {
  const ctx = useContext(CaseContext)
  if (!ctx) throw new Error('useActiveCase must be used within CaseProvider')
  return ctx
}
