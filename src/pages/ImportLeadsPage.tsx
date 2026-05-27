import { useState, useEffect, useRef } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../firebase/AuthContext'
import { useRole } from '../firebase/useRole'
import { useCRM } from '../firebase/CRMContext'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'
import type { LeadSource, LeadStatus } from '../types'
import { LEAD_SOURCES, LEAD_STATUSES } from '../types'

interface ImportPermissions {
  employee: boolean
  team_lead: boolean
  admin: boolean
}

// CRM fields that can be mapped
const CRM_FIELDS: { key: string; label: string; required?: boolean }[] = [
  { key: 'full_name', label: 'Full Name', required: true },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'company', label: 'Company' },
  { key: 'location', label: 'Location' },
  { key: 'lead_source', label: 'Type of Business' },
  { key: 'status', label: 'Status' },
  { key: 'assigned_to', label: 'Assigned To' },
  { key: 'followup_date', label: 'Follow-up Date' },
  { key: 'notes', label: 'Notes' },
  { key: 'website_link', label: 'Website Link' },
]

// Auto-detect mapping based on common header names
function autoDetect(excelCol: string): string {
  const c = excelCol.toLowerCase().replace(/[\s_-]/g, '')
  if (['fullname', 'name', 'leadname', 'clientname', 'customername'].includes(c)) return 'full_name'
  if (['phone', 'mobile', 'contact', 'phonenumber', 'mobilenumber', 'contactnumber'].includes(c)) return 'phone'
  if (['email', 'emailaddress', 'emailid', 'mail'].includes(c)) return 'email'
  if (['company', 'firm', 'organization', 'organisation', 'companyname'].includes(c)) return 'company'
  if (['leadsource', 'source', 'type', 'typeofbusiness', 'businesstype', 'category'].includes(c)) return 'lead_source'
  if (['status', 'leadstatus', 'stage'].includes(c)) return 'status'
  if (['assignedto', 'assigned', 'salesperson', 'owner', 'agent'].includes(c)) return 'assigned_to'
  if (['followupdate', 'followup', 'nextfollowup', 'nextcontact', 'duedate'].includes(c)) return 'followup_date'
  if (['notes', 'note', 'remarks', 'comment', 'comments', 'description'].includes(c)) return 'notes'
  if (['website', 'websitelink', 'url', 'web', 'siteurl'].includes(c)) return 'website_link'
  if (['location', 'city', 'state', 'address', 'place', 'region', 'area'].includes(c)) return 'location'
  return ''
}

export function ImportLeadsPage() {
  const { currentUser } = useAuth()
  const { isAdmin } = useRole()
  const { addLead, addActivity } = useCRM()
  const navigate = useNavigate()

  const [permissions, setPermissions] = useState<ImportPermissions>({ employee: true, team_lead: true, admin: true })
  const [loadingPerms, setLoadingPerms] = useState(true)
  const [savingPerms, setSavingPerms] = useState(false)

  // Step 1: file selected
  const [excelColumns, setExcelColumns] = useState<string[]>([])
  const [allRows, setAllRows] = useState<Record<string, string>[]>([])
  const [fileName, setFileName] = useState('')

  // Step 2: mapping
  const [mapping, setMapping] = useState<Record<string, string>>({}) // excelCol -> crmField
  const [step, setStep] = useState<'upload' | 'map' | 'done'>('upload')

  // Step 3: result
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getDoc(doc(db, 'settings', 'import_permissions')).then((snap) => {
      if (snap.exists()) setPermissions((prev) => ({ ...prev, ...(snap.data() as Partial<ImportPermissions>) }))
      setLoadingPerms(false)
    })
  }, [])

  const hasPermission = currentUser ? permissions[currentUser.role as keyof ImportPermissions] : false

  if (!loadingPerms && !hasPermission && !isAdmin) {
    return (
      <div className="max-w-screen-md mx-auto py-16 text-center">
        <p className="text-gray-500 text-sm">You don't have permission to import leads.</p>
        <p className="text-gray-400 text-xs mt-1">Contact your Admin to request access.</p>
      </div>
    )
  }

  const savePermissions = async () => {
    setSavingPerms(true)
    await setDoc(doc(db, 'settings', 'import_permissions'), permissions)
    setSavingPerms(false)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFileName(f.name)
    setResult(null)

    const reader = new FileReader()
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer)
      const wb = XLSX.read(data, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })
      if (rows.length === 0) return

      const cols = Object.keys(rows[0])
      setExcelColumns(cols)
      setAllRows(rows)

      // Auto-detect mapping
      const autoMap: Record<string, string> = {}
      cols.forEach((col) => {
        const detected = autoDetect(col)
        if (detected) autoMap[col] = detected
      })
      setMapping(autoMap)
      setStep('map')
    }
    reader.readAsArrayBuffer(f)
  }

  const handleImport = async () => {
    if (!currentUser || allRows.length === 0) return
    setImporting(true)

    // Build reverse mapping: crmField -> excelCol
    const reverseMap: Record<string, string> = {}
    Object.entries(mapping).forEach(([excelCol, crmField]) => {
      if (crmField) reverseMap[crmField] = excelCol
    })

    let imported = 0
    let skipped = 0
    const errors: string[] = []

    for (const row of allRows) {
      const getValue = (field: string) => {
        const col = reverseMap[field]
        return col ? (row[col] ?? '').toString().trim() : ''
      }

      const name = getValue('full_name')
      if (!name) { skipped++; continue }

      const rawSource = getValue('lead_source')
      const source: LeadSource = LEAD_SOURCES.includes(rawSource as LeadSource) ? (rawSource as LeadSource) : 'Other'

      const rawStatus = getValue('status')
      const status: LeadStatus = LEAD_STATUSES.includes(rawStatus as LeadStatus) ? (rawStatus as LeadStatus) : 'New Lead'

      const leadData = {
        full_name: name,
        phone: getValue('phone'),
        email: getValue('email'),
        company: getValue('company'),
        lead_source: source,
        assigned_to: currentUser.name,
        assigned_to_uid: currentUser.uid,
        status,
        followup_date: getValue('followup_date') || null,
        notes: getValue('notes'),
        website_link: getValue('website_link'),
        business_type: '',
        location: getValue('location'),
        followup_status: 'Ongoing' as const,
      }

      try {
        await addLead(leadData)
        imported++
      } catch (err) {
        errors.push(`"${name}": ${err instanceof Error ? err.message : 'Unknown error'}`)
        skipped++
      }
    }

    // Log the import
    await addActivity({
      lead_id: 'import',
      activity_type: 'Note',
      description: `${currentUser.name} imported ${imported} leads from "${fileName}"`,
      performed_by_uid: currentUser.uid,
      performed_by_name: currentUser.name,
      performed_by_role: currentUser.role,
    })

    setResult({ imported, skipped, errors })
    setImporting(false)
    setStep('done')
  }

  const reset = () => {
    setStep('upload')
    setExcelColumns([])
    setAllRows([])
    setMapping({})
    setFileName('')
    setResult(null)
    if (fileRef.current) fileRef.current.value = ''
  }
  return (
    <div className="max-w-screen-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import Leads</h1>
        <p className="text-sm text-gray-500 mt-0.5">Upload an Excel or CSV file to bulk import leads</p>
      </div>

      {/* Admin: Permission Control */}
      {isAdmin && !loadingPerms && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Import Permissions</h2>
          <p className="text-xs text-gray-500 mb-4">Control which roles can import leads.</p>
          <div className="flex items-center gap-6">
            {(['employee', 'team_lead', 'admin'] as const).map((role) => (
              <label key={role} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={permissions[role]}
                  onChange={(e) => setPermissions((p) => ({ ...p, [role]: e.target.checked }))}
                  className="w-4 h-4 accent-green-600" />
                <span className="text-sm text-gray-700 capitalize">{role.replace('_', ' ')}</span>
              </label>
            ))}
          </div>
          <button onClick={savePermissions} disabled={savingPerms}
            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
            {savingPerms ? 'Saving...' : 'Save Permissions'}
          </button>
        </div>
      )}

      {/* STEP 1: Upload */}
      {hasPermission && step === 'upload' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Step 1 — Choose File</h2>
          <p className="text-xs text-gray-500">Accepts .xlsx, .xls, .csv. Any column names are supported — you'll map them in the next step.</p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange}
            className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100 cursor-pointer" />
        </div>
      )}

      {/* STEP 2: Column Mapping */}
      {hasPermission && step === 'map' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-700">Step 2 — Map Columns</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                File: <span className="font-medium text-gray-700">{fileName}</span> · {allRows.length} rows detected
              </p>
            </div>
            <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              ← Change file
            </button>
          </div>

          <div className="border border-gray-100 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-2 gap-4 px-4 py-2 bg-gray-50 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Excel Column</span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Maps to CRM Field</span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-gray-50">
              {excelColumns.map((col) => (
                <div key={col} className="grid grid-cols-2 gap-4 px-4 py-3 items-center hover:bg-gray-50/50">
                  {/* Excel column name */}
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                    <span className="text-sm text-gray-800 font-medium truncate">{col}</span>
                    {allRows[0]?.[col] && (
                      <span className="text-xs text-gray-400 truncate">e.g. "{String(allRows[0][col]).slice(0, 20)}"</span>
                    )}
                  </div>

                  {/* CRM field dropdown */}
                  <select
                    value={mapping[col] ?? ''}
                    onChange={(e) => setMapping((m) => ({ ...m, [col]: e.target.value }))}
                    className={`rounded-lg border px-3 py-1.5 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none ${
                      mapping[col] ? 'border-green-300 bg-green-50 text-green-800' : 'border-gray-200 bg-white text-gray-600'
                    }`}
                  >
                    <option value="">— Skip / Ignore —</option>
                    {CRM_FIELDS.map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.label}{f.required ? ' *' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Validation */}
          {!Object.values(mapping).includes('full_name') && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              ⚠ "Full Name" must be mapped to proceed. Rows without a name will be skipped.
            </p>
          )}

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-gray-400">
              {Object.values(mapping).filter(Boolean).length} of {excelColumns.length} columns mapped
            </p>
            <button
              onClick={handleImport}
              disabled={importing}
              className="px-5 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {importing ? 'Importing...' : `Import ${allRows.length} Rows →`}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Result */}
      {step === 'done' && result && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Import Complete</h2>
          <div className={`rounded-lg p-4 ${result.errors.length > 0 ? 'bg-amber-50 border border-amber-100' : 'bg-green-50 border border-green-100'}`}>
            <p className="text-sm font-medium text-gray-800">
              ✅ {result.imported} leads imported &nbsp;·&nbsp; ⏭ {result.skipped} skipped
            </p>
            {result.errors.length > 0 && (
              <ul className="mt-2 space-y-1">
                {result.errors.map((e, i) => (
                  <li key={i} className="text-xs text-red-600">{e}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={reset}
              className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Import Another File
            </button>
            <button onClick={() => navigate('/leads')}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors">
              View Leads →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
