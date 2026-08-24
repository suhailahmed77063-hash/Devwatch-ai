import { Clock, Download, ArrowLeft, Activity, CalendarRange, StickyNote, RotateCcw, FolderOpen, Printer, Check } from 'lucide-react'
import Breadcrumbs from '../components/Breadcrumbs'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import Card from '../components/Card'
import Select from '../components/Select'
import Timeline from '../components/Timeline'
import PatientSummary from '../components/PatientSummary'
import { timelineEvents, caseProgress } from '../data/caseData'

export default function PatientTimeline() {
  return (
    <div className="space-y-5">
      <Breadcrumbs
        items={[
          { label: 'Cases', to: '/cases' },
          { label: 'New Case', to: '/cases/new' },
          { label: 'Smart Case Taking', to: '/cases/smart-taking' },
          { label: 'Patient Timeline' },
        ]}
      />
      <PageHeader
        title="Patient Timeline"
        icon={Clock}
        subtitle="Complete chronological history of this patient's case activity."
        actions={
          <>
            <Button variant="secondary" icon={Download}>Export Timeline</Button>
            <Button to="/cases/review" icon={ArrowLeft}>Back to Case</Button>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Select options={['All Events', 'System Events', 'Doctor Actions', 'Follow-ups']} selectClassName="sm:w-52" />
              <div className="flex gap-3">
                <div className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600"><Activity size={17} /></span>
                  <div><p className="text-lg font-bold leading-none text-navy-900">12</p><p className="text-xs text-slate-400">Total Events</p></div>
                </div>
                <div className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><CalendarRange size={17} /></span>
                  <div><p className="text-lg font-bold leading-none text-navy-900">4 Days</p><p className="text-xs text-slate-400">Case Duration</p></div>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <Timeline groups={timelineEvents} />
            <div className="mt-6 flex justify-center">
              <Button variant="secondary" size="sm">Load More Events</Button>
            </div>
          </Card>
        </div>

        {/* Right rail */}
        <div className="space-y-5">
          <PatientSummary showEdit={false} />

          <Card title="Case Progress">
            <div className="space-y-3">
              {caseProgress.map((c) => (
                <div key={c.label} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Check size={13} strokeWidth={3} /></span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-navy-800">{c.label}</p>
                    <p className="text-xs text-slate-400">{c.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Quick Actions">
            <div className="space-y-2">
              <Button variant="secondary" size="sm" icon={StickyNote} className="w-full justify-start">Add New Note</Button>
              <Button variant="secondary" size="sm" icon={RotateCcw} className="w-full justify-start">Add Follow-up</Button>
              <Button variant="secondary" size="sm" icon={FolderOpen} className="w-full justify-start">View Full Case</Button>
              <Button variant="secondary" size="sm" icon={Printer} className="w-full justify-start">Print Timeline</Button>
            </div>
          </Card>

          <p className="text-center text-xs text-slate-400">All times shown in IST (UTC +5:30)</p>
        </div>
      </div>
    </div>
  )
}
