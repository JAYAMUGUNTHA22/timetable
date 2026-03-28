const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Ensure all models are registered
require('./models/Department');
require('./models/Faculty');
require('./models/Subject');
require('./models/SubjectFacultyRoom');
require('./models/AcademicConfig');
const Timetable = require('./models/Timetable');
const Subject = mongoose.model('Subject');
const Faculty = mongoose.model('Faculty');
const AcademicConfig = mongoose.model('AcademicConfig');

async function debugSubject(sid) {
    const s = await Subject.findById(sid).populate('assignedFaculty');
    if (!s) return;
    console.log(`\n--- Subject Audit: ${s.name} ---`);
    console.log(`Semester: ${s.semester}, Dept: ${s.department}`);
    console.log(`Periods/Week: ${s.periodsPerWeek}, CourseType: ${s.courseType}`);
    if (s.assignedFaculty) {
        console.log(`Primary Faculty: ${s.assignedFaculty.name} (Max: ${s.assignedFaculty.maxPeriodsPerDay} day, ${s.assignedFaculty.maxPeriodsPerWeek} week)`);
    } else {
        console.log(`NO PRIMARY FACULTY ASSIGNED ON SUBJECT`);
    }
}

async function analyzeLatest() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const tt = await Timetable.findOne().populate('department').sort({ updatedAt: -1 });
    if (!tt) return console.log('No TT');

    console.log(`\nDEPT: ${tt.department.name}, SEM: ${tt.semester}`);
    console.log('ERRORS:');
    tt.generationErrors.forEach(e => console.log(' - ' + e));

    const config = await AcademicConfig.findOne().sort({ updatedAt: -1 });
    console.log(`\nConfig: Days: ${config.workingDays.length}, Periods: ${config.periodsPerDay}`);
    console.log(`Total available slots: ${config.workingDays.length * config.periodsPerDay}`);

    const counts = new Map();
    tt.slots.flat().forEach(slot => {
        if (slot && slot.subjectName) {
            counts.set(slot.subjectName, (counts.get(slot.subjectName) || 0) + 1);
        }
    });

    console.log('\nSubject usage in slots:');
    for (let [name, count] of counts) {
        console.log(`  ${name}: ${count}`);
    }

    const subjects = await Subject.find({ semester: tt.semester, department: tt.department._id });
    for (const s of subjects) {
        const hasLab = counts.has(`${s.name} (Lab)`);
        const hasTheory = counts.has(s.name);
        if (!hasTheory && !hasLab) {
            console.log(`\nMISSING SUBJECT: ${s.name}`);
            await debugSubject(s._id);
        }
    }

    await mongoose.connection.close();
  } catch (err) { console.error(err); }
}

analyzeLatest();
