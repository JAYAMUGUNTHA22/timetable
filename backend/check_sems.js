const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

require('./models/Timetable');

async function checkSemesters() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const results = await mongoose.model('Timetable').aggregate([
      { $group: { _id: "$semester", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    console.log('Timetables in DB by Semester:');
    results.forEach(r => console.log(` Semester ${r._id}: ${r.count} departments`));
    await mongoose.connection.close();
  } catch (err) { console.error(err); }
}

checkSemesters();
