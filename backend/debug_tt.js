const mongoose = require('mongoose');
const path = require('path');
// Point to root .env
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Timetable = require('./models/Timetable');
const Department = require('./models/Department');

async function checkErrors() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI not found in root .env');
    
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const timetables = await Timetable.find()
      .populate('department', 'name')
      .sort({ updatedAt: -1 })
      .limit(3);
    
    if (timetables.length === 0) {
      console.log('No timetables found.');
    } else {
      for (const tt of timetables) {
        console.log(`\nTimetable for ${tt.department?.name || 'Unknown'} (Sem ${tt.semester}):`);
        console.log(`Generated At: ${tt.generatedAt}`);
        console.log('Errors/Warnings:');
        if (tt.generationErrors && tt.generationErrors.length > 0) {
          tt.generationErrors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
        } else {
          console.log('  None');
        }
        
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
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkErrors();
