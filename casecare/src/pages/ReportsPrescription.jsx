import { useState } from 'react'
import {
  FileText, Printer, Download, CheckCircle2, Plus, MoreVertical, Image as ImageIcon,
  Trash2, ChevronLeft, LayoutTemplate, FileDown,
} from 'lucide-react'
import Breadcrumbs from '../components/Breadcrumbs'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import Card from '../components/Card'
import Badge from '../components/Badge'
import Input, { Textarea } from '../components/Input'
import Dropdown, { DropdownItem } from '../components/Dropdown'
import PatientSummary from '../components/PatientSummary'
import { Ico } from '../utils/icons'
import { uploadedReports, prescriptionMeds, vitalsCompact, keyClinicalIndicators, casePatient } from '../data/caseData'

const indicatorTone = { neutral: 'text-navy-800', muted: 'text-slate-400', warn: 'text-amber-600' }

export default function ReportsPrescription() {
  const [meds, setMeds] = useState(prescriptionMeds)
  const [instructions, setInstructions] = useState('Take adequate rest and plenty of fluids. Avoid cold drinks. Complete the full course.')

  return (
    <div className="space-y-5">
      <Breadcrumbs
        items={[
          { label: 'Cases', to: '/cases' },
          { label: 'New Case', to: '/cases/new' },
          { label: 'Doctor Review', to: '/cases/review' },
          { label: 'Reports & Prescription' },
        ]}
      />
      <PageHeader
        title="Reports & Prescription"
        icon={FileText}
        subtitle="View patient reports and generate the prescription."
        actions={
          <>
            <Button variant="secondary" icon={Printer}>Print</Button>
            <Button variant="secondary" icon={Download}>Download</Button>
            <Button icon={CheckCircle2}>Save & Complete Case</Button>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-12">
        {/* Reports column */}
        <div className="lg:col-span-3">
          <Card
            title={
              <div className="flex items-center gap-2">
                <h3 className="text-[15px] font-semibold text-navy-900">Uploaded Reports</h3>
                <span className="rounded-full bg-slate-100 px-2 text-xs font-semibold text-slate-500">{uploadedReports.length}</span>
              </div>
            }
            action={<Button variant="soft" size="xs" icon={Plus}>Add Report</Button>}
          >
            <div className="space-y-2.5">
              {uploadedReports.map((r) => (
                <div key={r.name} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 hover:bg-slate-50/60">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${r.type === 'image' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>
                    {r.type === 'image' ? <ImageIcon size={17} /> : <FileText size={17} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-navy-800">{r.name}</p>
                    <p className="text-xs text-slate-400">{r.date} · {r.size}</p>
                  </div>
                  <Badge size="xs">{r.status}</Badge>
                  <Dropdown width="w-36" trigger={<button className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><MoreVertical size={15} /></button>}>
                    <DropdownItem>View</DropdownItem>
                    <DropdownItem>Download</DropdownItem>
                    <DropdownItem danger>Delete</DropdownItem>
                  </Dropdown>
                </div>
              ))}
            </div>
            <button className="mt-3 w-full rounded-lg py-2 text-sm font-medium text-primary-600 hover:bg-primary-50">View All Reports</button>
          </Card>
        </div>

        {/* Prescription column */}
        <div className="lg:col-span-6">
          <Card
            title="Prescription"
            action={
              <div className="flex items-center gap-2">
                <Dropdown width="w-44" trigger={<Button variant="secondary" size="xs" icon={LayoutTemplate}>Templates</Button>}>
                  <DropdownItem>Fever & Cold</DropdownItem>
                  <DropdownItem>Respiratory Infection</DropdownItem>
                  <DropdownItem>General Checkup</DropdownItem>
                </Dropdown>
                <Button variant="ghost" size="xs" onClick={() => setMeds([])}>Clear All</Button>
              </div>
            }
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-navy-800">{casePatient.name}</p>
                <p className="text-xs text-slate-400">{casePatient.age} Y / {casePatient.gender} · {casePatient.id}</p>
              </div>
              <Input type="date" defaultValue="2024-05-22" className="w-40" />
            </div>

            <Input label="Diagnosis" defaultValue="Acute Viral Fever / URTI" className="mb-4" />

            {/* Medicines table */}
            <label className="mb-1.5 block text-sm font-medium text-navy-700">Medicines</label>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[620px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-left text-2xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2.5 font-semibold">Name</th>
                    <th className="px-3 py-2.5 font-semibold">Strength</th>
                    <th className="px-3 py-2.5 font-semibold">Dose</th>
                    <th className="px-3 py-2.5 font-semibold">Frequency</th>
                    <th className="px-3 py-2.5 font-semibold">Duration</th>
                    <th className="px-3 py-2.5 font-semibold">Instructions</th>
                    <th className="w-10 px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {meds.map((m, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-2.5 font-medium text-navy-800">{m.name}</td>
                      <td className="px-3 py-2.5 text-slate-600">{m.strength}</td>
                      <td className="px-3 py-2.5 text-slate-600">{m.dose}</td>
                      <td className="px-3 py-2.5 text-slate-600">{m.frequency}</td>
                      <td className="px-3 py-2.5 text-slate-600">{m.duration}</td>
                      <td className="px-3 py-2.5 text-slate-600">{m.instructions}</td>
                      <td className="px-3 py-2.5">
                        <button onClick={() => setMeds(meds.filter((_, idx) => idx !== i))} className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-500">
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {meds.length === 0 && (
                    <tr><td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-400">No medicines added yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={Plus}
              className="mt-3"
              onClick={() => setMeds([...meds, { name: 'New Medicine', strength: '—', dose: '1 Tablet', frequency: 'OD', duration: '3 Days', instructions: 'After food' }])}
            >
              Add Medicine
            </Button>

            <Textarea
              label="Additional Instructions"
              className="mt-4"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              maxLength={500}
            />

            <Input label="Advice / Follow-up" defaultValue="Follow-up after 3 days if symptoms persist." className="mt-4" />

            <label className="mt-4 flex items-center gap-2.5 text-sm text-navy-700">
              <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
              Add to patient prescriptions
            </label>
          </Card>
        </div>

        {/* Right rail */}
        <div className="space-y-5 lg:col-span-3">
          <PatientSummary showEdit={false} />

          <Card title="Vitals">
            <div className="space-y-2.5">
              {vitalsCompact.map((v) => (
                <div key={v.label} className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">{v.label}</span>
                  <span className="font-medium text-navy-800">{v.value}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Clinical Indicators">
            <div className="space-y-2.5">
              {keyClinicalIndicators.map((k) => (
                <div key={k.label} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-slate-600"><Ico name={k.icon} size={15} className="text-slate-400" /> {k.label}</span>
                  <span className={`text-sm font-medium ${indicatorTone[k.tone] || 'text-navy-800'}`}>{k.value}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Documents">
            <div className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600"><FileText size={17} /></span>
              <div className="flex-1"><p className="text-sm font-medium text-navy-800">Case Summary</p><p className="text-xs text-slate-400">PDF · Auto-generated</p></div>
              <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-primary-600"><FileDown size={16} /></button>
            </div>
          </Card>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 pt-4">
        <Button to="/cases/review" variant="secondary" icon={ChevronLeft}>Back to Doctor Review</Button>
        <Button icon={CheckCircle2}>Save & Complete Case</Button>
      </div>
    </div>
  )
}
