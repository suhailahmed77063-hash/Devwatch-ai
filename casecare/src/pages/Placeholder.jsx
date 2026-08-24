import { Construction } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import Button from '../components/Button'

// Generic placeholder for sidebar destinations outside the 12 core screens.
export default function Placeholder({ title = 'Page' }) {
  return (
    <div className="space-y-5">
      <PageHeader title={title} subtitle="This section is part of the CaseCare workspace." />
      <div className="card">
        <EmptyState
          icon={Construction}
          title={`${title} is coming soon`}
          description="This screen isn't part of the current prototype. Explore the Dashboard, Patients and the full case-taking workflow."
          action={<Button to="/dashboard">Back to Dashboard</Button>}
        />
      </div>
    </div>
  )
}
