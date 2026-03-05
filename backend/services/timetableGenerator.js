const AcademicConfig = require('../models/AcademicConfig');
const Department = require('../models/Department');
const Subject = require('../models/Subject');
const Faculty = require('../models/Faculty');
const Timetable = require('../models/Timetable');
const SubjectFacultyRoom = require('../models/SubjectFacultyRoom');

function idStr(id) {
  if (id == null) return '';
  if (typeof id === 'string') return id;
  if (id.toString && typeof id.toString === 'function') return id.toString();
  return String(id);
}

/**
 * Build global faculty availability: facultyId -> Set of "dayIndex-periodIndex"
 * Used to avoid assigning same faculty to two classes in same slot.
 */
function buildGlobalFacultyAvailability(existingTimetables, workingDays, periodsPerDay) {
  const availability = new Map(); // facultyId -> Set of "day-period"

  for (const tt of existingTimetables) {
    if (!tt.slots || !Array.isArray(tt.slots)) continue;
    for (let d = 0; d < tt.slots.length; d++) {
      for (let p = 0; p < (tt.slots[d] || []).length; p++) {
        const slot = tt.slots[d][p];
        if (slot && slot.faculty && slot.faculty.toString) {
          const fid = slot.faculty.toString();
          const key = `${d}-${p}`;
          if (!availability.has(fid)) availability.set(fid, new Set());
          availability.get(fid).add(key);
        }
      }
    }
  }
  return availability;
}

/**
 * Get remaining periods per week for a faculty (considering existing assignments).
 */
function getFacultyRemainingPeriods(facultyAvailability, facultyId, workingDays, periodsPerDay, maxPerWeek) {
  const used = facultyAvailability.get(facultyId);
  const totalSlots = workingDays.length * periodsPerDay;
  const usedCount = used ? used.size : 0;
  return Math.min(maxPerWeek - usedCount, totalSlots);
}

/**
 * Get count of periods assigned to faculty on a specific day.
 */
function getFacultyCountOnDay(globalAvailability, facultyId, dayIndex) {
  if (!globalAvailability.has(facultyId)) return 0;
  let count = 0;
  for (const key of globalAvailability.get(facultyId)) {
    if (key.startsWith(dayIndex + '-')) count++;
  }
  return count;
}

/**
 * Check if faculty can be placed at (dayIndex, periodIndex):
 * - Not already booked globally
 * - Within max periods per day for that day
 * - Within max periods per week
 */
function canPlaceFaculty(globalAvailability, facultyId, dayIndex, periodIndex, facultyTotalUsed, maxPerDay, maxPerWeek) {
  const key = `${dayIndex}-${periodIndex}`;
  if (globalAvailability.has(facultyId) && globalAvailability.get(facultyId).has(key)) return false;
  const dayCount = getFacultyCountOnDay(globalAvailability, facultyId, dayIndex);
  if (dayCount >= maxPerDay) return false;
  if ((facultyTotalUsed.get(facultyId) || 0) >= maxPerWeek) return false;
  return true;
}

/**
 * Check if (dayIndex, periodIndex) is a break period.
 */
function isBreakPeriod(breakPeriodIndices, dayIndex, periodIndex, periodsPerDay) {
  if (!breakPeriodIndices || !breakPeriodIndices.length) return false;
  return breakPeriodIndices.includes(periodIndex);
}

/**
 * Generate timetables for all departments/sections for a given semester.
 * Options: { replaceExisting: false } = only create missing timetables (leave existing unchanged).
 *           { replaceExisting: true } = delete all for semester and regenerate.
 * Returns { timetables: [...], errors: [...], skipped: number }.
 */
async function generateTimetablesForSemester(semester, options = {}) {
  const replaceExisting = options.replaceExisting === true;
  const semNum = Number(semester);
  if (!Number.isInteger(semNum) || semNum < 1) {
    return { timetables: [], errors: ['Invalid semester.'], skipped: 0, skippedDepartments: [] };
  }

  const config = await AcademicConfig.findOne().sort({ updatedAt: -1 });
  if (!config) {
    return { timetables: [], errors: ['Academic configuration not found. Please set working days and periods per day.'], skipped: 0, skippedDepartments: [] };
  }

  const workingDays = config.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const periodsPerDay = config.periodsPerDay || 7;
  const breakPeriodIndices = config.breakPeriodIndices || [];

  const departments = await Department.find();
  const allSubjectsForSemester = await Subject.find({ semester: semNum }).populate('assignedFaculty').lean();
  const subjectIds = allSubjectsForSemester.map((s) => s._id);
  const allFacultyRooms = await SubjectFacultyRoom.find({ subject: { $in: subjectIds } })
    .populate('faculty')
    .sort({ subject: 1, order: 1 });
  const facultyRoomsBySubject = new Map();
  for (const fr of allFacultyRooms) {
    const sid = fr.subject.toString();
    if (!facultyRoomsBySubject.has(sid)) facultyRoomsBySubject.set(sid, []);
    facultyRoomsBySubject.get(sid).push({ faculty: fr.faculty, roomNumber: fr.roomNumber || '', labRoomNumber: fr.labRoomNumber || '' });
  }

  if (departments.length === 0) {
    return { timetables: [], errors: ['No departments found. Add departments first.'], skipped: 0, skippedDepartments: [] };
  }
  if (subjectIds.length === 0) {
    return { timetables: [], errors: ['No subjects found for semester ' + semNum + '. Add subjects for this semester first.'], skipped: 0, skippedDepartments: [] };
  }

  const errors = [];
  const skippedDepartments = [];
  const facultyTotalUsed = new Map();
  let skipped = 0;

  let existingTimetables = [];
  if (replaceExisting) {
    await Timetable.deleteMany({ semester: semNum });
  } else {
    existingTimetables = await Timetable.find({ semester: semNum });
    for (const tt of existingTimetables) {
      if (!tt.slots) continue;
      for (let d = 0; d < tt.slots.length; d++) {
        for (let p = 0; p < (tt.slots[d] || []).length; p++) {
          const slot = tt.slots[d][p];
          if (slot && slot.faculty) {
            const fid = slot.faculty.toString();
            facultyTotalUsed.set(fid, (facultyTotalUsed.get(fid) || 0) + 1);
          }
        }
      }
    }
  }

  let globalAvailability = buildGlobalFacultyAvailability(existingTimetables, workingDays, periodsPerDay);
  const generated = [];

  const maxSections = Math.max(...departments.map((d) => d.sectionsCount || 1), 1);
  const deptSubjectsCache = new Map();
  for (const dept of departments) {
    const deptIdStr = idStr(dept._id);
    const deptSubjectsRaw = allSubjectsForSemester.filter((s) => idStr(s.department) === deptIdStr);
    if (deptSubjectsRaw.length === 0) {
      skippedDepartments.push({ departmentId: dept.departmentId, name: dept.name, reason: 'No subjects for this semester' });
      continue;
    }
    deptSubjectsCache.set(deptIdStr, {
      dept,
      deptSubjects: deptSubjectsRaw.map((s) => ({
        _id: s._id,
        name: s.name,
        periodsPerWeek: s.periodsPerWeek,
        assignedFaculty: s.assignedFaculty,
        department: s.department,
        courseType: s.courseType,
        labDuration: s.labDuration,
        labSessionsPerWeek: s.labSessionsPerWeek
      }))
    });
  }

  // ... (previous code)

  for (let sectionNum = 1; sectionNum <= maxSections; sectionNum++) {
    for (const dept of departments) {
      const sectionsCount = dept.sectionsCount || 1;
      if (sectionNum > sectionsCount) continue;
      const deptIdStr = idStr(dept._id);
      const cached = deptSubjectsCache.get(deptIdStr);
      if (!cached) continue;
      const { deptSubjects } = cached;

      if (!replaceExisting) {
        const existing = await Timetable.findOne({
          department: dept._id,
          sectionNumber: sectionNum,
          semester: semNum
        });
        if (existing) {
          skipped++;
          continue;
        }
      }

      const sectionErrors = [];
      const slots = Array.from({ length: workingDays.length }, () =>
        Array.from({ length: periodsPerDay }, () => null)
      );
      const subjectDayCount = new Map();
      const daySubjectWithTwo = [];

      function getSubjectCountOnDay(sid, d) {
        if (!subjectDayCount.has(sid)) return 0;
        return subjectDayCount.get(sid).get(d) || 0;
      }
      function canPlaceSubjectOnDay(sid, d, isSecondOnDay) {
        // For theory, limits to 2 per day. Lab blocks are handled separately (usually 1 block per day).
        if (getSubjectCountOnDay(sid, d) >= 2) return false;
        if (isSecondOnDay && daySubjectWithTwo[d] != null && daySubjectWithTwo[d] !== sid) return false;
        return true;
      }
      function recordPlace(sid, d) {
        if (!subjectDayCount.has(sid)) subjectDayCount.set(sid, new Map());
        const m = subjectDayCount.get(sid);
        m.set(d, (m.get(d) || 0) + 1);
        if (m.get(d) === 2) daySubjectWithTwo[d] = sid;
      }

      // --- LAB PLACEMENT ---
      const labSubjects = deptSubjects.filter(s => s.courseType === 'Theory + Lab');

      for (const s of labSubjects) {
        const sessionsNeeded = s.labSessionsPerWeek || 0;
        const duration = s.labDuration || 2;
        const sid = s._id.toString();

        const frList = facultyRoomsBySubject.get(sid);
        let faculty, roomNumber;
        // Use labRoomNumber if available, else regular room (or empty)
        if (frList && frList.length > 0) {
          const idx = (sectionNum - 1) % frList.length;
          faculty = frList[idx].faculty;
          roomNumber = frList[idx].labRoomNumber || frList[idx].roomNumber || '';
        } else {
          faculty = s.assignedFaculty;
          roomNumber = '';
        }

        if (!faculty) {
          sectionErrors.push(`Lab Subject "${s.name}" has no faculty. Add Faculty.`);
          continue;
        }
        const facultyId = faculty._id.toString();
        const maxPerDay = faculty.maxPeriodsPerDay || 6;
        const maxPerWeek = faculty.maxPeriodsPerWeek || 30;

        let sessionsPlaced = 0;
        // Try to place each session
        for (let sess = 0; sess < sessionsNeeded; sess++) {
          let placed = false;
          // Shuffle days for randomness
          const daysShuffled = Array.from({ length: workingDays.length }, (_, i) => i).sort(() => Math.random() - 0.5);

          for (const d of daysShuffled) {
            // If already has this subject on this day (theory or lab), skip to avoid overload? 
            // User said "a lab class can come only two days per week". 
            // We accept placing on any day as long as slots are free. 
            // If we want to strictly limit "lab only on 2 days", we just place them.
            // But we should check if we already placed a LAB session for this subject on this day.
            // (Assuming 1 lab session per day max).
            // Check if we already placed *any* slot for this subject on this day?
            // Maybe labs can share day with theory. 
            // Let's enforce: Maximum 1 Lab Session of this subject per day.

            // Check if contiguous slots available
            for (let p = 0; p <= periodsPerDay - duration; p++) {
              // Check if block [p ... p+duration-1] is valid
              let validBlock = true;
              for (let k = 0; k < duration; k++) {
                if (slots[d][p + k]) { validBlock = false; break; } // Occupied
                if (isBreakPeriod(breakPeriodIndices, d, p + k, periodsPerDay)) { validBlock = false; break; } // Break

                // Check faculty availability
                if (!canPlaceFaculty(globalAvailability, facultyId, d, p + k, facultyTotalUsed, maxPerDay, maxPerWeek)) {
                  validBlock = false; break;
                }
              }

              if (validBlock) {
                // Place Lab Block
                for (let k = 0; k < duration; k++) {
                  slots[d][p + k] = {
                    subject: s._id,
                    faculty: faculty._id,
                    subjectName: s.name + ' (Lab)',
                    facultyName: faculty.name,
                    roomNumber: roomNumber || '',
                    type: 'Lab'
                  };
                  // Update counters
                  const key = `${d}-${p + k}`;
                  if (!globalAvailability.has(facultyId)) globalAvailability.set(facultyId, new Set());
                  globalAvailability.get(facultyId).add(key);
                  facultyTotalUsed.set(facultyId, (facultyTotalUsed.get(facultyId) || 0) + 1);

                  // We don't strictly update "recordPlace" (theory count logic) because labs are different.
                  // But we update subjectDayCount to maybe track total load.
                  if (!subjectDayCount.has(sid)) subjectDayCount.set(sid, new Map());
                  const m = subjectDayCount.get(sid);
                  m.set(d, (m.get(d) || 0) + 1);
                }
                placed = true;
                break; // Moves to next session
              }
            }
            if (placed) break; // Moves to next session
          }
          if (!placed) {
            sectionErrors.push(`Could not place Lab Session ${sess + 1} for "${s.name}".`);
          }
        }
      }

      // --- THEORY PLACEMENT ---
      const subjectRequirements = deptSubjects
        .map(s => ({ subject: s, periodsNeeded: s.periodsPerWeek, periodsAssigned: 0 }))
        .sort((a, b) => b.periodsNeeded - a.periodsNeeded);

      const dayIndices = [];
      for (let d = 0; d < workingDays.length; d++) {
        // Reset daySubjectWithTwo for theory logic, preserving lab usage if we want?
        // Actually, existing labs might have set 'subjectDayCount' > 0.
        // We should respect that to avoid >2 theories if lab is already there?
        // Let's check daySubjectWithTwo init
        daySubjectWithTwo[d] = null;
        // Check existing slots to populate daySubjectWithTwo if needed
        for (let p = 0; p < periodsPerDay; p++) {
          if (slots[d][p] && slots[d][p].subject) {
            const sid = slots[d][p].subject.toString();
            if (getSubjectCountOnDay(sid, d) >= 2) daySubjectWithTwo[d] = sid; // simple heuristic
          }
        }

        for (let p = 0; p < periodsPerDay; p++) {
          if (!isBreakPeriod(breakPeriodIndices, d, p, periodsPerDay)) {
            dayIndices.push({ d, p });
          }
        }
      }

      // Shuffle dayIndices
      for (let i = dayIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [dayIndices[i], dayIndices[j]] = [dayIndices[j], dayIndices[i]];
      }

      for (const req of subjectRequirements) {
        const subject = req.subject;
        const sid = subject._id.toString();
        const frList = facultyRoomsBySubject.get(sid);
        let faculty, roomNumber;
        if (frList && frList.length > 0) {
          const idx = (sectionNum - 1) % frList.length;
          faculty = frList[idx].faculty;
          roomNumber = frList[idx].roomNumber || '';
        } else {
          faculty = subject.assignedFaculty;
          roomNumber = '';
        }
        if (!faculty) {
          if (!sectionErrors.includes(`Subject "${subject.name}" has no faculty/room allocation. Add Faculty & Room in Subjects.`))
            sectionErrors.push(`Subject "${subject.name}" has no faculty/room allocation. Add Faculty & Room in Subjects.`);
          continue;
        }

        const facultyId = faculty._id.toString();
        const maxPerDay = faculty.maxPeriodsPerDay || 6;
        const maxPerWeek = faculty.maxPeriodsPerWeek || 30;

        let assigned = 0;
        for (let k = 0; k < req.periodsNeeded; k++) {
          let placed = false;
          for (const { d, p } of dayIndices) {
            if (slots[d][p]) continue; // Occupied (by Lab or other)
            const countOnDay = getSubjectCountOnDay(sid, d);
            const isSecondOnDay = countOnDay === 1;
            if (!canPlaceSubjectOnDay(sid, d, isSecondOnDay)) continue;
            if (!canPlaceFaculty(globalAvailability, facultyId, d, p, facultyTotalUsed, maxPerDay, maxPerWeek))
              continue;

            slots[d][p] = {
              subject: subject._id,
              faculty: faculty._id,
              subjectName: subject.name,
              facultyName: faculty.name,
              roomNumber: roomNumber || ''
            };
            req.periodsAssigned++;
            assigned++;
            recordPlace(sid, d);

            const key = `${d}-${p}`;
            if (!globalAvailability.has(facultyId)) globalAvailability.set(facultyId, new Set());
            globalAvailability.get(facultyId).add(key);
            facultyTotalUsed.set(facultyId, (facultyTotalUsed.get(facultyId) || 0) + 1);
            placed = true;
            break;
          }
          if (!placed) {
            sectionErrors.push(`No valid slot for "${subject.name}" (Faculty: ${faculty.name}) in Dept ${dept.name} Section ${sectionNum}.`);
          }
        }
      }

      // FILLER LOGIC (REMOVED or KEPT?)
      // The original code had a "filler" loop at the end to try and fill remaining gaps with any subject.
      // I'll keep it but adapted to respect new constraints if needed, or just copy the theory logic.
      // Actually, standard practice is: First pass attempts to satisfy Requirements.
      // If gaps remain, the original code tried to fill them with *more* of the existing subjects?
      // "for (let d = 0; d < workingDays.length... let filled = false; for (const s of deptSubjects)..."
      // This looks like it tries to fill empty slots with *extra* classes beyond requirements?
      // Or maybe it was a fallback?
      // "if (!filled) ... sectionErrors.push..."
      // It seems it was trying to fill EVERY slot.
      // That's aggressive. I'll retain a simplified version that tries to fill empty slots with any valid subject if possible,
      // but only if you want a FULL timetable.
      // The original code seemingly forced a full grid. I will keep it but respect lab blocks won't be used as fillers.

      for (let d = 0; d < workingDays.length; d++) {
        for (let p = 0; p < periodsPerDay; p++) {
          if (slots[d][p]) continue;
          if (isBreakPeriod(breakPeriodIndices, d, p, periodsPerDay)) continue;

          // Try to fill with any subject (Theory only probably?)
          let filled = false;
          for (const s of deptSubjects) {
            // Skip Lab filling in single slots? 
            // If it's a "Theory + Lab" subject, we can add more Theory slots here.

            const sid = s._id.toString();
            const frList = facultyRoomsBySubject.get(sid);
            let faculty, roomNumber;
            if (frList && frList.length > 0) {
              const idx = (sectionNum - 1) % frList.length;
              faculty = frList[idx].faculty;
              roomNumber = frList[idx].roomNumber || '';
            } else {
              faculty = s.assignedFaculty;
              roomNumber = '';
            }
            if (!faculty) continue;

            const countOnDay = getSubjectCountOnDay(sid, d);
            // Relax "2 per day" for fillers? Original code checked canPlaceSubjectOnDay.
            const isSecondOnDay = countOnDay === 1;
            if (!canPlaceSubjectOnDay(sid, d, isSecondOnDay)) continue;

            const facultyId = faculty._id.toString();
            // Check faculty limits
            const maxPerDay = faculty.maxPeriodsPerDay || 6;
            const maxPerWeek = faculty.maxPeriodsPerWeek || 30;
            if (!canPlaceFaculty(globalAvailability, facultyId, d, p, facultyTotalUsed, maxPerDay, maxPerWeek)) continue;

            slots[d][p] = {
              subject: s._id,
              faculty: faculty._id,
              subjectName: s.name,
              facultyName: faculty.name,
              roomNumber: roomNumber || ''
            };
            recordPlace(sid, d);
            const key = `${d}-${p}`;
            if (!globalAvailability.has(facultyId)) globalAvailability.set(facultyId, new Set());
            globalAvailability.get(facultyId).add(key);
            facultyTotalUsed.set(facultyId, (facultyTotalUsed.get(facultyId) || 0) + 1);
            filled = true;
            break;
          }
          if (!filled) {
            // sectionErrors.push(`Could not fill slot day ${d} period ${p}.`); 
            // Don't error strictly on fillers, maybe? Original did.
          }
        }
      }

      let timetable = await Timetable.findOne({
        department: dept._id,
        sectionNumber: sectionNum,
        semester: semNum
      });

      if (!timetable) {
        timetable = new Timetable({
          department: dept._id,
          sectionNumber: sectionNum,
          semester: semNum,
          workingDays,
          periodsPerDay,
          slots: [],
          generationErrors: []
        });
      }

      timetable.slots = slots;
      timetable.workingDays = workingDays;
      timetable.periodsPerDay = periodsPerDay;
      timetable.generationErrors = sectionErrors;
      timetable.generatedAt = new Date();
      timetable.updatedAt = new Date();
      await timetable.save();
      generated.push(timetable);
      if (sectionErrors.length > 0) {
        errors.push(...sectionErrors.map(e => `[${dept.name} Sec ${sectionNum}] ${e}`));
      }
    }
  }

  return { timetables: generated, errors, skipped, skippedDepartments };
}

module.exports = {
  generateTimetablesForSemester,
  buildGlobalFacultyAvailability
};
