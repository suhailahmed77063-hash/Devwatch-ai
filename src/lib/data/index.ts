import type {
  Student,
  Faculty,
  Department,
  Course,
  ClassSection,
  AttendanceRecord,
  TimetableSlot,
  Exam,
  ExamResult,
  Assignment,
  StudentFee,
  Payment,
  Book,
  BookIssue,
  Hostel,
  HostelRoom,
  TransportRoute,
  CollegeEvent,
  Notice,
  Message,
  Document,
  Notification,
  DashboardStats,
  SemesterResult,
  AssignmentSubmission,
  AttendanceSummary,
  FeeStructure,
} from "@/types";

// ============================================================
// Helper functions
// ============================================================
const randomBetween = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// ============================================================
// Departments
// ============================================================
export const departments: Department[] = [
  { id: "dept-1", name: "Computer Science & Engineering", code: "CSE", hodId: "fac-1", hodName: "Dr. Rajesh Kumar", facultyCount: 18, studentCount: 240, courses: 4, established: "2001", building: "Block A", email: "cse@college.edu.in", phone: "044-22345671" },
  { id: "dept-2", name: "Electronics & Communication", code: "ECE", hodId: "fac-2", hodName: "Dr. Priya Sharma", facultyCount: 14, studentCount: 180, courses: 3, established: "2001", building: "Block B", email: "ece@college.edu.in", phone: "044-22345672" },
  { id: "dept-3", name: "Mechanical Engineering", code: "ME", hodId: "fac-3", hodName: "Dr. Suresh Reddy", facultyCount: 16, studentCount: 200, courses: 3, established: "2001", building: "Block C", email: "me@college.edu.in", phone: "044-22345673" },
  { id: "dept-4", name: "Civil Engineering", code: "CE", hodId: "fac-4", hodName: "Dr. Anitha Patel", facultyCount: 12, studentCount: 150, courses: 2, established: "2003", building: "Block D", email: "ce@college.edu.in", phone: "044-22345674" },
  { id: "dept-5", name: "Information Technology", code: "IT", hodId: "fac-5", hodName: "Dr. Vikram Singh", facultyCount: 14, studentCount: 200, courses: 3, established: "2005", building: "Block A", email: "it@college.edu.in", phone: "044-22345675" },
  { id: "dept-6", name: "Electrical Engineering", code: "EE", hodId: "fac-6", hodName: "Dr. Meena Krishnan", facultyCount: 11, studentCount: 120, courses: 2, established: "2003", building: "Block E", email: "ee@college.edu.in", phone: "044-22345676" },
  { id: "dept-7", name: "Chemistry", code: "CHEM", hodId: "fac-7", hodName: "Dr. Lakshmi Narayanan", facultyCount: 10, studentCount: 90, courses: 2, established: "2005", building: "Block F", email: "chem@college.edu.in", phone: "044-22345677" },
  { id: "dept-8", name: "Mathematics", code: "MATH", hodId: "fac-8", hodName: "Dr. Arun Nair", facultyCount: 8, studentCount: 60, courses: 1, established: "2001", building: "Block F", email: "math@college.edu.in", phone: "044-22345678" },
  { id: "dept-9", name: "Humanities & Sciences", code: "H&S", hodId: "fac-9", hodName: "Dr. Kavitha Raman", facultyCount: 15, studentCount: 0, courses: 0, established: "2001", building: "Block G", email: "hs@college.edu.in", phone: "044-22345679" },
  { id: "dept-10", name: "MBA", code: "MBA", hodId: "fac-10", hodName: "Dr. Ravi Teja", facultyCount: 8, studentCount: 60, courses: 1, established: "2010", building: "Block H", email: "mba@college.edu.in", phone: "044-22345680" },
];

// ============================================================
// Courses
// ============================================================
export const courses: Course[] = [
  { id: "course-1", name: "B.Tech Computer Science & Engineering", code: "CSE101", department: "Computer Science & Engineering", duration: 4, totalSemesters: 8, totalCredits: 180, type: "undergraduate", status: "active", subjects: [] },
  { id: "course-2", name: "B.Tech Electronics & Communication", code: "ECE101", department: "Electronics & Communication", duration: 4, totalSemesters: 8, totalCredits: 176, type: "undergraduate", status: "active", subjects: [] },
  { id: "course-3", name: "B.Tech Mechanical Engineering", code: "ME101", department: "Mechanical Engineering", duration: 4, totalSemesters: 8, totalCredits: 180, type: "undergraduate", status: "active", subjects: [] },
  { id: "course-4", name: "B.Tech Civil Engineering", code: "CE101", department: "Civil Engineering", duration: 4, totalSemesters: 8, totalCredits: 176, type: "undergraduate", status: "active", subjects: [] },
  { id: "course-5", name: "B.Tech Information Technology", code: "IT101", department: "Information Technology", duration: 4, totalSemesters: 8, totalCredits: 180, type: "undergraduate", status: "active", subjects: [] },
  { id: "course-6", name: "B.Tech Electrical Engineering", code: "EE101", department: "Electrical Engineering", duration: 4, totalSemesters: 8, totalCredits: 176, type: "undergraduate", status: "active", subjects: [] },
  { id: "course-7", name: "M.Tech Computer Science", code: "CSE201", department: "Computer Science & Engineering", duration: 2, totalSemesters: 4, totalCredits: 80, type: "postgraduate", status: "active", subjects: [] },
  { id: "course-8", name: "M.Tech VLSI Design", code: "ECE201", department: "Electronics & Communication", duration: 2, totalSemesters: 4, totalCredits: 78, type: "postgraduate", status: "active", subjects: [] },
  { id: "course-9", name: "MBA", code: "MBA101", department: "MBA", duration: 2, totalSemesters: 4, totalCredits: 84, type: "postgraduate", status: "active", subjects: [] },
  { id: "course-10", name: "MCA", code: "MCA101", department: "Information Technology", duration: 3, totalSemesters: 6, totalCredits: 120, type: "postgraduate", status: "active", subjects: [] },
];

// ============================================================
// Students
// ============================================================
const firstNames = ["Aarav", "Vivaan", "Aditya", "Arjun", "Sai", "Rohan", "Vihaan", "Krishna", "Diya", "Ananya", "Priya", "Neha", "Kavya", "Ishita", "Riya", "Aisha", "Meera", "Pooja", "Sneha", "Divya", "Gaurav", "Rahul", "Amit", "Sanjay", "Kiran", "Deepak", "Manoj", "Suresh", "Ashok", "Ramesh", "Lakshmi", "Geeta", "Sunita", "Rekha", "Kamala", "Sarojini", "Manisha", "Prachi", "Tanvi", "Nisha"];
const lastNames = ["Sharma", "Patel", "Kumar", "Singh", "Reddy", "Nair", "Gupta", "Iyer", "Joshi", "Mishra", "Desai", "Menon", "Rao", "Krishnan", "Choudhary", "Tiwari", "Verma", "Yadav", "Mehta", "Shah"];
const bloodGroups = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
const cities = ["Chennai", "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Pune", "Kolkata", "Ahmedabad", "Jaipur", "Lucknow"];
const states = ["Tamil Nadu", "Maharashtra", "Delhi", "Karnataka", "Telangana", "Maharashtra", "West Bengal", "Gujarat", "Rajasthan", "Uttar Pradesh"];

export const generateStudents = (count: number): Student[] => {
  const studentList: Student[] = [];
  for (let i = 0; i < count; i++) {
    const gender = i % 3 === 0 ? "female" : "male";
    const firstName = gender === "female"
      ? pickRandom(["Diya", "Ananya", "Priya", "Neha", "Kavya", "Ishita", "Riya", "Aisha", "Meera", "Pooja", "Sneha", "Divya", "Lakshmi", "Geeta", "Sunita", "Rekha", "Kamala", "Manisha", "Prachi", "Tanvi"])
      : pickRandom(["Aarav", "Vivaan", "Aditya", "Arjun", "Sai", "Rohan", "Vihaan", "Krishna", "Gaurav", "Rahul", "Amit", "Sanjay", "Kiran", "Deepak", "Manoj", "Suresh", "Ashok", "Ramesh", "Rajesh", "Vikram"]);
    const course = pickRandom(courses.filter(c => c.type === "undergraduate"));
    const dept = departments.find(d => d.name === course.department);
    const year = randomBetween(1, 4);
    const semester = (year - 1) * 2 + randomBetween(1, 2);
    const sections = ["A", "B", "C", "D"];
    const cityIdx = i % cities.length;

    studentList.push({
      id: `STU${String(1001 + i).padStart(4, "0")}`,
      name: `${firstName} ${pickRandom(lastNames)}`,
      email: `student${i + 1}@college.edu.in`,
      phone: `+91 ${randomBetween(70000, 99999)}${randomBetween(10000, 99999)}`,
      gender,
      dateOfBirth: `200${randomBetween(2, 5)}-${String(randomBetween(1, 12)).padStart(2, "0")}-${String(randomBetween(1, 28)).padStart(2, "0")}`,
      admissionDate: `202${randomBetween(1, 4)}-${String(randomBetween(6, 9)).padStart(2, "0")}-${String(randomBetween(1, 30)).padStart(2, "0")}`,
      courseId: course.id,
      course: course.name,
      department: course.department,
      year,
      semester,
      section: pickRandom(sections),
      rollNumber: `${course.code}${year}${String(i + 1).padStart(3, "0")}`,
      attendance: randomBetween(65, 98),
      feeStatus: pickRandom(["paid", "partial", "pending", "overdue", "scholarship"] as const),
      status: i % 20 === 0 ? "inactive" : "active",
      address: `${randomBetween(1, 500)}, ${pickRandom(["MG Road", "Park Street", "Gandhi Nagar", "Nehru Colony", "Rajiv Chowk", "Station Road", "Temple Street", "Lake View"])}`,
      city: cities[cityIdx],
      state: states[cityIdx],
      pincode: String(randomBetween(110001, 699999)),
      bloodGroup: pickRandom(bloodGroups),
      aadharNumber: `${randomBetween(1000, 9999)} ${randomBetween(1000, 9999)} ${randomBetween(1000, 9999)}`,
      parentName: `${pickRandom(firstNames)} ${pickRandom(lastNames)}`,
      parentPhone: `+91 ${randomBetween(70000, 99999)}${randomBetween(10000, 99999)}`,
      parentEmail: `parent${i + 1}@email.com`,
      emergencyContact: `+91 ${randomBetween(70000, 99999)}${randomBetween(10000, 99999)}`,
      emergencyRelation: pickRandom(["Father", "Mother", "Uncle", "Aunt"]),
    });
  }
  return studentList;
};

export const students: Student[] = generateStudents(120);

// ============================================================
// Faculty
// ============================================================
const facultyNames = [
  "Dr. Rajesh Kumar", "Dr. Priya Sharma", "Dr. Suresh Reddy", "Dr. Anitha Patel",
  "Dr. Vikram Singh", "Dr. Meena Krishnan", "Dr. Lakshmi Narayanan", "Dr. Arun Nair",
  "Dr. Kavitha Raman", "Dr. Ravi Teja", "Prof. Srinivas Murthy", "Prof. Deepa Menon",
  "Prof. Gopal Iyer", "Prof. Nandini Pillai", "Prof. Hari Prasad", "Prof. Asha Bose",
  "Dr. Venkatesh R.", "Dr. Swathi Rao", "Prof. Karthik Subramanian", "Prof. Divya Jain",
  "Dr. Manjunath K.", "Dr. Padmavathi S.", "Prof. Sathish Kumar", "Prof. Revathi N.",
  "Dr. Balaji R.", "Prof. Kanaka Lakshmi", "Dr. Mohan Das", "Prof. Jyothi Prakash",
  "Prof. Ramanathan V.", "Dr. Bharathi Devi", "Prof. Nagarajan S.", "Dr. Sujatha M.",
];

export const faculty: Faculty[] = facultyNames.map((name, i) => {
  const dept = departments[i % departments.length];
  return {
    id: `FAC${String(101 + i).padStart(3, "0")}`,
    name,
    email: `faculty${i + 1}@college.edu.in`,
    phone: `+91 ${randomBetween(70000, 99999)}${randomBetween(10000, 99999)}`,
    gender: i % 4 === 0 ? "female" : "male",
    dateOfBirth: `19${randomBetween(70, 90)}-${String(randomBetween(1, 12)).padStart(2, "0")}-${String(randomBetween(1, 28)).padStart(2, "0")}`,
    joiningDate: `20${randomBetween(10, 23)}-${String(randomBetween(1, 12)).padStart(2, "0")}-${String(randomBetween(1, 28)).padStart(2, "0")}`,
    department: dept.name,
    designation: pickRandom(["Professor", "Associate Professor", "Assistant Professor", "Lecturer", "Senior Lecturer"]),
    qualification: pickRandom(["Ph.D.", "Ph.D. + Post-Doc", "M.Tech + Ph.D.", "M.E.", "M.Tech."]),
    experience: randomBetween(3, 25),
    status: "active",
    address: `${randomBetween(1, 200)}, ${pickRandom(["Anna Nagar", "T Nagar", "Adyar", "Velachery", "Chromepet", "Porur"])}, Chennai`,
    subjects: [pickRandom(["Data Structures", "Algorithms", "DBMS", "OS", "CN", "Computer Networks", "Web Technologies", "Machine Learning", "AI", "Python Programming"])],
    workload: randomBetween(12, 24),
    salary: randomBetween(45000, 120000),
    leaveBalance: randomBetween(5, 20),
  };
});

// ============================================================
// Class Sections
// ============================================================
export const classSections: ClassSection[] = [];
courses.filter(c => c.type === "undergraduate").forEach(course => {
  ["A", "B", "C", "D"].forEach(section => {
    classSections.push({
      id: `cls-${course.code}-${section}`,
      name: `${course.code} - Year ${randomBetween(1, 4)} Section ${section}`,
      course: course.name,
      department: course.department,
      year: randomBetween(1, 4),
      semester: randomBetween(1, 8),
      section,
      studentCount: randomBetween(25, 40),
      classTeacher: faculty.find(f => f.department === course.department)?.name || faculty[0].name,
      classroom: `Room ${randomBetween(101, 410)}`,
    });
  });
});

// ============================================================
// Timetable
// ============================================================
const timeSlots = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00"];
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const subjects = ["Data Structures", "Algorithms", "DBMS", "Operating Systems", "Computer Networks", "Web Technologies", "Machine Learning", "Digital Logic", "Mathematics", "English Communication"];
const subjectCodes = ["CS301", "CS302", "CS303", "CS304", "CS305", "CS306", "CS307", "CS308", "MA301", "HS301"];

export const generateTimetable = (): TimetableSlot[] => {
  const slots: TimetableSlot[] = [];
  days.forEach(day => {
    timeSlots.forEach((time, idx) => {
      if (idx === 3) return; // lunch break
      const subIdx = randomBetween(0, subjects.length - 1);
      slots.push({
        id: `tt-${day}-${time}`,
        day,
        startTime: time,
        endTime: `${String(parseInt(time.split(":")[0]) + 1).padStart(2, "0")}:00`,
        subject: subjects[subIdx],
        subjectCode: subjectCodes[subIdx],
        faculty: faculty[randomBetween(0, 10)].name,
        facultyId: faculty[randomBetween(0, 10)].id,
        room: `Room ${randomBetween(101, 310)}`,
        type: subIdx > 6 ? "lab" : "lecture",
      });
    });
  });
  return slots;
};

export const timetable: TimetableSlot[] = generateTimetable();

// ============================================================
// Exams
// ============================================================
export const exams: Exam[] = [
  { id: "exam-1", name: "Internal Assessment - 1", type: "quiz", course: "B.Tech CSE", semester: 5, startDate: "2026-09-15", endDate: "2026-09-17", totalMarks: 30, passingMarks: 12, status: "upcoming" },
  { id: "exam-2", name: "Mid Semester Examination", type: "midterm", course: "B.Tech CSE", semester: 5, startDate: "2026-10-01", endDate: "2026-10-15", totalMarks: 100, passingMarks: 40, status: "upcoming" },
  { id: "exam-3", name: "Internal Assessment - 2", type: "quiz", course: "B.Tech CSE", semester: 5, startDate: "2026-11-10", endDate: "2026-11-12", totalMarks: 30, passingMarks: 12, status: "upcoming" },
  { id: "exam-4", name: "Practical Examination", type: "practical", course: "B.Tech CSE", semester: 5, startDate: "2026-11-20", endDate: "2026-11-25", totalMarks: 50, passingMarks: 20, status: "upcoming" },
  { id: "exam-5", name: "End Semester Examination", type: "final", course: "B.Tech CSE", semester: 5, startDate: "2026-12-01", endDate: "2026-12-25", totalMarks: 100, passingMarks: 40, status: "upcoming" },
  { id: "exam-6", name: "Mid Semester Examination", type: "midterm", course: "B.Tech ECE", semester: 3, startDate: "2026-08-10", endDate: "2026-08-20", totalMarks: 100, passingMarks: 40, status: "completed" },
  { id: "exam-7", name: "Internal Assessment - 1", type: "quiz", course: "B.Tech ME", semester: 5, startDate: "2026-09-08", endDate: "2026-09-10", totalMarks: 30, passingMarks: 12, status: "upcoming" },
  { id: "exam-8", name: "End Semester Examination", type: "final", course: "B.Tech IT", semester: 3, startDate: "2026-12-02", endDate: "2026-12-26", totalMarks: 100, passingMarks: 40, status: "upcoming" },
  { id: "exam-9", name: "Viva Voce", type: "viva", course: "B.Tech CSE", semester: 7, startDate: "2026-07-15", endDate: "2026-07-16", totalMarks: 50, passingMarks: 20, status: "completed" },
  { id: "exam-10", name: "Assignment Evaluation", type: "assignment", course: "MCA", semester: 4, startDate: "2026-08-01", endDate: "2026-08-05", totalMarks: 50, passingMarks: 20, status: "completed" },
];

// ============================================================
// Exam Results
// ============================================================
export const generateExamResults = (studentList: Student[]): ExamResult[] => {
  const results: ExamResult[] = [];
  const completedExams = exams.filter(e => e.status === "completed");
  completedExams.forEach(exam => {
    studentList.slice(0, 30).forEach(student => {
      const marks = randomBetween(Math.floor(exam.passingMarks * 0.6), exam.totalMarks);
      results.push({
        id: `res-${exam.id}-${student.id}`,
        examId: exam.id,
        studentId: student.id,
        studentName: student.name,
        rollNumber: student.rollNumber,
        course: exam.course,
        subject: pickRandom(subjects),
        marksObtained: marks,
        totalMarks: exam.totalMarks,
        grade: marks >= 90 ? "A+" : marks >= 80 ? "A" : marks >= 70 ? "B+" : marks >= 60 ? "B" : marks >= 50 ? "C+" : marks >= 40 ? "C" : "F",
        gradePoints: marks >= 90 ? 10 : marks >= 80 ? 9 : marks >= 70 ? 8 : marks >= 60 ? 7 : marks >= 50 ? 6 : marks >= 40 ? 5 : 0,
      });
    });
  });
  return results;
};

export const examResults = generateExamResults(students);

// ============================================================
// Semester Results
// ============================================================
export const generateSemesterResults = (): SemesterResult[] => {
  const semesters: SemesterResult[] = [];
  for (let sem = 1; sem <= 8; sem++) {
    const semSubjects = subjects.slice(0, 6).map((subj, idx) => ({
      subject: subj,
      subjectCode: subjectCodes[idx],
      marksObtained: randomBetween(50, 98),
      totalMarks: 100,
      grade: pickRandom(["A+", "A", "A-", "B+", "B"] as const),
      gradePoints: randomBetween(7, 10),
      credits: idx < 3 ? 4 : 3,
    }));
    const totalCredits = semSubjects.reduce((sum, s) => sum + s.credits, 0);
    const earnedCredits = semSubjects.reduce((sum, s) => sum + (s.marksObtained >= 40 ? s.credits : 0), 0);
    semesters.push({
      semester: sem,
      sgpa: Number((semSubjects.reduce((sum, s) => sum + s.gradePoints * s.credits, 0) / totalCredits).toFixed(2)),
      cgpa: Number((7.5 + Math.random() * 2).toFixed(2)),
      subjects: semSubjects.map(s => ({ ...s, marksObtained: s.marksObtained })),
      totalCredits,
      earnedCredits,
    });
  }
  return semesters;
};

// ============================================================
// Assignments
// ============================================================
export const assignments: Assignment[] = [
  { id: "asgn-1", title: "Implement Binary Search Tree Operations", description: "Write a C++ program to implement BST operations including insertion, deletion, search, and traversal.", subject: "Data Structures", subjectCode: "CS301", courseId: "course-1", course: "B.Tech CSE", semester: 5, section: "A", facultyId: "FAC101", facultyName: faculty[0].name, assignedDate: "2026-08-15", dueDate: "2026-08-25", totalMarks: 100, status: "active", submissions: 28, totalStudents: 42 },
  { id: "asgn-2", title: "Database Design - ER Diagram", description: "Design an ER diagram for a hospital management system with proper cardinality constraints.", subject: "DBMS", subjectCode: "CS303", courseId: "course-1", course: "B.Tech CSE", semester: 5, section: "A", facultyId: "FAC102", facultyName: faculty[1].name, assignedDate: "2026-08-18", dueDate: "2026-08-28", totalMarks: 50, status: "active", submissions: 35, totalStudents: 42 },
  { id: "asgn-3", title: "OS Process Scheduling Simulation", description: "Implement FCFS, SJF, Round Robin, and Priority scheduling algorithms.", subject: "Operating Systems", subjectCode: "CS304", courseId: "course-1", course: "B.Tech CSE", semester: 5, section: "B", facultyId: "FAC103", facultyName: faculty[2].name, assignedDate: "2026-08-20", dueDate: "2026-09-05", totalMarks: 100, status: "active", submissions: 22, totalStudents: 40 },
  { id: "asgn-4", title: "TCP/IP Protocol Implementation", description: "Write a client-server chat application using TCP sockets in Java.", subject: "Computer Networks", subjectCode: "CS305", courseId: "course-1", course: "B.Tech CSE", semester: 5, section: "A", facultyId: "FAC104", facultyName: faculty[3].name, assignedDate: "2026-08-10", dueDate: "2026-08-20", totalMarks: 50, status: "closed", submissions: 40, totalStudents: 42 },
  { id: "asgn-5", title: "Web Application Development", description: "Build a responsive college event management portal using React.js with REST API integration.", subject: "Web Technologies", subjectCode: "CS306", courseId: "course-1", course: "B.Tech CSE", semester: 5, section: "A", facultyId: "FAC105", facultyName: faculty[4].name, assignedDate: "2026-09-01", dueDate: "2026-09-20", totalMarks: 100, status: "active", submissions: 5, totalStudents: 42 },
  { id: "asgn-6", title: "Linear Regression Model", description: "Implement linear regression from scratch and compare with scikit-learn implementation.", subject: "Machine Learning", subjectCode: "CS307", courseId: "course-7", course: "M.Tech CSE", semester: 1, section: "A", facultyId: "FAC106", facultyName: faculty[5].name, assignedDate: "2026-08-22", dueDate: "2026-09-01", totalMarks: 100, status: "active", submissions: 12, totalStudents: 20 },
  { id: "asgn-7", title: "Digital Circuit Design", description: "Design and simulate 4-bit ALU using Verilog HDL.", subject: "Digital Logic", subjectCode: "CS308", courseId: "course-2", course: "B.Tech ECE", semester: 3, section: "A", facultyId: "FAC107", facultyName: faculty[6].name, assignedDate: "2026-08-25", dueDate: "2026-09-05", totalMarks: 50, status: "active", submissions: 18, totalStudents: 38 },
  { id: "asgn-8", title: "Technical Report Writing", description: "Write a technical report on recent advances in 5G technology.", subject: "English Communication", subjectCode: "HS301", courseId: "course-1", course: "B.Tech CSE", semester: 5, section: "B", facultyId: "FAC108", facultyName: faculty[7].name, assignedDate: "2026-08-12", dueDate: "2026-08-22", totalMarks: 25, status: "closed", submissions: 39, totalStudents: 40 },
];

// ============================================================
// Fees
// ============================================================
export const feeStructures: FeeStructure[] = [
  {
    id: "fs-1", name: "B.Tech - Tuition Fee", course: "B.Tech CSE", semester: 5, academicYear: "2026-27",
    components: [
      { name: "Tuition Fee", amount: 85000, description: "Semester tuition fee" },
      { name: "Exam Fee", amount: 2500, description: "University examination fee" },
      { name: "Lab Fee", amount: 5000, description: "Laboratory charges" },
      { name: "Library Fee", amount: 1500, description: "Library membership" },
      { name: "Sports Fee", amount: 1000, description: "Sports facilities" },
      { name: "Development Fee", amount: 10000, description: "Infrastructure development" },
      { name: "Caution Deposit", amount: 5000, description: "Refundable deposit" },
    ],
    totalAmount: 110000, dueDate: "2026-09-15",
  },
  {
    id: "fs-2", name: "B.Tech - Hostel Fee", course: "B.Tech (All)", semester: 5, academicYear: "2026-27",
    components: [
      { name: "Room Rent", amount: 45000, description: "Hostel room rent per semester" },
      { name: "Mess Fee", amount: 30000, description: "Mess charges per semester" },
      { name: "Maintenance", amount: 5000, description: "Hostel maintenance" },
    ],
    totalAmount: 80000, dueDate: "2026-09-15",
  },
  {
    id: "fs-3", name: "M.Tech - Tuition Fee", course: "M.Tech CSE", semester: 1, academicYear: "2026-27",
    components: [
      { name: "Tuition Fee", amount: 120000, description: "Semester tuition fee" },
      { name: "Exam Fee", amount: 3000, description: "University examination fee" },
      { name: "Lab Fee", amount: 8000, description: "Laboratory charges" },
    ],
    totalAmount: 131000, dueDate: "2026-09-15",
  },
];

export const studentFees: StudentFee[] = students.slice(0, 50).map((s, i) => {
  const totalAmount = s.course.includes("M.Tech") ? 131000 : 110000;
  const paidRatio = s.feeStatus === "paid" ? 1 : s.feeStatus === "partial" ? randomBetween(30, 70) / 100 : s.feeStatus === "scholarship" ? 1 : 0;
  return {
    id: `sf-${i}`,
    studentId: s.id,
    studentName: s.name,
    rollNumber: s.rollNumber,
    course: s.course,
    semester: s.semester,
    totalAmount,
    paidAmount: Math.round(totalAmount * paidRatio),
    pendingAmount: Math.round(totalAmount * (1 - paidRatio)),
    status: s.feeStatus,
    dueDate: "2026-09-15",
    lastPaymentDate: paidRatio > 0 ? `2026-08-${String(randomBetween(1, 28)).padStart(2, "0")}` : undefined,
  };
});

export const payments: Payment[] = students.slice(0, 30).map((s, i) => ({
  id: `pay-${i + 1}`,
  studentId: s.id,
  studentName: s.name,
  amount: s.feeStatus === "paid" ? 110000 : randomBetween(20000, 80000),
  mode: pickRandom(["online", "upi", "bank_transfer", "cheque", "cash"] as const),
  reference: `REF${String(20260001 + i)}`,
  date: `2026-08-${String(randomBetween(1, 28)).padStart(2, "0")}`,
  status: "completed",
  receiptNumber: `RCP${String(10001 + i)}`,
  description: "Semester Fee Payment",
}));

// ============================================================
// Library
// ============================================================
export const books: Book[] = [
  { id: "book-1", title: "Introduction to Algorithms", author: "Thomas H. Cormen", isbn: "978-0262033848", publisher: "MIT Press", category: "Computer Science", edition: "4th", yearOfPublication: 2022, totalCopies: 8, availableCopies: 3, status: "available", shelf: "CS-01", rack: "A" },
  { id: "book-2", title: "Database System Concepts", author: "Abraham Silberschatz", isbn: "978-0078022159", publisher: "McGraw-Hill", category: "Computer Science", edition: "7th", yearOfPublication: 2019, totalCopies: 6, availableCopies: 2, status: "available", shelf: "CS-02", rack: "B" },
  { id: "book-3", title: "Operating System Concepts", author: "Abraham Silberschatz", isbn: "978-1119800361", publisher: "Wiley", category: "Computer Science", edition: "10th", yearOfPublication: 2018, totalCopies: 5, availableCopies: 1, status: "available", shelf: "CS-02", rack: "A" },
  { id: "book-4", title: "Computer Networks", author: "Andrew S. Tanenbaum", isbn: "978-0132126953", publisher: "Pearson", category: "Computer Science", edition: "5th", yearOfPublication: 2021, totalCopies: 7, availableCopies: 4, status: "available", shelf: "CS-03", rack: "C" },
  { id: "book-5", title: "Engineering Mathematics", author: "B.S. Grewal", isbn: "978-8193328040", publisher: "Khanna Publishers", category: "Mathematics", edition: "44th", yearOfPublication: 2019, totalCopies: 15, availableCopies: 8, status: "available", shelf: "MATH-01", rack: "A" },
  { id: "book-6", title: "Machine Learning", author: "Tom Mitchell", isbn: "978-0070428072", publisher: "McGraw-Hill", category: "Computer Science", edition: "1st", yearOfPublication: 1997, totalCopies: 4, availableCopies: 0, status: "issued", shelf: "CS-04", rack: "A" },
  { id: "book-7", title: "Fundamentals of Physics", author: "David Halliday", isbn: "978-1118230718", publisher: "Wiley", category: "Physics", edition: "10th", yearOfPublication: 2013, totalCopies: 10, availableCopies: 6, status: "available", shelf: "PHY-01", rack: "B" },
  { id: "book-8", title: "Organic Chemistry", author: "Morrison & Boyd", isbn: "978-8193246337", publisher: "Pearson", category: "Chemistry", edition: "7th", yearOfPublication: 2016, totalCopies: 8, availableCopies: 5, status: "available", shelf: "CHEM-01", rack: "A" },
  { id: "book-9", title: "Strength of Materials", author: "R.K. Bansal", isbn: "978-8193246337", publisher: "Laxmi Publications", category: "Mechanical Engineering", edition: "6th", yearOfPublication: 2017, totalCopies: 6, availableCopies: 3, status: "available", shelf: "ME-01", rack: "B" },
  { id: "book-10", title: "Artificial Intelligence", author: "Stuart Russell", isbn: "978-0136042594", publisher: "Pearson", category: "Computer Science", edition: "3rd", yearOfPublication: 2021, totalCopies: 5, availableCopies: 2, status: "available", shelf: "CS-04", rack: "B" },
  { id: "book-11", title: "Digital Electronics", author: "Morris Mano", isbn: "978-0132774208", publisher: "Pearson", category: "Electronics", edition: "5th", yearOfPublication: 2017, totalCopies: 7, availableCopies: 4, status: "available", shelf: "ECE-01", rack: "A" },
  { id: "book-12", title: "Environmental Science", author: "Erach Bharucha", isbn: "978-8173814389", publisher: "Sundar Publishers", category: "Environmental Science", edition: "2nd", yearOfPublication: 2015, totalCopies: 20, availableCopies: 14, status: "available", shelf: "ENV-01", rack: "A" },
];

export const bookIssues: BookIssue[] = students.slice(0, 15).map((s, i) => ({
  id: `bi-${i + 1}`,
  bookId: books[i % books.length].id,
  bookTitle: books[i % books.length].title,
  studentId: s.id,
  studentName: s.name,
  issueDate: `2026-08-${String(randomBetween(1, 20)).padStart(2, "0")}`,
  dueDate: `2026-09-${String(randomBetween(1, 20)).padStart(2, "0")}`,
  returnDate: i < 5 ? `2026-08-${String(randomBetween(21, 28)).padStart(2, "0")}` : undefined,
  status: i < 5 ? "returned" : i < 8 ? "overdue" : "issued",
  fine: i >= 5 && i < 8 ? randomBetween(10, 50) : 0,
}));

// ============================================================
// Hostel
// ============================================================
export const hostels: Hostel[] = [
  { id: "hostel-1", name: "Vivekananda Hall", type: "boys", totalRooms: 120, occupiedRooms: 98, warden: "Dr. R. Murugan", contact: "044-22345681" },
  { id: "hostel-2", name: "Sarojini Hall", type: "girls", totalRooms: 100, occupiedRooms: 85, warden: "Dr. S. Padma", contact: "044-22345682" },
  { id: "hostel-3", name: "Tagore Hall", type: "boys", totalRooms: 80, occupiedRooms: 62, warden: "Prof. K. Senthil", contact: "044-22345683" },
  { id: "hostel-4", name: "Lakshmi Hall", type: "girls", totalRooms: 60, occupiedRooms: 55, warden: "Dr. N. Jayashree", contact: "044-22345684" },
];

export const hostelRooms: HostelRoom[] = [];
hostels.forEach(h => {
  for (let floor = 1; floor <= 4; floor++) {
    for (let room = 1; room <= 10; room++) {
      const capacity = randomBetween(1, 4);
      const occupied = randomBetween(0, capacity);
      hostelRooms.push({
        id: `hr-${h.id}-${floor}-${room}`,
        hostelId: h.id,
        roomNumber: `${floor}${String(room).padStart(2, "0")}`,
        floor,
        building: h.name,
        type: capacity === 1 ? "single" : capacity === 2 ? "double" : capacity === 3 ? "triple" : "quad",
        capacity,
        occupied,
        status: occupied === 0 ? "available" : occupied === capacity ? "occupied" : "available",
        students: [],
        amenities: ["WiFi", "Study Table", "Wardrobe", capacity > 1 ? "Shared Bathroom" : "Attached Bathroom"],
      });
    }
  }
});

// ============================================================
// Transport
// ============================================================
export const transportRoutes: TransportRoute[] = [
  { id: "route-1", name: "Chennai Central Route", routeNumber: "R-001", busNumber: "TN-01-AB-1234", driver: "R. Murugan", driverPhone: "+91 98765 43210", capacity: 50, enrolled: 42, departureTime: "07:30", returnTime: "16:30", status: "active", fare: 15000, stops: [
    { id: "stop-1", name: "Chennai Central Station", time: "07:30", sequence: 1 },
    { id: "stop-2", name: "T Nagar", time: "07:50", sequence: 2 },
    { id: "stop-3", name: "Adyar", time: "08:10", sequence: 3 },
    { id: "stop-4", name: "Velachery", time: "08:25", sequence: 4 },
    { id: "stop-5", name: "College Campus", time: "08:45", sequence: 5 },
  ]},
  { id: "route-2", name: "Mambalam Route", routeNumber: "R-002", busNumber: "TN-01-CD-5678", driver: "S. Rajan", driverPhone: "+91 98765 43211", capacity: 45, enrolled: 38, departureTime: "07:45", returnTime: "16:45", status: "active", fare: 14000, stops: [
    { id: "stop-6", name: "Mambalam", time: "07:45", sequence: 1 },
    { id: "stop-7", name: "Kodambakkam", time: "08:00", sequence: 2 },
    { id: "stop-8", name: "Nungambakkam", time: "08:15", sequence: 3 },
    { id: "stop-9", name: "College Campus", time: "08:40", sequence: 4 },
  ]},
  { id: "route-3", name: "Porur Route", routeNumber: "R-003", busNumber: "TN-01-EF-9012", driver: "M. Kannan", driverPhone: "+91 98765 43212", capacity: 40, enrolled: 35, departureTime: "07:00", returnTime: "16:00", status: "active", fare: 12000, stops: [
    { id: "stop-10", name: "Porur Junction", time: "07:00", sequence: 1 },
    { id: "stop-11", name: "Valasaravakkam", time: "07:20", sequence: 2 },
    { id: "stop-12", name: "Ambattur", time: "07:45", sequence: 3 },
    { id: "stop-13", name: "College Campus", time: "08:30", sequence: 4 },
  ]},
  { id: "route-4", name: "Tambaram Route", routeNumber: "R-004", busNumber: "TN-01-GH-3456", driver: "P. Kumar", driverPhone: "+91 98765 43213", capacity: 45, enrolled: 40, departureTime: "06:45", returnTime: "16:15", status: "active", fare: 13000, stops: [
    { id: "stop-14", name: "Tambaram", time: "06:45", sequence: 1 },
    { id: "stop-15", name: "Chromepet", time: "07:05", sequence: 2 },
    { id: "stop-16", name: "Pallavaram", time: "07:25", sequence: 3 },
    { id: "stop-17", name: "Meenambakkam", time: "07:45", sequence: 4 },
    { id: "stop-18", name: "College Campus", time: "08:15", sequence: 5 },
  ]},
];

// ============================================================
// Events
// ============================================================
export const events: CollegeEvent[] = [
  { id: "ev-1", title: "Annual Day Celebration", description: "Annual day celebration with cultural performances, prize distribution, and chief guest address.", startDate: "2026-09-15", endDate: "2026-09-15", type: "cultural", venue: "Main Auditorium", organizer: "Cultural Committee", targetAudience: ["Everyone"], status: "upcoming", registrationRequired: false },
  { id: "ev-2", title: "Tech Fest - Innovision 2026", description: "Annual technical festival with hackathons, paper presentations, project exhibitions, and workshops.", startDate: "2026-10-05", endDate: "2026-10-07", type: "workshop", venue: "College Campus", organizer: "CSE Department", department: "Computer Science & Engineering", targetAudience: ["Students"], status: "upcoming", registrationRequired: true, maxParticipants: 500, registered: 234 },
  { id: "ev-3", title: "Independence Day Celebration", description: "Flag hoisting ceremony followed by cultural programs.", startDate: "2026-08-15", endDate: "2026-08-15", type: "cultural", venue: "College Ground", organizer: "Admin", targetAudience: ["Everyone"], status: "completed", registrationRequired: false },
  { id: "ev-4", title: "Workshop on AI & Deep Learning", description: "Three-day hands-on workshop on Artificial Intelligence and Deep Learning with TensorFlow.", startDate: "2026-09-20", endDate: "2026-09-22", type: "workshop", venue: "Seminar Hall", organizer: "CSE Department", department: "Computer Science & Engineering", targetAudience: ["Students", "Faculty"], status: "upcoming", registrationRequired: true, maxParticipants: 60, registered: 48 },
  { id: "ev-5", title: "Sports Day - Inter-Department", description: "Annual inter-department sports competition.", startDate: "2026-11-10", endDate: "2026-11-11", type: "sports", venue: "Sports Complex", organizer: "Sports Committee", targetAudience: ["Students"], status: "upcoming", registrationRequired: true, maxParticipants: 300, registered: 180 },
  { id: "ev-6", title: "Seminar on Sustainable Engineering", description: "Guest lecture and seminar on sustainable engineering practices.", startDate: "2026-09-01", endDate: "2026-09-01", type: "seminar", venue: "Seminar Hall B", organizer: "CE Department", department: "Civil Engineering", targetAudience: ["Students", "Faculty"], status: "upcoming", registrationRequired: false },
  { id: "ev-7", title: "Diwali Holidays", description: "College closed for Diwali celebrations.", startDate: "2026-10-20", endDate: "2026-10-23", type: "holiday", venue: "College Campus", organizer: "Admin", targetAudience: ["Everyone"], status: "upcoming", registrationRequired: false },
  { id: "ev-8", title: "Faculty Development Program", description: "One-week FDP on Outcome-Based Education and Curriculum Design.", startDate: "2026-12-05", endDate: "2026-12-10", type: "workshop", venue: "Conference Hall", organizer: "IQAC", targetAudience: ["Faculty"], status: "upcoming", registrationRequired: true, maxParticipants: 40, registered: 25 },
];

// ============================================================
// Notices
// ============================================================
export const notices: Notice[] = [
  { id: "not-1", title: "Semester Fee Payment Deadline Extended", content: "The deadline for semester fee payment has been extended to September 20, 2026. Students are requested to pay their fees before the deadline to avoid late fees.", category: "fee", priority: "high", publishedDate: "2026-08-28", expiryDate: "2026-09-20", author: "Accounts Department", targetAudience: ["Students"], isRead: false },
  { id: "not-2", title: "Mid-Semester Examination Schedule", content: "The mid-semester examinations for Odd Semester 2026-27 will commence from October 1, 2026. Students should check the detailed schedule on the exam portal.", category: "exam", priority: "high", publishedDate: "2026-08-25", author: "Exam Controller", targetAudience: ["Students", "Faculty"], isRead: false },
  { id: "not-3", title: "Library Timings Updated", content: "Library will remain open until 9:00 PM during the examination period (Oct 1 - Dec 25). Weekend timings: 9:00 AM - 5:00 PM.", category: "general", priority: "medium", publishedDate: "2026-08-22", author: "Library", targetAudience: ["Students", "Faculty"], isRead: true },
  { id: "not-4", title: "Campus Recruitment Drive", content: "TCS and Infosys will be conducting campus recruitment for final year B.Tech students. Interested students should register through the placement portal.", category: "general", priority: "high", publishedDate: "2026-08-20", author: "Placement Cell", targetAudience: ["Students"], isRead: true },
  { id: "not-5", title: "Holiday Notice - Independence Day", content: "College will remain closed on August 15, 2026 on account of Independence Day. Regular classes will resume on August 16, 2026.", category: "general", priority: "medium", publishedDate: "2026-08-14", author: "Admin", targetAudience: ["Everyone"], isRead: true },
  { id: "not-6", title: "Emergency Water Supply Disruption", content: "Due to maintenance work, water supply will be disrupted on August 30, 2026 from 10:00 AM to 4:00 PM. Please plan accordingly.", category: "emergency", priority: "urgent", publishedDate: "2026-08-29", author: "Admin", targetAudience: ["Everyone"], isRead: false },
  { id: "not-7", title: "Anti-Ragging Policy Reminder", content: "All students are reminded of the college's strict anti-ragging policy. Any incidents of ragging should be reported immediately to the Anti-Ragging Committee.", category: "admin", priority: "high", publishedDate: "2026-08-10", author: "Student Welfare", targetAudience: ["Students"], isRead: true },
  { id: "not-8", title: "Faculty Meeting - September", content: "Monthly faculty meeting scheduled for September 5, 2026 at 3:00 PM in the Conference Hall. All HODs and faculty members are requested to attend.", category: "academic", priority: "medium", publishedDate: "2026-08-28", author: "Principal's Office", targetAudience: ["Faculty"], isRead: false },
];

// ============================================================
// Messages
// ============================================================
export const messages: Message[] = [
  { id: "msg-1", subject: "Assignment Deadline Extended", content: "Hi, I've extended the deadline for the BST assignment by 3 days due to the holiday. Please submit by August 28.", from: "faculty-1", fromName: faculty[0].name, to: "student-1", toName: "Students - CSE 5A", date: "2026-08-25", read: true, starred: false, category: "academic" },
  { id: "msg-2", subject: "Fee Receipt - Semester 5", content: "Your fee receipt for Semester 5 has been generated. Please download from the finance portal.", from: "accounts", fromName: "Accounts Department", to: "student-1", toName: "Aarav Sharma", date: "2026-08-24", read: false, starred: false, category: "finance" },
  { id: "msg-3", subject: "Welcome to New Semester", content: "Dear students, welcome to the Odd Semester 2026-27. Please check the timetable and attend your classes from the first day.", from: "hod-1", fromName: "Dr. Rajesh Kumar", to: "students-cse", toName: "CSE Department Students", date: "2026-08-05", read: true, starred: true, category: "admin" },
  { id: "msg-4", subject: "Library Book Reminder", content: "You have an overdue book: 'Introduction to Algorithms'. Please return it immediately to avoid further fines.", from: "library", fromName: "Library System", to: "student-5", toName: "Vivaan Patel", date: "2026-08-20", read: false, starred: false, category: "general" },
  { id: "msg-5", subject: "Placement Registration", content: "Final year students are requested to register for the upcoming campus recruitment drive by September 1, 2026.", from: "placement", fromName: "Placement Cell", to: "students-final", toName: "Final Year Students", date: "2026-08-18", read: true, starred: false, category: "general" },
];

// ============================================================
// Documents
// ============================================================
export const documents: Document[] = students.slice(0, 20).map((s, i) => ({
  id: `doc-${i + 1}`,
  name: pickRandom(["Bonafide Certificate", "Transfer Certificate", "Character Certificate", "Migration Certificate", "ID Card", "Mark Sheet"]),
  type: pickRandom(["bonafide", "transfer_certificate", "character_certificate", "migration", "id_card", "marksheet"] as const),
  studentId: s.id,
  studentName: s.name,
  requestDate: `2026-08-${String(randomBetween(1, 28)).padStart(2, "0")}`,
  issueDate: i < 12 ? `2026-08-${String(randomBetween(15, 28)).padStart(2, "0")}` : undefined,
  status: i < 8 ? "verified" : i < 12 ? "pending" : i < 16 ? "pending" : "rejected",
  issuedBy: i < 8 ? "Registrar" : undefined,
}));

// ============================================================
// Notifications
// ============================================================
export const notifications: Notification[] = [
  { id: "notif-1", title: "Fee Payment Reminder", message: "Your semester fee payment is due by September 15, 2026.", type: "fee", date: "2026-08-28", read: false, actionUrl: "/fees" },
  { id: "notif-2", title: "Attendance Alert", message: "Your attendance has dropped below 75% in Operating Systems.", type: "attendance", date: "2026-08-27", read: false, actionUrl: "/attendance" },
  { id: "notif-3", title: "New Assignment", message: "Prof. Priya Sharma has assigned 'Database Design - ER Diagram'.", type: "assignment", date: "2026-08-26", read: false, actionUrl: "/assignments" },
  { id: "notif-4", title: "Exam Schedule Published", message: "Mid-Semester Examination schedule has been published.", type: "exam", date: "2026-08-25", read: true, actionUrl: "/exams" },
  { id: "notif-5", title: "Result Published", message: "Internal Assessment-1 results for CSE 5A have been published.", type: "result", date: "2026-08-20", read: true, actionUrl: "/results" },
  { id: "notif-6", title: "New Notice", message: "Campus Recruitment Drive by TCS and Infosys announced.", type: "notice", date: "2026-08-20", read: true, actionUrl: "/notices" },
  { id: "notif-7", title: "Admission Update", message: "Your admission application has been approved.", type: "admission", date: "2026-08-15", read: true, actionUrl: "/admissions" },
  { id: "notif-8", title: "Document Verified", message: "Your Bonafide Certificate request has been processed.", type: "document", date: "2026-08-12", read: true, actionUrl: "/documents" },
];

// ============================================================
// Dashboard Stats
// ============================================================
export const dashboardStats: DashboardStats = {
  totalStudents: 1240,
  newAdmissions: 186,
  faculty: 32,
  departments: 10,
  attendancePercentage: 82.5,
  pendingFees: 12450000,
  upcomingExams: 5,
  libraryBooks: 24500,
};

// ============================================================
// Chart Data
// ============================================================
export const enrollmentTrend = [
  { year: "2021", students: 850, admissions: 220 },
  { year: "2022", students: 980, admissions: 250 },
  { year: "2023", students: 1100, admissions: 280 },
  { year: "2024", students: 1180, admissions: 240 },
  { year: "2025", students: 1240, admissions: 186 },
];

export const attendanceTrend = [
  { month: "Aug", percentage: 85 },
  { month: "Sep", percentage: 82 },
  { month: "Oct", percentage: 88 },
  { month: "Nov", percentage: 79 },
  { month: "Dec", percentage: 84 },
  { month: "Jan", percentage: 86 },
  { month: "Feb", percentage: 83 },
  { month: "Mar", percentage: 87 },
  { month: "Apr", percentage: 81 },
  { month: "May", percentage: 85 },
  { month: "Jun", percentage: 80 },
  { month: "Jul", percentage: 83 },
];

export const feeCollectionTrend = [
  { month: "Jan", collected: 4500000, pending: 1200000 },
  { month: "Feb", collected: 3800000, pending: 1500000 },
  { month: "Mar", collected: 4200000, pending: 900000 },
  { month: "Apr", collected: 3500000, pending: 1800000 },
  { month: "May", collected: 5000000, pending: 800000 },
  { month: "Jun", collected: 4800000, pending: 1000000 },
  { month: "Jul", collected: 4100000, pending: 1400000 },
  { month: "Aug", collected: 3900000, pending: 1245000 },
];

export const departmentDistribution = [
  { name: "CSE", students: 240, color: "#6366f1" },
  { name: "ECE", students: 180, color: "#8b5cf6" },
  { name: "ME", students: 200, color: "#a855f7" },
  { name: "CE", students: 150, color: "#c084fc" },
  { name: "IT", students: 200, color: "#d946ef" },
  { name: "EE", students: 120, color: "#ec4899" },
  { name: "MBA", students: 60, color: "#f43f5e" },
  { name: "Others", students: 90, color: "#f97316" },
];

export const examPerformance = [
  { subject: "Data Structures", avg: 72, highest: 98, lowest: 32 },
  { subject: "Algorithms", avg: 68, highest: 95, lowest: 28 },
  { subject: "DBMS", avg: 75, highest: 99, lowest: 35 },
  { subject: "Operating Systems", avg: 70, highest: 96, lowest: 30 },
  { subject: "Computer Networks", avg: 73, highest: 97, lowest: 33 },
  { subject: "Web Technologies", avg: 78, highest: 100, lowest: 40 },
];

export const genderDistribution = [
  { name: "Male", value: 744, color: "#6366f1" },
  { name: "Female", value: 456, color: "#ec4899" },
  { name: "Other", value: 40, color: "#f97316" },
];

export const courseEnrollment = [
  { course: "B.Tech CSE", enrollment: 240 },
  { course: "B.Tech ECE", enrollment: 180 },
  { course: "B.Tech ME", enrollment: 200 },
  { course: "B.Tech CE", enrollment: 150 },
  { course: "B.Tech IT", enrollment: 200 },
  { course: "B.Tech EE", enrollment: 120 },
  { course: "M.Tech CSE", enrollment: 40 },
  { course: "M.Tech VLSI", enrollment: 30 },
  { course: "MBA", enrollment: 60 },
  { course: "MCA", enrollment: 50 },
];

// ============================================================
// Attendance data generation
// ============================================================
export const generateAttendanceRecords = (studentList: Student[]): AttendanceRecord[] => {
  const records: AttendanceRecord[] = [];
  studentList.slice(0, 30).forEach(student => {
    for (let day = 1; day <= 20; day++) {
      const date = `2026-08-${String(day).padStart(2, "0")}`;
      const dayOfWeek = new Date(date).getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;
      records.push({
        id: `att-${student.id}-${day}`,
        studentId: student.id,
        studentName: student.name,
        date,
        subject: pickRandom(subjects.slice(0, 5)),
        status: pickRandom(["present", "present", "present", "present", "absent", "late", "present", "excused"] as const),
        timeIn: `09:${String(randomBetween(0, 30)).padStart(2, "0")}`,
        markedBy: pickRandom(faculty.slice(0, 5).map(f => f.name)),
      });
    }
  });
  return records;
};

export const attendanceRecords = generateAttendanceRecords(students);

export const attendanceSummary: AttendanceSummary[] = students.slice(0, 30).map(s => ({
  studentId: s.id,
  studentName: s.name,
  totalDays: 140,
  present: randomBetween(100, 135),
  absent: randomBetween(0, 20),
  late: randomBetween(0, 10),
  excused: randomBetween(0, 5),
  percentage: s.attendance,
}));

// ============================================================
// Assignment submissions
// ============================================================
export const assignmentSubmissions: AssignmentSubmission[] = assignments.flatMap(asgn =>
  students.slice(0, asgn.totalStudents).map((s, i) => ({
    id: `sub-${asgn.id}-${s.id}`,
    assignmentId: asgn.id,
    studentId: s.id,
    studentName: s.name,
    rollNumber: s.rollNumber,
    submittedDate: i < asgn.submissions ? `2026-08-${String(randomBetween(10, 25)).padStart(2, "0")}` : "",
    status: i < asgn.submissions - 2 ? "graded" as const : i < asgn.submissions ? "submitted" as const : i < asgn.totalStudents - 1 ? "not_submitted" as const : "late" as const,
    marks: i < asgn.submissions - 2 ? randomBetween(Math.floor(asgn.totalMarks * 0.4), asgn.totalMarks) : undefined,
    grade: i < asgn.submissions - 2 ? (pickRandom(["A+", "A", "A-", "B+", "B", "C+", "C"] as const)) : undefined,
    feedback: i < asgn.submissions - 5 ? pickRandom(["Good work!", "Needs improvement in analysis.", "Excellent implementation.", "Well structured code.", "Missing edge cases."]) : undefined,
  }))
);
