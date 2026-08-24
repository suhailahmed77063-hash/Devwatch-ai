// Patient list for the Patients table (page 10)
export const patients = [
  { id: 'P001245', name: 'Rahul Kumar', age: 45, gender: 'Male', phone: '+91 98765 43210', lastVisit: '22 May 2024', lastVisitTime: '09:15 AM', cases: 4, status: 'Active', avatar: 'https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?w=100&h=100&fit=crop&crop=faces' },
  { id: 'P001246', name: 'Aisha Khan', age: 32, gender: 'Female', phone: '+91 87654 32109', lastVisit: '22 May 2024', lastVisitTime: '08:40 AM', cases: 2, status: 'Active', avatar: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=100&h=100&fit=crop&crop=faces' },
  { id: 'P001247', name: 'Suresh Kumar', age: 60, gender: 'Male', phone: '+91 91234 56789', lastVisit: '21 May 2024', lastVisitTime: '04:30 PM', cases: 6, status: 'Active', avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop&crop=faces' },
  { id: 'P001248', name: 'Neha Singh', age: 28, gender: 'Female', phone: '+91 99887 66554', lastVisit: '21 May 2024', lastVisitTime: '11:20 AM', cases: 1, status: 'Inactive', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=faces' },
  { id: 'P001249', name: 'Anil Patel', age: 50, gender: 'Male', phone: '+91 88990 11223', lastVisit: '20 May 2024', lastVisitTime: '10:05 AM', cases: 3, status: 'Active', avatar: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=100&h=100&fit=crop&crop=faces' },
  { id: 'P001250', name: 'Sunita Devi', age: 55, gender: 'Female', phone: '+91 77665 54433', lastVisit: '19 May 2024', lastVisitTime: '03:15 PM', cases: 2, status: 'Inactive', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=faces' },
  { id: 'P001251', name: 'Mohit Verma', age: 38, gender: 'Male', phone: '+91 76543 21098', lastVisit: '18 May 2024', lastVisitTime: '09:50 AM', cases: 5, status: 'Active', avatar: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100&h=100&fit=crop&crop=faces' },
]

export const patientsPagination = { showing: '1 to 10 of 120 entries', pages: [1, 2, 3, '...', 12], current: 1 }

// Detailed profile for Rahul Kumar (page 9)
export const patientProfile = {
  id: 'P001245',
  name: 'Rahul Kumar',
  gender: 'Male',
  ageDetail: '45 Years, 2 Months',
  phone: '+91 98765 43210',
  email: 'rahulkumar@email.com',
  address: '21, Green Park, New Delhi, India - 110016',
  bloodGroup: 'B+',
  maritalStatus: 'Married',
  occupation: 'Business',
  nationality: 'Indian',
  registeredOn: '15 Mar 2023',
  lastVisit: '22 May 2024',
  allergies: 'Penicillin',
  primaryDoctor: 'Dr. Rahul Sharma',
  avatar: 'https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?w=300&h=300&fit=crop&crop=faces',
  createdOn: '15 Mar 2023',
  lastUpdated: '22 May 2024, 10:30 AM by Dr. Rahul Sharma',
  medicalInfo: [
    { label: 'Chronic Conditions', value: 'Hypertension', badge: true, icon: 'heart' },
    { label: 'Diabetes', value: 'No', icon: 'droplet' },
    { label: 'Asthma', value: 'No', icon: 'wind' },
    { label: 'Heart Disease', value: 'No', icon: 'heartPulse' },
    { label: 'Thyroid', value: 'No', icon: 'activity' },
    { label: 'Other Conditions', value: '--', icon: 'info' },
  ],
  medications: [
    { name: 'Amlodipine', dose: '5 mg', frequency: 'Once Daily', timing: 'Morning' },
    { name: 'Telmisartan', dose: '40 mg', frequency: 'Once Daily', timing: 'Morning' },
    { name: 'Vitamin D3', dose: '60000 IU', frequency: 'Once Weekly', timing: 'Sunday' },
  ],
  allergyList: [{ name: 'Penicillin', severity: 'Mild - Rash' }],
  lifestyle: [
    { label: 'Smoking', value: 'No', icon: 'cigarette' },
    { label: 'Alcohol', value: 'Occasionally', icon: 'wine' },
    { label: 'Exercise', value: 'Regular', icon: 'dumbbell' },
    { label: 'Diet', value: 'Vegetarian', icon: 'salad' },
  ],
  recentCases: [
    { day: '22', month: 'May', year: '2024', title: 'Fever and Cough', doctor: 'Dr. Rahul Sharma', time: '09:15 AM', status: 'Completed' },
    { day: '10', month: 'May', year: '2024', title: 'Headache and Body Pain', doctor: 'Dr. Rahul Sharma', time: '08:40 AM', status: 'In Progress' },
    { day: '15', month: 'Apr', year: '2024', title: 'Hypertension Follow-up', doctor: 'Dr. Rahul Sharma', time: '11:20 AM', status: 'Completed' },
    { day: '21', month: 'Feb', year: '2024', title: 'General Checkup', doctor: 'Dr. Rahul Sharma', time: '10:05 AM', status: 'Completed' },
  ],
}

export const profileTabs = ['Overview', 'Case History', 'Timeline', 'Prescriptions', 'Reports', 'Documents', 'Follow-ups', 'Notes']
