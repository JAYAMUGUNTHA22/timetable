const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

require('./models/Department');
require('./models/Subject');

async function listAllSubjects() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const tt = await mongoose.model('Timetable').findOne().populate('department').sort({ updatedAt: -1 });
    if (!tt) return;
    
    const subjects = await mongoose.model('Subject').find({ department: tt.department._id, semester: tt.semester });
    console.log(`Subjects for ${tt.department.name} Sem ${tt.semester}: ${subjects.length}`);
    let totalPeriods = 0;
    subjects.forEach(s => {
        console.log(` - ${s.name}: ${s.periodsPerWeek} per week (${s.courseType})`);
        totalPeriods += s.periodsPerWeek;
    });
    console.log(`Total Periods Required per Week: ${totalPeriods}`);
    
    await mongoose.connection.close();
  } catch (err) { console.error(err); }
}

listAllSubjects();
