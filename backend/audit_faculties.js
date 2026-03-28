const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

require('./models/Department');
require('./models/Faculty');
require('./models/Subject');
require('./models/SubjectFacultyRoom');

async function auditFaculties() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const faculties = await mongoose.model('Faculty').find();
    
    console.log('--- Faculty Load Audit ---');
    for (const f of faculties) {
        // Count total periods assigned to this faculty across ALL subjects
        // Check Subject.assignedFaculty
        const subjectsAsPrimary = await mongoose.model('Subject').find({ assignedFaculty: f._id });
        let totalPeriods = 0;
        subjectsAsPrimary.forEach(s => totalPeriods += s.periodsPerWeek);
        
        // Check SubjectFacultyRoom mappings
        const mappings = await mongoose.model('SubjectFacultyRoom').find({ faculty: f._id }).populate('subject');
        // We need to avoid double counting if a faculty is both primary and in mapping
        // But usually mapping overrides primary.
        
        console.log(`${f.name} (${f.facultyId}): Max ${f.maxPeriodsPerWeek} week. Assigned (Primary): ${totalPeriods}`);
        if (mappings.length > 0) {
            console.log(`  Mapped in ${mappings.length} Subject/Room allocations:`);
            mappings.forEach(m => {
                if (m.subject) console.log(`    - ${m.subject.name} (Sem ${m.subject.semester}, ${m.subject.periodsPerWeek} per week)`);
            });
        }
    }
    await mongoose.connection.close();
  } catch (err) { console.error(err); }
}

auditFaculties();
