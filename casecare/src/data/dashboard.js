import { Users, CalendarCheck, ClipboardList, RotateCcw, Clock } from 'lucide-react'

export const stats = [
  { label: 'Total Patients', value: '1,240', icon: Users, trend: '↑ 12.5%', trendNote: 'from last month', trendTone: 'up', accent: 'emerald', foot: null },
  { label: "Today's Cases", value: '24', icon: CalendarCheck, trend: '↑ 9.1%', trendNote: 'from yesterday', trendTone: 'up', accent: 'blue', foot: null },
  { label: 'Pending Cases', value: '8', icon: ClipboardList, foot: 'View and complete', footTone: 'amber', accent: 'amber' },
  { label: 'Follow-ups', value: '12', icon: RotateCcw, foot: 'Upcoming follow-ups', footTone: 'violet', accent: 'violet' },
  { label: "Today's Appointments", value: '18', icon: Clock, foot: 'Next: 10:30 AM', footTone: 'rose', accent: 'rose' },
]

export const recentPatients = [
  { name: 'Rahul Kumar', pid: 'P00124', age: '45 / Male', lastVisit: 'Today, 09:15 AM', case: 'Fever and Cough', status: 'Completed', avatar: 'https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?w=80&h=80&fit=crop&crop=faces' },
  { name: 'Aisha Khan', pid: 'P00125', age: '32 / Female', lastVisit: 'Today, 08:40 AM', case: 'Headache', status: 'In Progress', avatar: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=80&h=80&fit=crop&crop=faces' },
  { name: 'Suresh Kumar', pid: 'P00126', age: '60 / Male', lastVisit: 'Yesterday', case: 'Diabetes Follow-up', status: 'Pending', avatar: null, initials: 'SK' },
  { name: 'Neha Singh', pid: 'P00127', age: '28 / Female', lastVisit: 'Yesterday', case: 'Skin Allergy', status: 'Completed', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&crop=faces' },
  { name: 'Anil Patel', pid: 'P00128', age: '50 / Male', lastVisit: '21 May 2024', case: 'BP Checkup', status: 'Completed', avatar: null, initials: 'AP' },
]

export const todaySchedule = [
  { time: '09:00 AM', name: 'Rahul Kumar', reason: 'Fever and Cough', status: 'Completed' },
  { time: '10:30 AM', name: 'Aisha Khan', reason: 'Headache', status: 'Scheduled' },
  { time: '11:00 AM', name: 'Mohit Verma', reason: 'Stomach Pain', status: 'Scheduled' },
  { time: '12:30 PM', name: 'Sunita Devi', reason: 'Diabetes Follow-up', status: 'Scheduled' },
  { time: '02:00 PM', name: 'Arjun Mehta', reason: 'BP Checkup', status: 'Scheduled' },
]

export const recentActivity = [
  { text: 'New case created for Rahul Kumar', time: '09:15 AM', icon: 'userPlus', tone: 'emerald' },
  { text: 'Prescription generated for Neha Singh', time: 'Yesterday, 05:20 PM', icon: 'pill', tone: 'blue' },
  { text: 'Appointment scheduled with Aisha Khan', time: 'Yesterday, 04:10 PM', icon: 'calendar', tone: 'violet' },
  { text: 'Report uploaded for Suresh Kumar', time: '21 May 2024', icon: 'fileText', tone: 'amber' },
]

// Cases Overview line chart (This Week)
export const casesOverview = [
  { label: 'Mon', value: 10 },
  { label: 'Tue', value: 20 },
  { label: 'Wed', value: 22 },
  { label: 'Thu', value: 38 },
  { label: 'Fri', value: 25 },
  { label: 'Sat', value: 28 },
  { label: 'Sun', value: 14 },
]

// Case Status Distribution donut
export const caseStatusDistribution = {
  total: 132,
  segments: [
    { label: 'Completed', value: 62, pct: 47, color: '#10b981' },
    { label: 'In Progress', value: 32, pct: 24, color: '#3b82f6' },
    { label: 'Pending', value: 24, pct: 18, color: '#f59e0b' },
    { label: 'Cancelled', value: 14, pct: 11, color: '#8b5cf6' },
  ],
}
