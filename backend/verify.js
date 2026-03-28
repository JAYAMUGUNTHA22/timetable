require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const { generateTimetablesForSemester } = require('./services/timetableGenerator');

async function run() {
    try {
        await connectDB();
        console.log('Generating timetables...');
        const res = await generateTimetablesForSemester(1, { replaceExisting: true });

        console.log(`Generated ${res.timetables.length} timetables, Skipped: ${res.skipped}`);
        if (res.errors.length) console.log('Errors:', res.errors);
        if (res.skippedDepartments.length) console.log('Skipped Depts:', res.skippedDepartments);

        if (res.timetables.length > 0) {
            console.log('Sample Timetable slots [0][0]:');
            console.log(JSON.stringify(res.timetables[0].slots[0][0], null, 2));
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
run();
