import { Pencil } from 'lucide-react'
import PatientAvatar from './PatientAvatar'
import Badge from './Badge'
import { casePatient, activeCase } from '../data/caseData'

// Right-rail patient summary card used across the case-taking flow.
export default function PatientSummary({
  patient = casePatient,
  chiefComplaint = activeCase.chiefComplaint,
  duration = activeCase.duration,
  severity = activeCase.severity,
  showEdit = true,
  compactMeta = false,
  children,
  className = '',
}) {
  return (
    <div className={`card p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-navy-900">Patient Summary</h3>
        {showEdit && (
          <button className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700">
            <Pencil size={13} /> Edit
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <PatientAvatar name={patient.name} initials={patient.initials} size="md" />
        <div className="min-w-0">
          <p className="truncate font-semibold text-navy-900">{patient.name}</p>
          <p className="text-xs text-slate-500">
            {patient.age} Y / {patient.gender} &nbsp;•&nbsp; ID: {patient.id}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
        <div>
          <p className="text-2xs uppercase tracking-wide text-slate-400">Chief Complaint</p>
          <p className="mt-0.5 text-sm font-medium text-navy-800">{chiefComplaint}</p>
        </div>
        <div>
          <p className="text-2xs uppercase tracking-wide text-slate-400">Duration</p>
          <p className="mt-0.5 text-sm font-medium text-navy-800">{duration}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
        <span className="text-xs text-slate-400">Current Severity</span>
        <Badge tone="amber" dot>{severity}</Badge>
      </div>

      {children}
    </div>
  )
}
