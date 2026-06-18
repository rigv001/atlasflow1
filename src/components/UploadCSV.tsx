// AtlasFlow - CSV upload component
// Lets users upload a simple CSV to add supplier nodes

import Papa from 'papaparse'
import { FlowNode } from '../types'

interface UploadCSVProps {
  onNodesAdd: (newNodes: FlowNode[]) => void | Promise<void>
  onStatusChange?: (message: string) => void
  onError?: (message: string) => void
}

interface CsvRow {
  name?: string
  carbon?: string
  category?: string
  region?: string
  notes?: string
}

export default function UploadCSV({ onNodesAdd, onStatusChange, onError }: UploadCSVProps) {
  // --- Section: Handle file upload ---
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    onStatusChange?.('Importing supplier CSV...')
    onError?.('')

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const newNodes: FlowNode[] = []

        results.data.forEach((row, index) => {
          if (row.name && row.carbon) {
            newNodes.push({
              id: `csv-${Date.now()}-${index}`,
              type: 'supplier',
              position: { x: 100 + index * 180, y: 150 },
              data: {
                label: row.name.trim(),
                carbonIntensity: parseFloat(row.carbon) || 50,
                category: row.category?.trim() || 'General',
                region: row.region?.trim() || 'AU',
                notes: row.notes?.trim() || '',
              },
            })
          }
        })

        if (newNodes.length > 0) {
          await onNodesAdd(newNodes)
        } else {
          onStatusChange?.('')
          onError?.('No valid rows found. Use columns named name and carbon, with optional category, region, and notes fields.')
        }
      },
      error: (error) => {
        onStatusChange?.('')
        onError?.(`CSV import failed: ${error.message}`)
      },
    })

    // Reset the input
    event.target.value = ''
  }

  return (
    <div className="rounded-[18px] border border-[#1b2028] bg-[#090b10] p-6 shadow-[0_8px_32px_rgba(0,0,0,.35)]">
      <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-white">Upload Supplier Data</h4>
      <p className="mb-4 text-sm text-[#8a93a3]">
        Upload a CSV with columns: name, carbon, and optional category, region, notes.
      </p>

      <label className="inline-flex cursor-pointer items-center rounded-2xl border border-[#64e0dd]/30 px-4 py-2 text-sm font-medium text-[#64e0dd] transition-colors hover:bg-[#64e0dd]/10">
        <span>Choose CSV File</span>
        <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
      </label>
    </div>
  )
}