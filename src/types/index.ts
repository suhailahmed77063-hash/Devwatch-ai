// ============================================================
// Core Types for College Management System
// ============================================================

export type Role =
  | "super_admin"
  | "admin"
  | "viewer"
  | "readonly";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  department?: string;
  phone?: string;
}

export type Gender = "male" | "female" | "other";

export type Status = "active" | "inactive" | "pending" | "suspended";

export type FeeStatus = "paid" | "partial" | "pending" | "overdue" | "scholarship";

export type AdmissionStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "documents_pending"
  | "approved"
  | "rejected"
  | "enrolled";

export type AttendanceStatus = "present" | "absent" | "late" | "excused" | "holiday";

export type DocumentStatus = "pending" | "verified" | "rejected";

export type BookStatus = "available" | "issued" | "reserved" | "lost";

export type RoomStatus = "available" | "occupied" | "maintenance";

export type ExamType = "midterm" | "final" | "quiz" | "assignment" | "practical" | "viva";

export type Grade = "A+" | "A" | "A-" | "B+" | "B" | "B-" | "C+" | "C" | "C-" | "D" | "F" | "S" | "RA";

// ============================================================
// Student
// ============================================================
export interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  gender: Gender;
  dateOfBirth: string;
  admissionDate: string;
  courseId: string;
  course: string;
  department: string;
  year: number;
  semester: number;
  section: string;
  rollNumber: string;
  attendance: number;
  feeStatus: FeeStatus;
  status: Status;
  avatar?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  bloodGroup?: string;
  aadharNumber?: string;
  parentName: string;
  parentPhone: string;
  parentEmail?: string;
  emergencyContact: string;
  emergencyRelation: string;
  hostelId?: string;
  transportRouteId?: string;
  documents?: StudentDocument[];
}

export interface StudentDocument {
  id: string;
  name: string;
  type: string;
  uploadDate: string;
  status: DocumentStatus;
}

// ============================================================
// Faculty
// ============================================================
export interface Faculty {
  id: string;
  name: string;
  email: string;
  phone: string;
  gender: Gender;
  dateOfBirth: string;
  joiningDate: string;
  department: string;
  designation: string;
  qualification: string;
  experience: number;
  status: Status;
  avatar?: string;
  address: string;
  subjects: string[];
  workload: number;
  salary: number;
  leaveBalance: number;
  publications?: number;
  research?: string;
}

// ============================================================
// Department
// ============================================================
export interface Department {
  id: string;
  name: string;
  code: string;
  hodId?: string;
  hodName?: string;
  facultyCount: number;
  studentCount: number;
  courses: number;
  established: string;
  email?: string;
  phone?: string;
  building?: string;
}

// ============================================================
// Course
// ============================================================
export interface Course {
  id: string;
  name: string;
  code: string;
  department: string;
  duration: number;
  totalSemesters: number;
  totalCredits: number;
  type: "undergraduate" | "postgraduate" | "diploma" | "certificate";
  status: Status;
  subjects: Subject[];
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  credits: number;
  semester: number;
  type: "theory" | "practical" | "project" | "elective";
  facultyId?: string;
  facultyName?: string;
}

// ============================================================
// Class & Section
// ============================================================
export interface ClassSection {
  id: string;
  name: string;
  course: string;
  department: string;
  year: number;
  semester: number;
  section: string;
  studentCount: number;
  classTeacherId?: string;
  classTeacher?: string;
  classroom?: string;
  batchSize?: string;
}

// ============================================================
// Attendance
// ============================================================
export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  subject?: string;
  status: AttendanceStatus;
  timeIn?: string;
  timeOut?: string;
  markedBy?: string;
}

export interface AttendanceSummary {
  studentId: string;
  studentName: string;
  totalDays: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  percentage: number;
}

// ============================================================
// Timetable
// ============================================================
export interface TimetableSlot {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  subject: string;
  subjectCode: string;
  faculty: string;
  facultyId: string;
  room: string;
  type: "lecture" | "lab" | "tutorial" | "break";
}

// ============================================================
// Examination
// ============================================================
export interface Exam {
  id: string;
  name: string;
  type: ExamType;
  course: string;
  semester: number;
  startDate: string;
  endDate: string;
  totalMarks: number;
  passingMarks: number;
  status: "upcoming" | "ongoing" | "completed" | "results_published";
}

export interface ExamResult {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  course: string;
  subject: string;
  marksObtained: number;
  totalMarks: number;
  grade: Grade;
  gradePoints: number;
  remarks?: string;
}

export interface SubjectResult {
  subject: string;
  subjectCode: string;
  marksObtained: number;
  totalMarks: number;
  grade: Grade;
  gradePoints: number;
  credits: number;
}

export interface SemesterResult {
  semester: number;
  sgpa: number;
  cgpa: number;
  subjects: SubjectResult[];
  totalCredits: number;
  earnedCredits: number;
}

// ============================================================
// Assignment
// ============================================================
export interface Assignment {
  id: string;
  title: string;
  description: string;
  subject: string;
  subjectCode: string;
  courseId: string;
  course: string;
  semester: number;
  section: string;
  facultyId: string;
  facultyName: string;
  assignedDate: string;
  dueDate: string;
  totalMarks: number;
  status: "active" | "closed" | "draft";
  submissions: number;
  totalStudents: number;
  attachments?: string[];
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  submittedDate: string;
  status: "submitted" | "graded" | "late" | "not_submitted";
  marks?: number;
  grade?: Grade;
  feedback?: string;
  fileUrl?: string;
}

// ============================================================
// Fees & Finance
// ============================================================
export interface FeeStructure {
  id: string;
  name: string;
  course: string;
  semester: number;
  academicYear: string;
  components: FeeComponent[];
  totalAmount: number;
  dueDate: string;
}

export interface FeeComponent {
  name: string;
  amount: number;
  description?: string;
}

export interface StudentFee {
  id: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  course: string;
  semester: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  status: FeeStatus;
  dueDate: string;
  lastPaymentDate?: string;
}

export interface Payment {
  id: string;
  studentId: string;
  studentName: string;
  amount: number;
  mode: "cash" | "online" | "cheque" | "dd" | "upi" | "bank_transfer";
  reference: string;
  date: string;
  status: "completed" | "pending" | "failed" | "refunded";
  receiptNumber: string;
  description: string;
}

// ============================================================
// Library
// ============================================================
export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  publisher: string;
  category: string;
  edition: string;
  yearOfPublication: number;
  totalCopies: number;
  availableCopies: number;
  status: BookStatus;
  shelf?: string;
  rack?: string;
}

export interface BookIssue {
  id: string;
  bookId: string;
  bookTitle: string;
  studentId: string;
  studentName: string;
  issueDate: string;
  dueDate: string;
  returnDate?: string;
  status: "issued" | "returned" | "overdue" | "renewed";
  fine?: number;
}

// ============================================================
// Hostel
// ============================================================
export interface Hostel {
  id: string;
  name: string;
  type: "boys" | "girls" | "co-ed";
  totalRooms: number;
  occupiedRooms: number;
  warden: string;
  contact: string;
  address?: string;
}

export interface HostelRoom {
  id: string;
  hostelId: string;
  roomNumber: string;
  floor: number;
  building: string;
  type: "single" | "double" | "triple" | "quad";
  capacity: number;
  occupied: number;
  status: RoomStatus;
  students: string[];
  amenities: string[];
}

// ============================================================
// Transport
// ============================================================
export interface TransportRoute {
  id: string;
  name: string;
  routeNumber: string;
  busNumber: string;
  driver: string;
  driverPhone: string;
  capacity: number;
  enrolled: number;
  stops: TransportStop[];
  departureTime: string;
  returnTime: string;
  status: Status;
  fare: number;
}

export interface TransportStop {
  id: string;
  name: string;
  time: string;
  sequence: number;
}

// ============================================================
// Events & Calendar
// ============================================================
export interface CollegeEvent {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  type: "academic" | "cultural" | "sports" | "workshop" | "seminar" | "holiday" | "exam" | "other";
  venue: string;
  organizer: string;
  department?: string;
  targetAudience: string[];
  status: "upcoming" | "ongoing" | "completed" | "cancelled";
  registrationRequired: boolean;
  maxParticipants?: number;
  registered?: number;
}

// ============================================================
// Notices
// ============================================================
export interface Notice {
  id: string;
  title: string;
  content: string;
  category: "general" | "academic" | "exam" | "fee" | "event" | "emergency" | "admin";
  priority: "low" | "medium" | "high" | "urgent";
  publishedDate: string;
  expiryDate?: string;
  author: string;
  department?: string;
  targetAudience: string[];
  attachments?: string[];
  isRead: boolean;
}

// ============================================================
// Messages
// ============================================================
export interface Message {
  id: string;
  subject: string;
  content: string;
  from: string;
  fromName: string;
  to: string;
  toName: string;
  date: string;
  read: boolean;
  starred: boolean;
  category: "academic" | "admin" | "finance" | "general";
}

// ============================================================
// Documents
// ============================================================
export interface Document {
  id: string;
  name: string;
  type: "bonafide" | "transfer_certificate" | "id_card" | "marksheet" | "character_certificate" | "migration" | "other";
  studentId?: string;
  studentName?: string;
  requestDate: string;
  issueDate?: string;
  status: DocumentStatus;
  issuedBy?: string;
  remarks?: string;
  downloadUrl?: string;
}

// ============================================================
// Notifications
// ============================================================
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "fee" | "attendance" | "assignment" | "exam" | "result" | "notice" | "admission" | "document" | "general";
  date: string;
  read: boolean;
  actionUrl?: string;
}

// ============================================================
// Reports
// ============================================================
export interface ReportConfig {
  id: string;
  name: string;
  type: string;
  description: string;
  filters: ReportFilter[];
}

export interface ReportFilter {
  field: string;
  label: string;
  type: "date" | "select" | "multi-select" | "text";
  options?: string[];
}

// ============================================================
// Settings
// ============================================================
export interface CollegeSettings {
  name: string;
  logo?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  website?: string;
  academicYear: string;
  currentSemester: number;
  timezone: string;
  gradingSystem: "percentage" | "gpa" | "both";
}

// ============================================================
// Dashboard
// ============================================================
export interface DashboardStats {
  totalStudents: number;
  newAdmissions: number;
  faculty: number;
  departments: number;
  attendancePercentage: number;
  pendingFees: number;
  upcomingExams: number;
  libraryBooks: number;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  value2?: number;
  [key: string]: string | number | undefined;
}
