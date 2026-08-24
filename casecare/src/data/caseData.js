// ---- Case workflow step definitions (they differ per screen in the reference) ----

// New Case (page 8)
export const NEW_CASE_STEPS = [
  'Patient Info',
  'Chief Complaint',
  'History',
  'Examination',
  'Review & Summary',
]

// Smart Case Taking (page 7)
export const SMART_STEPS = [
  'Patient Info',
  'Smart Case Taking',
  'History',
  'Examination',
  'Review & Summary',
]

// AI Adaptive Questions (page 6) & Medical History & Vitals (page 5)
export const FULL_STEPS = [
  'Patient Info',
  'Smart Case Taking',
  'AI Questions',
  'History & Vitals',
  'Examination',
  'Review & Summary',
]

// AI Case Summary (page 4) & Doctor Review (page 3)
export const SUMMARY_STEPS = [
  'Patient Info',
  'Smart Case Taking',
  'AI Questions',
  'History & Vitals',
  'AI Case Summary',
  'Doctor Review',
]

// ---- The active case used throughout the case-taking flow ----
export const activeCase = {
  id: 'CASE-2024-05-22-001',
  createdOn: '22 May 2024, 09:15 AM',
  createdBy: 'Dr. Rahul Sharma',
  chiefComplaint: 'Fever and Cough',
  duration: '4 Days',
  severity: 'Moderate',
  confidence: 85,
}

// Compact patient summary shown in right rails across case screens
export const casePatient = {
  name: 'Rahul Kumar',
  initials: 'RK',
  age: 45,
  gender: 'Male',
  id: 'P001245',
  phone: '+91 98765 43210',
}

export const extractedInfo = [
  { label: 'Chief Complaint', value: 'Fever and Cough', icon: 'stethoscope' },
  { label: 'Duration', value: '4 Days', icon: 'clock' },
  { label: 'Onset', value: 'Gradual', icon: 'activity' },
  { label: 'Severity', value: 'Moderate', icon: 'gauge' },
  { label: 'Associated Symptoms', value: 'Cough', icon: 'thermometer' },
  { label: 'Language Detected', value: 'Hindi (Auto-translated)', icon: 'languages' },
]

export const conversation = [
  {
    role: 'patient',
    name: 'Patient',
    time: '00:05',
    text: 'Doctor, mujhe 4 din se bukhar hai aur thodi khaansi bhi hai.',
  },
  {
    role: 'ai',
    name: 'AI Assistant',
    time: '00:10',
    text: 'Theek hai, kya aapko sardi ya gala dard bhi ho raha hai?',
  },
]

export const adaptiveQuestion = {
  index: 6,
  total: 15,
  hindi: 'Kya aapko bukhar ke saath thand lagti hai ya kaampte hain?',
  english: 'Do you experience chills or shivering with fever?',
  reasoning:
    'Patient has fever and cough for 4 days. Checking for chills can help assess the severity and possible infection.',
  options: ['Yes, often', 'Sometimes', 'Rarely', 'No, never', 'Not sure'],
  selected: 'Yes, often',
}

export const previousResponses = [
  { q: 'Bukhar kab se hai?', a: '4 din se' },
  { q: 'Kya bukhar lagataar rehta hai ya beech beech mein?', a: 'Lagataar rehta hai' },
  { q: 'Kya aapko khansi hai?', a: 'Haan' },
]

export const aiInsights = ['Viral Fever', 'Influenza', 'Typhoid Fever (Consider)']

// ---- AI Case Summary content ----
export const caseSummary = {
  chiefComplaint: 'Fever and Cough for 4 days',
  hpi: [
    'Patient has fever for 4 days, intermittent, associated with chills and body ache.',
    'Dry cough since 3 days, more at night. No shortness of breath.',
    'Mild headache and fatigue present. Appetite is reduced.',
    'No history of vomiting or diarrhea.',
  ],
  associatedSymptoms: ['Body ache', 'Chills', 'Mild headache', 'Fatigue'],
  onset: 'Gradual',
  durationDetail: '4 Days',
  probableDiagnosis: 'Acute Viral Fever / Upper Respiratory Tract Infection',
  differentials: ['Influenza', 'Typhoid Fever (Early)', 'COVID-19 (To rule out)'],
  severityNote: 'Patient is stable, no red flag symptoms present.',
  nextSteps: [
    'Physical examination',
    'CBC, CRP',
    'Dengue NS1 (if fever persists)',
    'Chest auscultation',
    'Advise rest, hydration and paracetamol for fever',
  ],
  generatedOn: '22 May 2024, 09:45 AM',
}

export const sourceOfInformation = [
  { label: 'AI Conversation', value: 70, color: '#3b82f6' },
  { label: 'Patient History', value: 20, color: '#8b5cf6' },
  { label: 'Vitals', value: 5, color: '#10b981' },
  { label: 'Other Data', value: 5, color: '#f59e0b' },
]

export const keyClinicalIndicators = [
  { label: 'Fever', value: 'Present', tone: 'neutral', icon: 'thermometer' },
  { label: 'Cough', value: 'Present', tone: 'neutral', icon: 'wind' },
  { label: 'Chills', value: 'Present', tone: 'neutral', icon: 'snowflake' },
  { label: 'Breathing Difficulty', value: 'Absent', tone: 'muted', icon: 'activity' },
  { label: 'Appetite', value: 'Reduced', tone: 'warn', icon: 'utensils' },
]

// ---- Vitals ----
export const vitals = [
  { label: 'Temperature', value: '99.2', unit: '°F', note: 'Oral', icon: 'thermometer', tone: 'amber' },
  { label: 'Pulse Rate', value: '88', unit: 'bpm', icon: 'heart', tone: 'rose' },
  { label: 'Respiratory Rate', value: '18', unit: 'breaths/min', icon: 'wind', tone: 'sky' },
  { label: 'Blood Pressure', value: '128/82', unit: 'mmHg', icon: 'gauge', tone: 'indigo' },
  { label: 'SpO2', value: '98', unit: '%', icon: 'droplet', tone: 'emerald' },
  { label: 'Weight', value: '72', unit: 'kg', icon: 'scale', tone: 'violet' },
  { label: 'Height', value: '175', unit: 'cm', icon: 'ruler', tone: 'teal' },
  { label: 'BMI', value: '23.5', unit: 'Normal', icon: 'calculator', tone: 'blue' },
  { label: 'Pain Score', value: '2', unit: '/10 Mild', icon: 'smile', tone: 'green' },
]

export const vitalsCompact = [
  { label: 'Temperature', value: '99.2 °F' },
  { label: 'Pulse Rate', value: '88 bpm' },
  { label: 'BP', value: '128/82 mmHg' },
  { label: 'SpO2', value: '98 %' },
  { label: 'Respiratory Rate', value: '18 /min' },
]

// ---- Timeline events (page 2) ----
export const timelineEvents = [
  {
    day: '22 May 2024 (Day 1)',
    items: [
      { time: '09:15 AM', title: 'Case Started', desc: 'New case initiated by Dr. Rahul Sharma', by: 'System', icon: 'message' },
      { time: '09:18 AM', title: 'Patient Information Added', desc: 'Basic patient details, demographics and contact information recorded', by: 'Dr. Rahul Sharma', icon: 'user' },
      { time: '09:25 AM', title: 'Smart Case Taking Completed', desc: 'AI-powered conversation completed (Duration: 12m 45s)', by: 'System', icon: 'mic' },
      { time: '09:40 AM', title: 'AI Adaptive Questions Completed', desc: '15 adaptive questions asked and answered', by: 'System', icon: 'sparkles' },
      { time: '10:05 AM', title: 'Medical History & Vitals Recorded', desc: 'History, vitals and lifestyle information captured', by: 'Dr. Rahul Sharma', icon: 'heart' },
      { time: '10:20 AM', title: 'AI Case Summary Generated', desc: 'AI generated case summary with probable diagnosis', by: 'System', icon: 'fileText' },
    ],
  },
  {
    day: '22 May 2024 (Day 1) - Continued',
    items: [
      { time: '10:35 AM', title: 'Doctor Review', desc: 'Case reviewed by doctor. Clinical notes and plan added', by: 'Dr. Rahul Sharma', icon: 'userCheck' },
      { time: '10:50 AM', title: 'Case Finalized', desc: 'Case finalized and saved', by: 'System', icon: 'clipboardCheck' },
    ],
  },
  {
    day: '25 May 2024 (Day 4)',
    items: [
      { time: '11:00 AM', title: 'Follow-up Scheduled', desc: 'Follow-up scheduled after 3 days', by: 'Dr. Rahul Sharma', icon: 'calendar' },
    ],
  },
]

export const caseProgress = [
  { label: 'Patient Info', time: '22 May, 09:15 AM' },
  { label: 'Smart Case Taking', time: '22 May, 09:18 AM' },
  { label: 'AI Questions', time: '22 May, 09:40 AM' },
  { label: 'History & Vitals', time: '22 May, 10:05 AM' },
  { label: 'AI Case Summary', time: '22 May, 10:20 AM' },
  { label: 'Doctor Review', time: '22 May, 10:35 AM' },
]

// ---- Reports & Prescription (page 1) ----
export const uploadedReports = [
  { name: 'CBC Report', date: '22 May 2024, 10:10 AM', size: '245 KB', type: 'pdf', status: 'Normal' },
  { name: 'Chest X-Ray', date: '22 May 2024, 10:12 AM', size: '1.2 MB', type: 'image', status: 'Abnormal' },
  { name: 'CRP Test', date: '22 May 2024, 10:15 AM', size: '120 KB', type: 'pdf', status: 'Normal' },
  { name: 'Dengue NS1', date: '22 May 2024, 10:16 AM', size: '110 KB', type: 'pdf', status: 'Negative' },
  { name: 'Blood Sugar (Fasting)', date: '22 May 2024, 10:18 AM', size: '95 KB', type: 'pdf', status: 'Normal' },
]

export const prescriptionMeds = [
  { name: 'Paracetamol', strength: '650 mg', dose: '1 Tablet', frequency: 'TDS', duration: '3 Days', instructions: 'After food' },
  { name: 'Azithromycin', strength: '500 mg', dose: '1 Tablet', frequency: 'OD', duration: '3 Days', instructions: 'After food' },
  { name: 'Levocetirizine', strength: '5 mg', dose: '1 Tablet', frequency: 'OD (Night)', duration: '5 Days', instructions: 'After food' },
  { name: 'Cetirizine Syrup', strength: '5 ml', dose: '5 ml', frequency: 'BD', duration: '5 Days', instructions: 'After food' },
]

export const reviewHighlights = {
  vitals: [
    { label: 'Temp', value: '99.2 °F' },
    { label: 'Pulse', value: '88 bpm' },
    { label: 'BP', value: '128/82 mmHg' },
    { label: 'SpO2', value: '98%' },
  ],
  history: ['No history of diabetes', 'No history of hypertension', 'No known allergies', 'Non-smoker'],
  alarmSigns: [
    { label: 'Breathing Difficulty', value: 'Absent' },
    { label: 'Chest Pain', value: 'Absent' },
    { label: 'Confusion', value: 'Absent' },
    { label: 'Dehydration', value: 'Absent' },
  ],
}
