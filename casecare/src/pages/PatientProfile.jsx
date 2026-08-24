import { useState } from 'react'
import {
  ArrowLeft, Phone, Mail, MapPin, Cake, Droplet, HeartHandshake, Briefcase, Flag,
  CalendarDays, Clock, ShieldAlert, Stethoscope, Plus, CalendarPlus, RotateCcw,
  MessageSquare, Download, ChevronRight,
} from 'lucide-react'
import Breadcrumbs from '../components/Breadcrumbs'
import Button from '../components/Button'
import Card from '../components/Card'
import Badge from '../components/Badge'
import Tabs from '../components/Tabs'
import PatientAvatar from '../components/PatientAvatar'
import EmptyState from '../components/EmptyState'
import { Ico } from '../utils/icons'
import { patientProfile as p, profileTabs } from '../data/patients'

function InfoRow({ icon: Icon, label, value, children }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={16} className="mt-0.5 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className="text-2xs uppercase tracking-wide text-slate-400">{label}</p>
        <div className="text-sm font-medium text-navy-800">{children || value}</div>
      </div>
    </div>
  )
}

export default function PatientProfile() {
  const [tab, setTab] = useState('Overview')

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Breadcrumbs items={[{ label: 'Patients', to: '/patients' }, { label: 'Patient Profile' }]} />
        <Button to="/patients" variant="secondary" size="sm" icon={ArrowLeft}>Back to Patients</Button>
      </div>

      {/* Header card */}
      <Card>
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex items-center gap-4 lg:flex-col lg:items-center lg:text-center">
            <PatientAvatar name={p.name} src={p.avatar} size="2xl" ring />
            <div className="lg:mt-3">
              <h2 className="flex items-center gap-1.5 text-xl font-bold text-navy-900">
                {p.name} <span className="text-blue-500">♂</span>
              </h2>
              <p className="text-sm font-medium text-primary-600">{p.id}</p>
            </div>
          </div>

          <div className="grid flex-1 gap-x-8 gap-y-4 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-3 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <InfoRow icon={Cake} label="Age" value={p.ageDetail} />
            <InfoRow icon={Droplet} label="Blood Group" value={p.bloodGroup} />
            <InfoRow icon={CalendarDays} label="Registered On" value={p.registeredOn} />
            <InfoRow icon={Phone} label="Phone" value={p.phone} />
            <InfoRow icon={HeartHandshake} label="Marital Status" value={p.maritalStatus} />
            <InfoRow icon={Clock} label="Last Visit" value={p.lastVisit} />
            <InfoRow icon={Mail} label="Email" value={p.email} />
            <InfoRow icon={Briefcase} label="Occupation" value={p.occupation} />
            <InfoRow icon={ShieldAlert} label="Allergies">
              <Badge tone="red" size="xs">{p.allergies}</Badge>
            </InfoRow>
            <InfoRow icon={MapPin} label="Address" value={p.address} />
            <InfoRow icon={Flag} label="Nationality" value={p.nationality} />
            <InfoRow icon={Stethoscope} label="Primary Doctor" value={p.primaryDoctor} />
          </div>
        </div>
      </Card>

      {/* Quick actions */}
      <Card>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="mr-1 text-sm font-semibold text-navy-700">Quick Actions:</span>
          <Button to="/cases/new" size="sm" icon={Plus}>New Case</Button>
          <Button variant="secondary" size="sm" icon={CalendarPlus}>Book Appointment</Button>
          <Button variant="secondary" size="sm" icon={RotateCcw}>Add Follow-up</Button>
          <Button variant="secondary" size="sm" icon={MessageSquare}>Send Message</Button>
          <Button variant="secondary" size="sm" icon={Download}>Download Summary</Button>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs tabs={profileTabs} active={tab} onChange={setTab} />

      {tab === 'Overview' ? (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            {/* Medical Information */}
            <Card title="Medical Information">
              <div className="grid gap-4 sm:grid-cols-2">
                {p.medicalInfo.map((m) => (
                  <div key={m.label} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-primary-600 ring-1 ring-slate-100">
                      <Ico name={m.icon} size={17} />
                    </span>
                    <div>
                      <p className="text-xs text-slate-400">{m.label}</p>
                      {m.badge ? (
                        <Badge tone="amber" size="xs" className="mt-0.5">{m.value}</Badge>
                      ) : (
                        <p className="text-sm font-semibold text-navy-800">{m.value}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Current Medications */}
            <Card
              title="Current Medications"
              action={<Button variant="soft" size="xs" icon={Plus}>Add Medication</Button>}
            >
              <div className="divide-y divide-slate-100">
                {p.medications.map((m) => (
                  <div key={m.name} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                        <Ico name="pill" size={17} />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-navy-800">{m.name} <span className="font-normal text-slate-400">· {m.dose}</span></p>
                        <p className="text-xs text-slate-400">{m.frequency} · {m.timing}</p>
                      </div>
                    </div>
                    <Badge tone="green" size="xs" dot>Active</Badge>
                  </div>
                ))}
              </div>
            </Card>

            {/* Recent Cases */}
            <Card
              title="Recent Cases"
              action={<Button variant="ghost" size="sm" iconRight={ChevronRight}>View All</Button>}
            >
              <div className="space-y-3">
                {p.recentCases.map((c, i) => (
                  <div key={i} className="flex items-center gap-4 rounded-xl border border-slate-100 p-3 hover:bg-slate-50/60">
                    <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                      <span className="text-base font-bold leading-none">{c.day}</span>
                      <span className="text-2xs uppercase">{c.month}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-navy-800">{c.title}</p>
                      <p className="text-xs text-slate-400">{c.doctor} · {c.time}</p>
                    </div>
                    <Badge dot>{c.status}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-5">
            <Card title="Allergies">
              <div className="space-y-2.5">
                {p.allergyList.map((a) => (
                  <div key={a.name} className="flex items-center gap-3 rounded-xl border border-rose-100 bg-rose-50/50 p-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-rose-500 ring-1 ring-rose-100">
                      <ShieldAlert size={16} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-navy-800">{a.name}</p>
                      <p className="text-xs text-rose-500">{a.severity}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Lifestyle Information">
              <div className="space-y-3">
                {p.lifestyle.map((l) => (
                  <div key={l.label} className="flex items-center justify-between">
                    <span className="flex items-center gap-2.5 text-sm text-slate-600">
                      <Ico name={l.icon} size={16} className="text-slate-400" />
                      {l.label}
                    </span>
                    <span className="text-sm font-medium text-navy-800">{l.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <Card>
          <EmptyState title={`${tab}`} description={`${tab} for ${p.name} will appear here.`} />
        </Card>
      )}

      <p className="text-center text-xs text-slate-400">
        Created on {p.createdOn} · Last updated {p.lastUpdated}
      </p>
    </div>
  )
}
