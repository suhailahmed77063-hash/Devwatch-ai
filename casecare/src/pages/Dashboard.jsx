import { Plus, MoreVertical, Users, ClipboardList, Clock, CalendarCheck, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import Card from '../components/Card'
import StatCard from '../components/StatCard'
import DataTable from '../components/DataTable'
import Badge from '../components/Badge'
import Dropdown, { DropdownItem } from '../components/Dropdown'
import PatientAvatar from '../components/PatientAvatar'
import { LineChart, DonutChart } from '../components/Charts'
import { Ico } from '../utils/icons'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useActiveCase } from '../lib/case'
import { statusLabel, ageGender } from '../lib/ui'
// Illustrative-only visuals (no dedicated endpoint yet — see docs/SIH26047-MAPPING):
// week trend, today's schedule, status donut, activity feed.
import { todaySchedule, recentActivity, casesOverview, caseStatusDistribution } from '../data/dashboard'

const activityTones = {
  emerald: 'bg-emerald-50 text-emerald-600',
  blue: 'bg-blue-50 text-blue-600',
  violet: 'bg-violet-50 text-violet-600',
  amber: 'bg-amber-50 text-amber-600',
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { setActiveCase } = useActiveCase()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard'),
  })

  const s = data?.stats
  const dash = (v) => (isLoading ? '—' : v ?? 0)
  const statCards = [
    { label: 'Total Patients', value: dash(s?.patients), icon: Users, accent: 'emerald' },
    { label: 'Active Cases', value: dash(s?.activeCases), icon: ClipboardList, accent: 'blue' },
    { label: 'Pending Review', value: dash(s?.pendingReview), icon: Clock, accent: 'amber', foot: 'Awaiting doctor', footTone: 'amber' },
    { label: 'Completed Today', value: dash(s?.completedToday), icon: CalendarCheck, accent: 'violet' },
    { label: 'Red Flags', value: dash(s?.redFlags), icon: AlertTriangle, accent: 'rose', foot: 'Needs attention', footTone: 'rose' },
  ]

  const rows = (data?.recent || []).map((r) => ({
    caseId: r.caseId,
    caseNumber: r.caseNumber,
    name: r.patient.name,
    pid: r.patient.id,
    avatar: r.patient.avatar,
    age: ageGender(r.patient.age, r.patient.gender),
    lastVisit: r.date,
    case: r.chiefComplaint,
    status: statusLabel(r.status),
    patient: r.patient,
  }))

  function openCase(r) {
    setActiveCase({ id: r.caseId, caseNumber: r.caseNumber, patient: r.patient })
    navigate('/cases/summary')
  }

  const patientColumns = [
    {
      key: 'name',
      header: 'Patient',
      render: (r) => (
        <div className="flex items-center gap-3">
          <PatientAvatar name={r.name} src={r.avatar} size="sm" />
          <div>
            <p className="font-semibold text-navy-900">{r.name}</p>
            <p className="text-xs text-slate-400">{r.pid}</p>
          </div>
        </div>
      ),
    },
    { key: 'age', header: 'Age / Gender', render: (r) => <span className="text-slate-600">{r.age}</span> },
    { key: 'lastVisit', header: 'Last Visit', render: (r) => <span className="text-slate-600">{r.lastVisit}</span> },
    { key: 'case', header: 'Case', render: (r) => <span className="text-slate-600">{r.case}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <Badge dot>{r.status}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => (
        <Dropdown
          width="w-40"
          trigger={
            <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <MoreVertical size={16} />
            </button>
          }
        >
          <DropdownItem onClick={() => openCase(r)}>View Case</DropdownItem>
          <DropdownItem onClick={() => navigate(`/patients/${r.pid}`)}>Patient Profile</DropdownItem>
        </Dropdown>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Good Morning, ${user?.name || 'Doctor'} 👋`}
        subtitle="Here's what's happening with your patients today."
        actions={<Button to="/cases/new" icon={Plus}>New Case</Button>}
      />

      {isError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Couldn't load dashboard data: {error?.message}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {statCards.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-5 lg:col-span-2">
          <Card
            title="Recent Patients"
            action={<Button to="/patients" variant="ghost" size="sm">View All</Button>}
            padding={false}
          >
            <DataTable columns={patientColumns} rows={rows} rowKey={(r) => r.caseId} />
          </Card>

          <Card
            title="Cases Overview"
            action={
              <Dropdown
                width="w-36"
                trigger={
                  <button className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                    This Week
                  </button>
                }
              >
                <DropdownItem>This Week</DropdownItem>
                <DropdownItem>This Month</DropdownItem>
                <DropdownItem>This Year</DropdownItem>
              </Dropdown>
            }
          >
            <LineChart data={casesOverview} />
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <Card title="Today's Schedule" action={<Button to="/appointments" variant="ghost" size="sm">View All</Button>}>
            <div className="space-y-3">
              {todaySchedule.map((s) => (
                <div key={s.time + s.name} className="flex items-center gap-3">
                  <div className="w-16 shrink-0 text-xs font-semibold text-primary-600">{s.time}</div>
                  <div className="flex-1 border-l-2 border-slate-100 pl-3">
                    <p className="text-sm font-medium text-navy-800">{s.name}</p>
                    <p className="text-xs text-slate-400">{s.reason}</p>
                  </div>
                  <Badge tone={s.status === 'Completed' ? 'green' : 'sky'} size="xs">{s.status}</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Case Status Distribution">
            <div className="flex items-center gap-5">
              <DonutChart
                segments={caseStatusDistribution.segments}
                size={140}
                thickness={20}
                centerTop={caseStatusDistribution.total}
                centerBottom="Total Cases"
              />
              <div className="flex-1 space-y-2.5">
                {caseStatusDistribution.segments.map((seg) => (
                  <div key={seg.label} className="flex items-center gap-2 text-sm">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: seg.color }} />
                    <span className="flex-1 text-slate-600">{seg.label}</span>
                    <span className="font-semibold text-navy-800">{seg.value}</span>
                    <span className="w-9 text-right text-xs text-slate-400">{seg.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card title="Recent Activity">
            <div className="space-y-4">
              {recentActivity.map((a, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${activityTones[a.tone]}`}>
                    <Ico name={a.icon} size={16} />
                  </span>
                  <div>
                    <p className="text-sm text-navy-800">{a.text}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
