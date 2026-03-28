const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Department = require('./models/Department');
const Faculty = require('./models/Faculty');
const Subject = require('./models/Subject');
const SubjectFacultyRoom = require('./models/SubjectFacultyRoom');
const Timetable = require('./models/Timetable');
const AcademicConfig = require('./models/AcademicConfig');

async function checkEverything() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const config = await AcademicConfig.findOne().sort({ updatedAt: -1 });
    console.log('--- Academic Config ---');
    console.log(`Working Days: ${config.workingDays.join(', ')}`);
    console.log(`Periods Per Day: ${config.periodsPerDay}`);
    console.log(`Break Period Indices: ${config.breakPeriodIndices.join(', ')}`);
    const slotsPerDay = config.periodsPerDay - config.breakPeriodIndices.length;
    console.log(`Available Slots Per Day: ${slotsPerDay}`);
    console.log(`Total Available Slots per Week: ${slotsPerDay * config.workingDays.length}`);

    const tt = await Timetable.findOne().populate('department').sort({ updatedAt: -1 });
    if (tt) {
        console.log(`\n--- Latest Timetable: ${tt.department.name} ---`);
        const subjects = await Subject.find({ department: tt.department._id, semester: tt.semester });
        let totalReq = 0;
        subjects.forEach(s => totalReq += s.periodsPerWeek);
        console.log(`Subjects: ${subjects.length}, Total Periods Required: ${totalReq}`);
        
        if (totalReq > (slotsPerDay * config.workingDays.length)) {
            console.log('CRITICAL: Required periods exceed available slots!');
        }
    }

    await mongoose.connection.close();
  } catch (err) { console.error(err); }
}

checkEverything();
