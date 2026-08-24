// Shared display helpers for backend enum-ish strings (SIH26047 §22, §60).
// Keeps the reference UI's wording while consuming the API's status codes.

const CASE_STATUS_LABELS = {
  Draft: 'Draft',
  InProgress: 'In Progress',
  ReadyForDoctor: 'Ready for Doctor',
  UnderReview: 'Under Review',
  Completed: 'Completed',
  Archived: 'Archived',
}

/** Humanize a case status code for display (InProgress → "In Progress"). */
export function statusLabel(status) {
  if (!status) return '—'
  return CASE_STATUS_LABELS[status] || status
}

/** Badge tone for a triage priority. */
export function priorityTone(priority) {
  switch (priority) {
    case 'Emergency':
      return 'red'
    case 'Urgent':
      return 'amber'
    case 'Priority':
      return 'purple'
    default:
      return 'gray'
  }
}

/** "45 / Male" from age + gender, tolerant of missing values. */
export function ageGender(age, gender) {
  if (age == null && !gender) return '—'
  return [age != null ? age : '—', gender || '—'].join(' / ')
}
