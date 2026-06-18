import { useEffect, useRef, useState } from 'react'

import { FlowNode } from '../types'

interface BufferedPersistenceOptions {
  initialNodes: FlowNode[]
  debounceMs?: number
  onPersist?: (nodes: FlowNode[]) => Promise<void> | void
  onPersistSuccess?: () => void
  onPersistError?: (message: string) => void
}

interface BufferedPersistenceResult {
  nodes: FlowNode[]
  setImmediateNodes: (nodes: FlowNode[]) => void
  updateNode: (nodeId: string, updater: (node: FlowNode) => FlowNode) => void
  flushNow: () => Promise<void>
  isPersisting: boolean
  hasPendingChanges: boolean
}

export function useBufferedNodePersistence({
  initialNodes,
  debounceMs = 350,
  onPersist,
  onPersistSuccess,
  onPersistError,
}: BufferedPersistenceOptions): BufferedPersistenceResult {
  const [nodes, setNodes] = useState<FlowNode[]>(initialNodes)
  const [isPersisting, setIsPersisting] = useState(false)
  const [hasPendingChanges, setHasPendingChanges] = useState(false)
  const latestNodesRef = useRef(initialNodes)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const persistVersionRef = useRef(0)
  const mountedRef = useRef(true)

  useEffect(() => {
    latestNodesRef.current = initialNodes
    setNodes(initialNodes)
    setHasPendingChanges(false)
  }, [initialNodes])

  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  const flushNow = async () => {
    if (!onPersist || !hasPendingChanges) return

    const currentVersion = ++persistVersionRef.current
    setIsPersisting(true)

    try {
      await onPersist(latestNodesRef.current)
      if (!mountedRef.current) return
      if (currentVersion === persistVersionRef.current) {
        setHasPendingChanges(false)
        onPersistSuccess?.()
      }
    } catch (error) {
      if (!mountedRef.current) return
      const message = error instanceof Error ? error.message : 'Unable to save supplier updates.'
      onPersistError?.(message)
    } finally {
      if (mountedRef.current && currentVersion === persistVersionRef.current) {
        setIsPersisting(false)
      }
    }
  }

  const schedulePersist = () => {
    if (!onPersist) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      void flushNow()
    }, debounceMs)
  }

  const setImmediateNodes = (nextNodes: FlowNode[]) => {
    latestNodesRef.current = nextNodes
    setNodes(nextNodes)
    setHasPendingChanges(true)
    schedulePersist()
  }

  const updateNode = (nodeId: string, updater: (node: FlowNode) => FlowNode) => {
    const nextNodes = latestNodesRef.current.map((node) => (node.id === nodeId ? updater(node) : node))
    setImmediateNodes(nextNodes)
  }

  return {
    nodes,
    setImmediateNodes,
    updateNode,
    flushNow,
    isPersisting,
    hasPendingChanges,
  }
}
