require('dotenv').config();
const { admin, db } = require('./config/firebase');
const xlsx = require('xlsx');
const path = require('path');

const auth = admin.auth();

async function importData() {
  console.log("Starting data import...");
  
  // 1. Create Teacher
  const teacherEmail = "k.vidhyavati@cmrit.ac.in";
  const teacherPassword = "12345678";
  let teacherId;
  
  try {
    const teacherUser = await auth.createUser({
      email: teacherEmail,
      password: teacherPassword,
      displayName: "Prof. Vidhyavati",
    });
    teacherId = teacherUser.uid;
    console.log("Created teacher Auth:", teacherEmail);
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      const user = await auth.getUserByEmail(teacherEmail);
      teacherId = user.uid;
      await auth.updateUser(teacherId, { password: teacherPassword });
      console.log("Teacher already exists, updated password.");
    } else {
      console.error("Error creating teacher:", err);
      return;
    }
  }

  // Update teacher in Firestore
  await db.collection('teachers').doc(teacherId).set({
    email: teacherEmail,
    name: "Prof. Vidhyavati",
    role: "teacher",
    department: "UG-AIDS & UG-CSDS"
  }, { merge: true });

  await db.collection('users').doc(teacherId).set({
    email: teacherEmail,
    role: "teacher",
    createdAt: new Date()
  }, { merge: true });

  // 2. Read Excel
  const filePath = path.resolve(__dirname, '../../TYL UG Batch 2023-27.xlsx');
  const workbook = xlsx.readFile(filePath);
  
  const sheetsToImport = ['UG-AIDS'];
  let totalStudents = 0;

  for (const sheetName of sheetsToImport) {
    if (!workbook.SheetNames.includes(sheetName)) continue;
    
    const sheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    // Process ALL students in UG-AIDS
    const studentsData = rawData.slice(2); 

    console.log(`Found ${studentsData.length} students in ${sheetName}. Starting import...`);

    for (let i = 0; i < studentsData.length; i++) {
      const row = studentsData[i];
      if (!row || row.length < 5) continue;
      
      const email = String(row[1] || '').trim();
      const name = String(row[2] || '').trim();
      const usn = String(row[3] || '').trim();
      const section = String(row[6] || 'Unassigned').trim(); // Extract Section
      
      if (!email || !email.includes('@')) continue;

      const studentPassword = "12345678";
      let studentId;

      try {
        const studentUser = await auth.createUser({
          email: email,
          password: studentPassword,
          displayName: name,
        });
        studentId = studentUser.uid;
      } catch (err) {
        if (err.code === 'auth/email-already-exists') {
          const user = await auth.getUserByEmail(email);
          studentId = user.uid;
          await auth.updateUser(studentId, { password: studentPassword });
        } else {
          console.error(`Error creating auth for ${email}:`, err.message);
          continue;
        }
      }

      // Add to Firestore and link to teacher
      await db.collection('students').doc(studentId).set({
        email: email,
        name: name,
        usn: usn,
        branch: sheetName,
        section: section, // Separated by classrooms
        role: "student",
        assignedTeacher: teacherId, 
        subjects: ['Data Structures', 'Python Programming', 'Aptitude'] 
      }, { merge: true });

      await db.collection('users').doc(studentId).set({
        email: email,
        role: "student",
        section: section,
        createdAt: new Date()
      }, { merge: true });

      totalStudents++;
      
      // Log progress every 50 students
      if (totalStudents % 50 === 0) {
        console.log(`Progress: Imported ${totalStudents} students so far...`);
      }
    }
  }

  console.log(`\nImport Complete! Created/Updated Teacher and ${totalStudents} Students.`);
  process.exit(0);
}

importData();
