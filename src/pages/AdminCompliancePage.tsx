import { useEffect, useMemo, useState } from 'react'
import { FileWarning, ShieldCheck, ShieldX, TableProperties } from 'lucide-react'

import AdminShell from '../admin/AdminShell'
import { loadAdminDataSnapshot, type AdminClientInsight } from '../admin/adminData'
import { formatAppError } from '../utils/errors'

interface PageProps {
  onLogout: () => void
}

export default function AdminCompliancePage({ onLogout }: PageProps) {
  const [clients, setClients] = useState<AdminClientInsight[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const snapshot = await loadAdminDataSnapshot()
        setClients(snapshot.clients)
        setErrorMessage('')
      } catch (error) {
        console.error('Failed to load admin compliance page', error)
        setErrorMessage(`Unable to load compliance data. ${formatAppError(error, 'Unknown compliance data error.')}`)
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [])

  const totals = useMemo(() => {
    return clients.reduce(
      (summary, client) => {
        summary.coverage += client.complianceScore
        summary.critical += client.highRiskCount
        summary.clients += 1
        return summary
      },
      { coverage: 0, critical: 0, clients: 0 },
    )
  }, [clients])

  const averageCoverage = totals.clients === 0 ? 0 : Math.round(totals.coverage / totals.clients)

  return (
    <AdminShell
      onLogout={onLogout}
      eyebrow="Compliance Hub"
      title="Admin Compliance Hub"
      description="Track documentation readiness and hotspot exposure from one dark governance surface. This page is purpose-built for admin review rather than repackaging the client report screens."
    >
      {errorMessage ? <div className="admin-surface surface-sm mb-6 rounded-[24px] bg-[linear-gradient(180deg,rgba(127,29,29,0.28),rgba(69,10,10,0.22))] px-5 py-4 text-sm text-rose-100">{errorMessage}</div> : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="admin-surface surface-md rounded-[26px] p-5"><div className="flex items-center gap-3 text-white"><ShieldCheck size={18} className="text-emerald-100" /><span>Average coverage</span></div><div className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-white">{averageCoverage}%</div></div>
        <div className="admin-surface surface-md rounded-[26px] p-5"><div className="flex items-center gap-3 text-white"><ShieldX size={18} className="text-amber-100" /><span>Critical suppliers</span></div><div className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-white">{totals.critical}</div></div>
        <div className="admin-surface surface-md rounded-[26px] p-5"><div className="flex items-center gap-3 text-white"><TableProperties size={18} className="text-cyan-100" /><span>Client audits</span></div><div className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-white">{clients.length}</div></div>
      </div>

      <div className="admin-surface surface-lg mt-6 rounded-[30px] p-6">
        <div className="flex items-center gap-3 text-white"><FileWarning size={18} className="text-rose-100" /><div className="text-lg font-semibold">Compliance watchlist</div></div>
        <div className="mt-5 overflow-x-auto">
          {isLoading ? (
            <div className="admin-surface surface-sm rounded-[22px] px-4 py-6 text-sm text-slate-400">Loading compliance watchlist...</div>
          ) : clients.length === 0 ? (
            <div className="admin-surface surface-sm rounded-[22px] px-4 py-6 text-sm text-slate-400">No persisted client compliance records are available yet.</div>
          ) : (
            <table className="min-w-full divide-y divide-white/8 text-left text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Coverage</th>
                  <th className="px-4 py-3">Critical suppliers</th>
                  <th className="px-4 py-3">Hotspot</th>
                  <th className="px-4 py-3">Recommended action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6">
                {clients.map((client) => (
                  <tr key={client.userId} className="text-slate-200/78">
                    <td className="px-4 py-4 font-medium text-white">{client.email}</td>
                    <td className="px-4 py-4">{client.complianceScore}%</td>
                    <td className="px-4 py-4">{client.highRiskCount}</td>
                    <td className="px-4 py-4">{client.topCategory}</td>
                    <td className="px-4 py-4">{client.complianceScore < 80 ? 'Collect missing metadata and validate source notes.' : client.highRiskCount > 0 ? 'Escalate hotspot remediation plan.' : 'Monitor on monthly cadence.'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminShell>
  )
}
