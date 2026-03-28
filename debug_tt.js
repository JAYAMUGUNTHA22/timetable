const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load env from the backend directory
dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

const Timetable = require('./backend/models/Timetable');

async function checkErrors() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const timetables = await Timetable.find().sort({ updatedAt: -1 }).limit(5).populate('department', 'name');
    
    if (timetables.length === 0) {
      console.log('No timetables found.');
    } else {
      for (const tt of timetables) {
        console.log(`\nTimetable for ${tt.department?.name} (Sem ${tt.semester}):`);
        console.log(`Generated At: ${tt.generatedAt}`);
        console.log('Errors/Warnings:');
        if (tt.generationErrors && tt.generationErrors.length > 0) {
          tt.generationErrors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
        } else {
          console.log('  None');
        }
        
        // Count empty slots
        let empty = 0;
        let total = 0;
        if (tt.slots) {
            tt.slots.forEach(day => {
                day.forEach(slot => {
                    total++;
                    if (!slot || !slot.subject) empty++;
                });
            });
        }
        console.log(`Stats: ${empty} empty slots out of ${total} total slots.`);
      }
    }

    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkErrors();
