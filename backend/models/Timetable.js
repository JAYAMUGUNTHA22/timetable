const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  sectionNumber: { type: Number, required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  subjectName: String,
  faculty: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty' },
  facultyName: String,
  facultyId: String,
  roomNumber: String
}, { _id: false });

const slotSchema = new mongoose.Schema({
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  subjectName: String,
  type: String,
  assignments: [assignmentSchema]
}, { _id: false });

const timetableSchema = new mongoose.Schema({
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  semester: {
    type: Number,
    required: true
  },
  sectionsCount: {
    type: Number,
    default: 1
  },
  workingDays: [String],
  periodsPerDay: Number,
  slots: [[slotSchema]],
  generationErrors: [String],
  generatedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

timetableSchema.index({ department: 1, semester: 1 }, { unique: true });

module.exports = mongoose.model('Timetable', timetableSchema);
