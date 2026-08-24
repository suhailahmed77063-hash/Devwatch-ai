import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import { RequireAuth } from './lib/auth'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Patients from './pages/Patients'
import PatientProfile from './pages/PatientProfile'
import NewCase from './pages/NewCase'
import SmartCaseTaking from './pages/SmartCaseTaking'
import AIQuestions from './pages/AIQuestions'
import HistoryVitals from './pages/HistoryVitals'
import AICaseSummary from './pages/AICaseSummary'
import DoctorReview from './pages/DoctorReview'
import PatientTimeline from './pages/PatientTimeline'
import ReportsPrescription from './pages/ReportsPrescription'
import Placeholder from './pages/Placeholder'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/patients" element={<Patients />} />
        <Route path="/patients/:id" element={<PatientProfile />} />

        <Route path="/cases" element={<Placeholder title="All Cases" />} />
        <Route path="/cases/new" element={<NewCase />} />
        <Route path="/cases/smart-taking" element={<SmartCaseTaking />} />
        <Route path="/cases/ai-questions" element={<AIQuestions />} />
        <Route path="/cases/history-vitals" element={<HistoryVitals />} />
        <Route path="/cases/summary" element={<AICaseSummary />} />
        <Route path="/cases/review" element={<DoctorReview />} />
        <Route path="/cases/timeline" element={<PatientTimeline />} />
        <Route path="/cases/reports-prescription" element={<ReportsPrescription />} />

        <Route path="/appointments" element={<Placeholder title="Appointments" />} />
        <Route path="/prescriptions" element={<Placeholder title="Prescriptions" />} />
        <Route path="/reports" element={<Placeholder title="Reports" />} />
        <Route path="/analytics" element={<Placeholder title="Analytics" />} />
        <Route path="/follow-ups" element={<Placeholder title="Follow-ups" />} />
        <Route path="/messages" element={<Placeholder title="Messages" />} />
        <Route path="/settings" element={<Placeholder title="Settings" />} />
        <Route path="/help" element={<Placeholder title="Help & Support" />} />
        <Route path="*" element={<Placeholder title="Page Not Found" />} />
      </Route>
    </Routes>
  )
}
