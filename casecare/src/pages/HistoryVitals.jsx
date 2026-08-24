import { useState } from 'react'
import { HeartPulse, Plus, Pencil, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import Breadcrumbs from '../components/Breadcrumbs'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import Card from '../components/Card'
import Tabs from '../components/Tabs'
import { Textarea } from '../components/Input'
import ProgressSteps from '../components/ProgressSteps'
import PatientSummary from '../components/PatientSummary'
import VitalCard from '../components/VitalCard'
import { Sparkline } from '../components/Charts'
import { FULL_STEPS, vitals } from '../data/caseData'

const HISTORY_TABS = ['Medical History', 'Current Medications', 'Allergies', 'Lifestyle', 'Vitals', 'Immunization', 'Documents']

const pastHistory = ['Hypertension (since 2019)', 'Type 2 Diabetes (since 2021)', 'Bronchial Asthma (Childhood)', 'No previous surgeries']
const familyHistory = ['Father — Hypertension', 'Mother — Type 2 Diabetes', 'No history of cancer']
const socialHistory = [
  { label: 'Smoking', value: 'No' },
  { label: 'Alcohol', value: 'Occasionally' },
  { label: 'Recreational Drugs', value: 'No' },
  { label: 'Exercise', value: 'Regular (3x / week)' },
  { label: 'Diet', value: 'Vegetarian' },
  { label: 'Occupation', value: 'Business' },
]
const otherHistory = [
  { label: 'Sleep', value: '6–7 hrs / night' },
  { label: 'Stress Level', value: 'Moderate' },
  { label: 'Appetite', value: 'Reduced' },
  { label: 'Bowel Habits', value: 'Normal' },
  { label: 'Urinary', value: 'Normal' },
]
const trends = [
  { label: 'Temperature', data: [98.6, 100.2, 101, 99.8, 99.2], color: '#f59e0b' },
  { label: 'Pulse Rate', data: [72, 80, 88, 84, 88], color: '#f43f5e' },
  { label: 'Blood Pressure', data: [120, 130, 128, 126, 128], color: '#6366f1' },
  { label: 'SpO2', data: [99, 98, 97, 98, 98], color: '#10b981' },
]

function SectionCard({ title, action, children }) {
  return (
    <Card title={title} action={action}>{children}</Card>
  )
}

function CheckList({ items }) {
  return (
    <ul className="space-y-2.5">
      {items.map((it) => (
        <li key={it} className="flex items-center gap-2.5 text-sm text-navy-700">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Check size={13} strokeWidth={3} /></span>
          {it}
        </li>
      ))}
    </ul>
  )
}

function KeyValueGrid({ items }) {
  return (
    <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map((it) => (
        <div key={it.label} className="flex items-center justify-between border-b border-slate-50 pb-2">
          <span className="text-sm text-slate-500">{it.label}</span>
          <span className="text-sm font-medium text-navy-800">{it.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function HistoryVitals() {
  const [tab, setTab] = useState('Medical History')
  const [notes, setNotes] = useState('')

  const AddBtn = <Button variant="soft" size="xs" icon={Plus}>Add</Button>
  const EditBtn = <Button variant="ghost" size="xs" icon={Pencil}>Edit</Button>

  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: 'Cases', to: '/cases' }, { label: 'New Case', to: '/cases/new' }, { label: 'History & Vitals' }]} />
      <PageHeader
        title="Medical History & Vitals"
        icon={HeartPulse}
        subtitle="Record the patient's medical history, lifestyle and current vital signs."
        actions={
          <>
            <Button to="/cases/ai-questions" variant="secondary" icon={ChevronLeft}>Previous</Button>
            <Button to="/cases/summary" iconRight={ChevronRight}>Save & Continue</Button>
          </>
        }
      />

      <Card><ProgressSteps steps={FULL_STEPS} current={3} /></Card>

      <Card padding={false} bodyClassName="">
        <div className="px-5 pt-3"><Tabs tabs={HISTORY_TABS} active={tab} onChange={setTab} size="sm" className="border-0" /></div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <SectionCard title="Past Medical History" action={AddBtn}><CheckList items={pastHistory} /></SectionCard>
          <SectionCard title="Family History" action={AddBtn}><CheckList items={familyHistory} /></SectionCard>
          <SectionCard title="Social History" action={EditBtn}><KeyValueGrid items={socialHistory} /></SectionCard>
          <SectionCard title="Menstrual History" action={EditBtn}>
            <p className="text-sm text-slate-500">Not applicable for this patient.</p>
          </SectionCard>
          <SectionCard title="Other History" action={EditBtn}><KeyValueGrid items={otherHistory} /></SectionCard>
          <Card title="Clinical Notes">
            <Textarea
              placeholder="Add any additional clinical observations..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
            />
          </Card>
        </div>

        {/* Right rail */}
        <div className="space-y-5">
          <PatientSummary />

          <Card title="Current Vitals" action={EditBtn}>
            <div className="grid grid-cols-2 gap-2.5">
              {vitals.map((v) => (
                <VitalCard key={v.label} {...v} />
              ))}
            </div>
          </Card>

          <Card title="Trend Overview">
            <div className="space-y-3">
              {trends.map((t) => (
                <div key={t.label} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-600">{t.label}</span>
                  <Sparkline data={t.data} color={t.color} width={90} height={28} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 pt-4">
        <Button to="/cases/ai-questions" variant="secondary" icon={ChevronLeft}>Previous</Button>
        <Button to="/cases/summary" iconRight={ChevronRight}>Save & Continue</Button>
      </div>
    </div>
  )
}
