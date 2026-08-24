import { useState } from 'react'
import { UserCheck, ScrollText, CheckCircle2, ChevronLeft, Sparkles, Save, Stethoscope, Activity, CalendarClock, ListChecks, Thermometer, HeartPulse, AlertTriangle, Hash, CalendarDays, User } from 'lucide-react'
import Breadcrumbs from '../components/Breadcrumbs'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import Card from '../components/Card'
import Badge from '../components/Badge'
import Select from '../components/Select'
import ProgressSteps from '../components/ProgressSteps'
import PatientSummary from '../components/PatientSummary'
import AIConfidence from '../components/AIConfidence'
import RichTextEditor from '../components/RichTextEditor'
import FileUpload from '../components/FileUpload'
import { Ico } from '../utils/icons'
import { SUMMARY_STEPS, caseSummary as s, activeCase, keyClinicalIndicators, reviewHighlights } from '../data/caseData'

const indicatorTone = { neutral: 'text-navy-800', muted: 'text-slate-400', warn: 'text-amber-600' }

function Toggle({ checked, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-primary-600' : 'bg-slate-300'}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

function MiniBlock({ icon: Icon, title, children }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-primary-600">
        <Icon size={14} />
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h4>
      </div>
      <div className="text-sm text-navy-700">{children}</div>
    </div>
  )
}

export default function DoctorReview() {
  const [followUp, setFollowUp] = useState(true)

  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: 'Cases', to: '/cases' }, { label: 'New Case', to: '/cases/new' }, { label: 'Doctor Review' }]} />
      <PageHeader
        title="Doctor Review"
        icon={UserCheck}
        subtitle="Review the AI summary, add your clinical impression and finalize the case."
        actions={
          <>
            <Button variant="secondary" icon={ScrollText}>View Full Transcript</Button>
            <Button to="/cases/reports-prescription" icon={CheckCircle2}>Finalize Case</Button>
          </>
        }
      />

      <Card><ProgressSteps steps={SUMMARY_STEPS} current={5} /></Card>

      <div className="grid gap-5 lg:grid-cols-12">
        {/* Column 1 — AI summary + key info */}
        <div className="space-y-5 lg:col-span-4">
          <Card padding={false}>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ai-500/10 text-ai-600"><Sparkles size={16} /></span>
                <h3 className="text-sm font-semibold text-navy-900">AI Generated Summary</h3>
              </div>
              <Badge tone="green" size="xs" dot>High Confidence</Badge>
            </div>
            <div className="space-y-4 p-5">
              <MiniBlock icon={Stethoscope} title="Chief Complaint">{s.chiefComplaint}</MiniBlock>
              <MiniBlock icon={Stethoscope} title="Probable Diagnosis"><span className="font-medium">{s.probableDiagnosis}</span></MiniBlock>
              <MiniBlock icon={Activity} title="Severity"><Badge tone="amber" dot>Moderate</Badge></MiniBlock>
              <MiniBlock icon={Activity} title="Associated Symptoms">
                <div className="flex flex-wrap gap-1.5">
                  {s.associatedSymptoms.map((a) => <span key={a} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">{a}</span>)}
                </div>
              </MiniBlock>
              <MiniBlock icon={CalendarClock} title="Onset & Duration">{s.onset} onset · {s.durationDetail}</MiniBlock>
              <MiniBlock icon={ListChecks} title="Recommended Next Steps">
                <ul className="list-disc space-y-1 pl-4 text-slate-600">
                  {s.nextSteps.slice(0, 4).map((n, i) => <li key={i}>{n}</li>)}
                </ul>
              </MiniBlock>
            </div>
            <div className="flex items-start gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-2xs leading-relaxed text-slate-500">
              <Sparkles size={13} className="mt-0.5 shrink-0 text-ai-600" />
              AI suggestions are advisory. Use your clinical judgment before finalizing.
            </div>
          </Card>

          <Card title="Review Key Information">
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-100 p-3.5">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500"><Thermometer size={14} className="text-sky-500" /> Vitals Summary</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {reviewHighlights.vitals.map((v) => (
                    <div key={v.label} className="flex justify-between text-sm"><span className="text-slate-500">{v.label}</span><span className="font-medium text-navy-800">{v.value}</span></div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-slate-100 p-3.5">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500"><HeartPulse size={14} className="text-emerald-500" /> History Highlights</p>
                <ul className="space-y-1">
                  {reviewHighlights.history.map((h) => <li key={h} className="flex items-center gap-2 text-sm text-slate-600"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />{h}</li>)}
                </ul>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3.5">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-700"><AlertTriangle size={14} /> Alarm Signs</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {reviewHighlights.alarmSigns.map((a) => (
                    <div key={a.label} className="flex justify-between text-sm"><span className="text-slate-500">{a.label}</span><span className="font-medium text-slate-400">{a.value}</span></div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Column 2 — doctor's clinical impression */}
        <div className="space-y-5 lg:col-span-5">
          <Card title="Your Clinical Impression">
            <div className="space-y-4">
              <Select label="Provisional Diagnosis" options={['Acute Viral Fever', 'Upper Respiratory Tract Infection', 'Influenza', 'Typhoid Fever', 'Other']} />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-navy-700">Clinical Notes</label>
                <RichTextEditor placeholder="Enter your clinical notes..." maxLength={500} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-navy-700">Plan & Advice</label>
                <RichTextEditor placeholder="Enter treatment plan and advice..." maxLength={500} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-navy-700">Attach Files</label>
                <FileUpload />
              </div>
              <div className="rounded-xl border border-slate-100 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-navy-800">Schedule Follow-up</p>
                    <p className="text-xs text-slate-400">Set a follow-up reminder for this patient</p>
                  </div>
                  <Toggle checked={followUp} onChange={setFollowUp} />
                </div>
                {followUp && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Select label="Follow-up After" options={['3 Days', '1 Week', '2 Weeks', '1 Month']} />
                    <Select label="Mode" options={['In Person', 'Tele-consultation', 'Phone Call']} />
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Right rail */}
        <div className="space-y-5 lg:col-span-3">
          <PatientSummary showEdit={false} />
          <Card title="Key Clinical Indicators">
            <div className="space-y-3">
              {keyClinicalIndicators.map((k) => (
                <div key={k.label} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-slate-600"><Ico name={k.icon} size={15} className="text-slate-400" /> {k.label}</span>
                  <span className={`text-sm font-medium ${indicatorTone[k.tone] || 'text-navy-800'}`}>{k.value}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card title="AI Confidence Score"><AIConfidence value={85} size={64} /></Card>
          <Card title="Case Information">
            <div className="space-y-3">
              {[
                { icon: Hash, label: 'Case ID', value: activeCase.id },
                { icon: CalendarDays, label: 'Created On', value: activeCase.createdOn },
                { icon: User, label: 'Created By', value: activeCase.createdBy },
              ].map((r) => (
                <div key={r.label} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><r.icon size={15} /></span>
                  <div><p className="text-xs text-slate-400">{r.label}</p><p className="text-sm font-medium text-navy-800">{r.value}</p></div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
        <Button to="/cases/summary" variant="secondary" icon={ChevronLeft}>Previous</Button>
        <div className="flex gap-2.5">
          <Button variant="secondary" icon={Save}>Save as Draft</Button>
          <Button to="/cases/reports-prescription" icon={CheckCircle2}>Finalize Case</Button>
        </div>
      </div>
    </div>
  )
}
