import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getAllCases, createCase, updateCase, deleteCase, getCaseById } from '../utils/db'

const CaseContext = createContext()

export function CaseProvider({ children }) {
  const [cases, setCases] = useState([])
  const [currentCase, setCurrentCase] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadCases = useCallback(async () => {
    try {
      setLoading(true)
      const allCases = await getAllCases()
      setCases(allCases)
    } catch (err) {
      console.error('加载案件列表失败:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCases()
  }, [loadCases])

  const addCase = useCallback(async (caseData) => {
    const newCase = await createCase(caseData)
    setCases(prev => [newCase, ...prev])
    return newCase
  }, [])

  const editCase = useCallback(async (id, updates) => {
    const updated = await updateCase(id, updates)
    setCases(prev => prev.map(c => c.id === id ? { ...c, ...updated } : c))
    if (currentCase?.id === id) {
      setCurrentCase({ ...currentCase, ...updated })
    }
    return updated
  }, [currentCase])

  const removeCase = useCallback(async (id) => {
    await deleteCase(id)
    setCases(prev => prev.filter(c => c.id !== id))
    if (currentCase?.id === id) {
      setCurrentCase(null)
    }
  }, [currentCase])

  const selectCase = useCallback(async (id) => {
    const caseData = await getCaseById(id)
    setCurrentCase(caseData)
    return caseData
  }, [])

  const clearCurrentCase = useCallback(() => {
    setCurrentCase(null)
  }, [])

  const value = {
    cases,
    currentCase,
    loading,
    loadCases,
    addCase,
    editCase,
    removeCase,
    selectCase,
    clearCurrentCase,
  }

  return (
    <CaseContext.Provider value={value}>
      {children}
    </CaseContext.Provider>
  )
}

export function useCase() {
  const context = useContext(CaseContext)
  if (!context) {
    throw new Error('useCase must be used within a CaseProvider')
  }
  return context
}

export default CaseContext
