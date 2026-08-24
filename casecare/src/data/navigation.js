import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Calendar,
  Pill,
  FileText,
  BarChart3,
  RotateCcw,
  MessageSquare,
  Settings,
  HelpCircle,
} from 'lucide-react'

// Global sidebar navigation. `Cases` has children (All Cases / New Case).
export const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
  { label: 'Patients', icon: Users, to: '/patients' },
  {
    label: 'Cases',
    icon: ClipboardList,
    children: [
      { label: 'All Cases', to: '/cases' },
      { label: 'New Case', to: '/cases/new' },
    ],
  },
  { label: 'Appointments', icon: Calendar, to: '/appointments' },
  { label: 'Prescriptions', icon: Pill, to: '/prescriptions' },
  { label: 'Reports', icon: FileText, to: '/reports' },
  { label: 'Analytics', icon: BarChart3, to: '/analytics' },
  { label: 'Follow-ups', icon: RotateCcw, to: '/follow-ups' },
  { label: 'Messages', icon: MessageSquare, to: '/messages', badge: 3 },
  { label: 'Settings', icon: Settings, to: '/settings' },
  { label: 'Help & Support', icon: HelpCircle, to: '/help' },
]

export const currentDoctor = {
  name: 'Dr. Rahul Sharma',
  role: 'General Physician',
  avatar:
    'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=200&fit=crop&crop=faces',
}
