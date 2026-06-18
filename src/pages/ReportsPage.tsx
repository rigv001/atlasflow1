import { useEffect, useMemo, useState } from 'react'
import { Download, FileSpreadsheet, ShieldCheck, TrendingUp } from 'lucide-react'

import Sidebar from '../components/Sidebar'
import { FlowNode } from '../types'
import { loadCurrentUserNodes } from '../services/supplyNodes'
import { calculateScenarioCostImpact, getNetworkInsightSnapshot } from '../utils/networkAnalytics'

interface PageProps {
  onLogout: () => void
  settingsPath: string
}

interface ReportCard {
  id: string
  title: string
  desc: string
  tone: string
}

interface GeneratedReport {
  title: string
  subtitle: string
  generatedAt: string
  summary: string
  highlights: string[]
  tableRows: Array<{ supplier: string; category: string; region: string; intensity: number; risk: string }>
}

const reportCatalog: ReportCard[] = [
  {
    id: 'carbon-summary',
    title: 'Carbon Summary',
    desc: 'Board-ready emissions baseline, category hotspots, and intensity distribution.',
    tone: 'from-[#60a5fa] to-[#22d3ee]',
  },
  {
    id: 'supplier-performance',
    title: 'Supplier Performance',
    desc: 'Ranks the network by intensity and highlights where intervention is most urgent.',
    tone: 'from-[#38bdf8] to-[#2563eb]',
  },
  {
    id: 'compliance',
    title: 'Compliance Brief',
    desc: 'Creates an evidence-focused disclosure snapshot with defensible caveats.',
    tone: 'from-[#818cf8] to-[#38bdf8]',
  },
]

const getRiskLabel = (intensity: number) => {
  if (intensity > 100) return 'Critical'
  if (intensity >= 60) return 'Watchlist'
  return 'Optimized'
}

const buildReport = (reportId: string, nodes: FlowNode[]): GeneratedReport => {
  const insights = getNetworkInsightSnapshot(nodes)
  const generatedAt = new Date().toLocaleString()
  const tableRows = [...nodes]
    .sort((left, right) => right.data.carbonIntensity - left.data.carbonIntensity)
    .map((node) => ({
      supplier: node.data.label,
      category: node.data.category || 'General',
      region: node.data.region || 'AU',
      intensity: node.data.carbonIntensity,
      risk: getRiskLabel(node.data.carbonIntensity),
    }))

  if (reportId === 'supplier-performance') {
    return {
      title: 'Supplier Performance Review',
      subtitle: 'Intervention priority list for supplier decarbonisation planning',
      generatedAt,
      summary: `The current network contains ${insights.metrics.highRiskCount} critical suppliers. The largest reduction opportunity sits with ${insights.topOpportunities[0]?.label || 'the current hotspot supplier'}.`,
      highlights: insights.topOpportunities.map((item) => `${item.label}: reduce ${item.reduction} kgCO2e and avoid about $${item.annualSavings.toLocaleString()} in carbon cost exposure.`),
      tableRows,
    }
  }

  if (reportId === 'compliance') {
    const baselineImpact = calculateScenarioCostImpact(nodes, nodes)
    return {
      title: 'Compliance Readiness Brief',
      subtitle: 'Executive disclosure snapshot for internal review',
      generatedAt,
      summary: `AtlasFlow currently tracks ${nodes.length} suppliers with ${insights.metrics.totalEmissions} kgCO2e estimated emissions. ${insights.isolatedSuppliers.length} suppliers lack strong adjacency context and should be reviewed before formal submission.`,
      highlights: [
        `Average supplier intensity is ${insights.metrics.averageIntensity} kgCO2e.`,
        `${insights.metrics.highRiskCount} suppliers exceed the critical threshold.`,
        `Estimated current carbon-cost exposure is $${Math.abs(baselineImpact.costDelta).toLocaleString()} under the internal pricing assumption.`,
      ],
      tableRows,
    }
  }

  return {
    title: 'Carbon Summary Pack',
    subtitle: 'Operational emissions overview and hotspot concentration',
    generatedAt,
    summary: `Total estimated emissions are ${insights.metrics.totalEmissions} kgCO2e across ${nodes.length} suppliers. ${insights.categoryBreakdown[0]?.category || 'General'} is the heaviest-emitting category cluster.`,
    highlights: [
      `Top hotspot: ${insights.highestRiskSuppliers[0]?.data.label || 'No hotspot yet'} at ${insights.highestRiskSuppliers[0]?.data.carbonIntensity || 0} kgCO2e.`,
      `${insights.isolatedSuppliers.length} isolated suppliers may indicate weak relationship visibility in the network map.`,
      `${insights.topOpportunities.length} near-term decarbonisation opportunities have been identified for leadership review.`,
    ],
    tableRows,
  }
}

const downloadCsv = (report: GeneratedReport) => {
  const header = 'Supplier,Category,Region,Intensity,Risk'
  const rows = report.tableRows.map((row) => [row.supplier, row.category, row.region, row.intensity, row.risk].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
  const content = [header, ...rows].join('\n')
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${report.title.toLowerCase().replace(/\s+/g, '-')}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export default function ReportsPage({ onLogout, settingsPath }: PageProps) {
  const [nodes, setNodes] = useState<FlowNode[]>([])
  const [generatedReport, setGeneratedReport] = useState<GeneratedReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeReportId, setActiveReportId] = useState<string>('carbon-summary')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const { nodes: loadedNodes } = await loadCurrentUserNodes()
        setNodes(loadedNodes)
      } catch (error) {
        console.error('Failed to load report data', error)
        setErrorMessage('Unable to load report data.')
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [])

  const insights = useMemo(() => getNetworkInsightSnapshot(nodes), [nodes])

  useEffect(() => {
    if (!isLoading) {
      setGeneratedReport(buildReport(activeReportId, nodes))
    }
  }, [activeReportId, isLoading, nodes])

  return (
    <div className="flex h-screen overflow-hidden bg-[#050608] text-white" style={{ fontFamily: '"Plus Jakarta Sans", "Segoe UI", sans-serif' }}>
      <Sidebar onLogout={onLogout} settingsPath={settingsPath} />
      <div className="flex flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_24%),linear-gradient(180deg,#091019,#04070d)]">
        <header className="border-b border-sky-500/22 px-8 py-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="text-[12px] uppercase tracking-[0.24em] text-sky-200/46">Executive Reporting</div>
              <div className="mt-2 text-[34px] font-semibold tracking-[-0.05em] text-white">Board executive pack</div>
              <div className="mt-2 max-w-3xl text-sm leading-6 text-slate-200/72">
                Generate concise executive reports from the live supplier network, then export the risk table as CSV or print the final view as a PDF.
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <div className="rounded-[24px] border border-sky-500/28 bg-white/[0.035] px-4 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
                <div className="text-[11px] uppercase tracking-[0.18em] text-sky-100/50">Suppliers</div>
                <div className="mt-2 text-2xl font-semibold text-white">{nodes.length}</div>
              </div>
              <div className="rounded-[24px] border border-sky-500/28 bg-white/[0.035] px-4 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
                <div className="text-[11px] uppercase tracking-[0.18em] text-sky-100/50">Emissions</div>
                <div className="mt-2 text-2xl font-semibold text-white">{insights.metrics.totalEmissions}</div>
              </div>
              <div className="rounded-[24px] border border-sky-500/28 bg-white/[0.035] px-4 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
                <div className="text-[11px] uppercase tracking-[0.18em] text-sky-100/50">Critical</div>
                <div className="mt-2 text-2xl font-semibold text-white">{insights.metrics.highRiskCount}</div>
              </div>
              <div className="rounded-[24px] border border-sky-500/28 bg-white/[0.035] px-4 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
                <div className="text-[11px] uppercase tracking-[0.18em] text-sky-100/50">Opportunities</div>
                <div className="mt-2 text-2xl font-semibold text-white">{insights.topOpportunities.length}</div>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto px-8 py-8">
          {errorMessage ? <div className="mb-6 rounded-[20px] border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{errorMessage}</div> : null}

          <div className="mx-auto grid max-w-[1380px] grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <section className="space-y-6">
              <div className="rounded-[28px] border border-sky-500/26 bg-white/[0.035] p-6 shadow-[0_16px_44px_rgba(0,0,0,0.2)]">
                <div className="text-lg font-semibold text-white">Report library</div>
                <div className="mt-1 text-sm text-slate-200/64">Choose the story you want to tell. Each export uses the same live supplier dataset.</div>
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  {reportCatalog.map((report) => (
                    <button
                      key={report.id}
                      type="button"
                      onClick={() => setActiveReportId(report.id)}
                      className={`rounded-[24px] border p-5 text-left transition-all ${activeReportId === report.id ? 'border-sky-400/55 bg-sky-500/8 shadow-[0_0_0_1px_rgba(56,189,248,0.15)]' : 'border-sky-500/18 bg-black/20 hover:border-sky-400/34'}`}
                    >
                      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${report.tone}`}>
                        {report.id === 'carbon-summary' ? <TrendingUp size={18} className="text-[#08110d]" /> : report.id === 'supplier-performance' ? <FileSpreadsheet size={18} className="text-[#08110d]" /> : <ShieldCheck size={18} className="text-[#08110d]" />}
                      </div>
                      <div className="mt-4 text-base font-semibold text-white">{report.title}</div>
                      <div className="mt-2 text-sm leading-6 text-slate-200/64">{report.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-sky-500/26 bg-white/[0.035] p-6 shadow-[0_16px_44px_rgba(0,0,0,0.2)]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-lg font-semibold text-white">Export actions</div>
                    <div className="mt-1 text-sm text-slate-200/64">Use CSV for evidence tables and downstream analysis.</div>
                  </div>
                  <Download size={18} className="text-sky-200/64" />
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => generatedReport && downloadCsv(generatedReport)}
                    disabled={!generatedReport}
                    className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#38bdf8] px-5 text-sm font-medium text-[#08111a] shadow-[0_16px_42px_rgba(56,189,248,0.18)] disabled:opacity-50"
                  >
                    <FileSpreadsheet size={16} />
                    Export CSV
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-[30px] border border-sky-500/24 bg-[linear-gradient(180deg,rgba(10,18,30,0.96),rgba(6,11,20,0.94))] p-7 shadow-[0_22px_60px_rgba(0,0,0,0.28)]">
              {generatedReport ? (
                <>
                  <div className="flex flex-col gap-4 border-b border-sky-500/16 pb-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-[12px] uppercase tracking-[0.22em] text-sky-200/44">{generatedReport.title}</div>
                      <div className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">{generatedReport.subtitle}</div>
                      <div className="mt-2 max-w-3xl text-sm leading-6 text-slate-200/68">{generatedReport.summary}</div>
                    </div>
                    <div className="rounded-[20px] border border-sky-500/18 bg-sky-500/8 px-4 py-3 text-right text-xs text-sky-100/58">
                      <div>Generated</div>
                      <div className="mt-1 text-sm font-medium text-white/86">{generatedReport.generatedAt}</div>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-6 lg:grid-cols-[0.84fr_1.16fr]">
                    <div className="rounded-[24px] border border-sky-500/18 bg-sky-500/6 p-5">
                      <div className="text-sm font-semibold text-white">Headline insights</div>
                      <div className="mt-4 space-y-3">
                        {generatedReport.highlights.map((highlight) => (
                          <div key={highlight} className="rounded-[18px] border border-sky-500/16 bg-black/20 px-4 py-3 text-sm leading-6 text-slate-200/72">{highlight}</div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-sky-500/18 bg-sky-500/6 p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div className="text-sm font-semibold text-white">Supplier risk table</div>
                        <div className="text-xs uppercase tracking-[0.18em] text-sky-200/44">Live dataset</div>
                      </div>
                      <div className="mt-4 overflow-hidden rounded-[20px] border border-sky-500/18 bg-black/20">
                        <div className="grid grid-cols-[1.5fr_1fr_0.7fr_0.7fr_0.8fr] gap-3 border-b border-sky-500/16 px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-sky-200/44">
                          <span>Supplier</span>
                          <span>Category</span>
                          <span>Region</span>
                          <span>Intensity</span>
                          <span>Risk</span>
                        </div>
                        <div className="max-h-[480px] overflow-auto">
                          {generatedReport.tableRows.map((row) => (
                            <div key={`${row.supplier}-${row.region}`} className="grid grid-cols-[1.5fr_1fr_0.7fr_0.7fr_0.8fr] gap-3 border-b border-sky-500/12 px-4 py-3 text-sm text-slate-100/76 last:border-b-0">
                              <span className="font-medium text-white">{row.supplier}</span>
                              <span>{row.category}</span>
                              <span>{row.region}</span>
                              <span>{row.intensity}</span>
                              <span className={row.risk === 'Critical' ? 'text-rose-300' : row.risk === 'Watchlist' ? 'text-sky-300' : 'text-cyan-300'}>{row.risk}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-[24px] border border-dashed border-sky-500/18 bg-black/20 px-5 py-8 text-sm text-slate-200/58">
                  Generate a report to preview the executive pack.
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
