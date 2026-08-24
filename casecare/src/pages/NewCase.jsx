import { useState } from 'react'
import { FilePlus2, X, ChevronRight, ChevronLeft, Stethoscope, Clock, CalendarDays, User, Sparkles } from 'lucide-react'
import Breadcrumbs from '../components/Breadcrumbs'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import Card from '../components/Card'
import Input, { Textarea } from '../components/Input'
import Select from '../components/Select'
import ProgressSteps from '../components/ProgressSteps'
import RingProgress from '../components/RingProgress'
import { NEW_CASE_STEPS } from '../data/caseData'

function RadioGroup({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const label = typeof opt === 'string' ? opt : opt.label
        const active = value === label
        const tone = typeof opt === 'object' ? opt.tone : 'primary'
        const activeCls =
          tone === 'green' ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
          : tone === 'amber' ? 'border-amber-400 bg-amber-50 text-amber-700'
          : tone === 'red' ? 'border-rose-400 bg-rose-50 text-rose-700'
          : 'border-primary-400 bg-primary-50 text-primary-700'
        return (
          <button
            type="button"
            key={label}
            onClick={() => onChange(label)}
            className={`flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors ${
              active ? activeCls : 'border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${active ? 'border-current' : 'border-slate-300'}`}>
              {active && <span className="h-2 w-2 rounded-full bg-current" />}
            </span>
            {label}
          </button>
        )
      })}
    </div>
  )
}

export default function NewCase() {
  const [gender, setGender] = useState('Male')
  const [priority, setPriority] = useState('Normal')
  const [address, setAddress] = useState('')

  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: 'Cases', to: '/cases' }, { label: 'New Case' }]} />
      <PageHeader
        title="New Case"
        icon={FilePlus2}
        subtitle="Create a new patient case and start the case-taking workflow."
        actions={
          <>
            <Button variant="secondary" icon={X}>Cancel</Button>
            <Button to="/cases/smart-taking" iconRight={ChevronRight}>Save & Next</Button>
          </>
        }
      />

      <Card><ProgressSteps steps={NEW_CASE_STEPS} current={0} /></Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card title="Patient Information">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Patient ID" placeholder="Auto-generated" defaultValue="P001245" required />
              <Input label="Full Name" placeholder="Enter patient name" defaultValue="Rahul Kumar" required />
              <Input label="Age" type="number" placeholder="45" defaultValue="45" suffix="Years" required />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-navy-700">Gender <span className="text-rose-500">*</span></label>
                <RadioGroup options={['Male', 'Female', 'Other']} value={gender} onChange={setGender} />
              </div>
              <Input label="Phone Number" placeholder="98765 43210" defaultValue="98765 43210" suffix="+91" required inputClassName="pl-3" />
              <Input label="Email Address" type="email" placeholder="patient@email.com" defaultValue="rahulkumar@email.com" />
              <Textarea
                label="Address"
                className="sm:col-span-2"
                placeholder="Enter full address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                maxLength={200}
              />
            </div>
          </Card>

          <Card title="Visit Information">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Visit Date" type="date" defaultValue="2024-05-22" required />
              <Input label="Visit Time" type="time" defaultValue="09:15" required />
              <Input label="Referred By" placeholder="Self / Doctor name" defaultValue="Self" />
              <Select label="Visit Type" options={['OPD', 'IPD', 'Emergency', 'Tele-consultation']} />
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-navy-700">Priority</label>
                <RadioGroup
                  options={[{ label: 'Normal', tone: 'green' }, { label: 'Urgent', tone: 'amber' }, { label: 'Emergency', tone: 'red' }]}
                  value={priority}
                  onChange={setPriority}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Right rail */}
        <div className="space-y-5">
          <Card title="Case Summary">
            <div className="space-y-3">
              {[
                { icon: User, label: 'Patient', value: 'Rahul Kumar' },
                { icon: Stethoscope, label: 'Visit Type', value: 'OPD' },
                { icon: CalendarDays, label: 'Visit Date', value: '22 May 2024' },
                { icon: Clock, label: 'Visit Time', value: '09:15 AM' },
              ].map((r) => (
                <div key={r.label} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <r.icon size={16} />
                  </span>
                  <div>
                    <p className="text-xs text-slate-400">{r.label}</p>
                    <p className="text-sm font-medium text-navy-800">{r.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-4">
              <RingProgress value={20} color="#0d9488" size={72}>
                <span className="text-sm font-bold text-navy-900">20%</span>
              </RingProgress>
              <div>
                <p className="text-sm font-semibold text-navy-800">Step 1 of 5</p>
                <p className="mt-0.5 text-xs text-slate-500">Complete all steps to finalize the case.</p>
              </div>
            </div>
          </Card>

          <div className="rounded-card border border-primary-100 bg-primary-50/60 p-5">
            <div className="mb-2 flex items-center gap-2 text-primary-700">
              <Sparkles size={16} />
              <p className="text-sm font-semibold">AI Assistant Tip</p>
            </div>
            <p className="text-xs leading-relaxed text-primary-900/70">
              Once you save patient details, you can start Smart Case Taking to let the AI capture the
              patient's complaints through natural conversation.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 pt-4">
        <Button variant="secondary" icon={ChevronLeft} disabled>Previous</Button>
        <Button to="/cases/smart-taking" iconRight={ChevronRight}>Save & Next</Button>
      </div>
    </div>
  )
}
