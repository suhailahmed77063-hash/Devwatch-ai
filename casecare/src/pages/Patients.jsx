import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { Plus, Search, SlidersHorizontal, RotateCcw, Eye, Pencil, MoreVertical, ChevronLeft, ChevronRight } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import Card from '../components/Card'
import Select from '../components/Select'
import Badge from '../components/Badge'
import DataTable from '../components/DataTable'
import PatientAvatar from '../components/PatientAvatar'
import Dropdown, { DropdownItem } from '../components/Dropdown'
import { api } from '../lib/api'

const genderDot = { Male: 'bg-blue-400', Female: 'bg-rose-400' }

function inAgeGroup(age, group) {
  if (group === 'All Age Group' || age == null) return true
  if (group === '60+') return age >= 60
  const [lo, hi] = group.split('-').map(Number)
  return age >= lo && age <= hi
}

export default function Patients() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [status, setStatus] = useState('All Status')
  const [gender, setGender] = useState('All Gender')
  const [ageGroup, setAgeGroup] = useState('All Age Group')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Debounce the search box so we don't fire a request per keystroke (§39).
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  // Reset to the first page whenever a server-side filter changes.
  useEffect(() => {
    setPage(1)
  }, [debounced, status, pageSize])

  const params = new URLSearchParams()
  if (debounced) params.set('search', debounced)
  if (status !== 'All Status') params.set('status', status)
  params.set('page', String(page))
  params.set('pageSize', String(pageSize))

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['patients', debounced, status, page, pageSize],
    queryFn: () => api.get(`/patients?${params.toString()}`),
    placeholderData: keepPreviousData,
  })

  const serverItems = data?.items || []
  // Gender / age are refinements applied over the current page (§39).
  const rows = serverItems.filter((p) => (gender === 'All Gender' || p.gender === gender) && inAgeGroup(p.age, ageGroup))
  const pg = data?.pagination

  function resetFilters() {
    setQuery('')
    setStatus('All Status')
    setGender('All Gender')
    setAgeGroup('All Age Group')
    setPage(1)
  }

  const columns = [
    {
      key: 'id',
      header: 'Patient ID',
      render: (r) => (
        <button onClick={() => navigate(`/patients/${r.id}`)} className="font-semibold text-primary-600 hover:underline">
          {r.id}
        </button>
      ),
    },
    {
      key: 'name',
      header: 'Patient Name',
      render: (r) => (
        <div className="flex items-center gap-3">
          <PatientAvatar name={r.name} src={r.avatar} size="sm" />
          <span className="font-medium text-navy-900">{r.name}</span>
        </div>
      ),
    },
    {
      key: 'age',
      header: 'Age / Gender',
      render: (r) => (
        <span className="inline-flex items-center gap-2 text-slate-600">
          <span className={`h-2 w-2 rounded-full ${genderDot[r.gender] || 'bg-slate-300'}`} />
          {r.age} / {r.gender}
        </span>
      ),
    },
    { key: 'phone', header: 'Phone', render: (r) => <span className="text-slate-600">{r.phone}</span> },
    {
      key: 'lastVisit',
      header: 'Last Visit',
      render: (r) => (
        <div>
          <p className="text-navy-700">{r.lastVisit}</p>
          <p className="text-xs text-slate-400">{r.lastVisitTime}</p>
        </div>
      ),
    },
    {
      key: 'cases',
      header: 'Total Cases',
      align: 'center',
      render: (r) => (
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-100 px-2 text-xs font-semibold text-navy-700">
          {r.cases}
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: (r) => <Badge dot>{r.status}</Badge> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => navigate(`/patients/${r.id}`)} className="rounded-lg p-1.5 text-slate-400 hover:bg-primary-50 hover:text-primary-600" title="View">
            <Eye size={16} />
          </button>
          <button onClick={() => navigate(`/patients/${r.id}`)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Edit">
            <Pencil size={16} />
          </button>
          <Dropdown
            width="w-40"
            trigger={
              <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <MoreVertical size={16} />
              </button>
            }
          >
            <DropdownItem onClick={() => navigate('/cases/new')}>New Case</DropdownItem>
            <DropdownItem onClick={() => navigate(`/patients/${r.id}`)}>View Profile</DropdownItem>
          </Dropdown>
        </div>
      ),
    },
  ]

  const total = pg?.total ?? 0
  const totalPages = pg?.totalPages ?? 1
  const firstRow = total === 0 ? 0 : (page - 1) * pageSize + 1
  const lastRow = Math.min(page * pageSize, total)
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1).slice(
    Math.max(0, Math.min(page - 3, totalPages - 5)),
    Math.max(5, Math.min(page + 2, totalPages)),
  )

  return (
    <div className="space-y-5">
      <PageHeader
        title="Patients"
        subtitle="Manage and view all your registered patients."
        actions={<Button to="/cases/new" icon={Plus}>Add New Patient</Button>}
      />

      {/* Filter bar */}
      <Card>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, ID or phone..."
              className="input-base pl-10"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:flex">
            <Select options={['All Status', 'Active', 'Inactive']} value={status} onChange={(e) => setStatus(e.target.value)} selectClassName="lg:w-36" />
            <Select options={['All Gender', 'Male', 'Female']} value={gender} onChange={(e) => setGender(e.target.value)} selectClassName="lg:w-36" />
            <Select options={['All Age Group', '0-18', '19-40', '41-60', '60+']} value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} selectClassName="lg:w-40" />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" icon={SlidersHorizontal}>More Filters</Button>
            <Button variant="ghost" icon={RotateCcw} onClick={resetFilters}>Reset</Button>
          </div>
        </div>
      </Card>

      <Card padding={false}>
        {isError ? (
          <div className="px-4 py-10 text-center text-sm text-rose-600">Couldn't load patients: {error?.message}</div>
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(r) => r.id}
            selectable
            footer={
              <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  Show
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-sm outline-none focus:border-primary-400"
                  >
                    <option>10</option>
                    <option>25</option>
                    <option>50</option>
                  </select>
                  entries
                </div>
                <p className="text-sm text-slate-500">
                  {isLoading ? 'Loading…' : `Showing ${firstRow}–${lastRow} of ${total}`}
                  {isFetching && !isLoading ? ' · updating…' : ''}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {pageNumbers.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-medium ${
                        p === page ? 'bg-primary-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            }
          />
        )}
        {!isLoading && !isError && rows.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-slate-400">No patients match your filters.</div>
        )}
      </Card>
    </div>
  )
}
