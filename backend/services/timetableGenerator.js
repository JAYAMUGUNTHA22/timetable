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

function buildGlobalFacultyAvailability(existingTimetables, workingDays, periodsPerDay) {
  const availability = new Map();

  for (const tt of existingTimetables) {
    if (!tt.slots || !Array.isArray(tt.slots)) continue;
    for (let d = 0; d < tt.slots.length; d++) {
      for (let p = 0; p < (tt.slots[d] || []).length; p++) {
        const slot = tt.slots[d][p];
        if (slot && slot.assignments) {
          for (const a of slot.assignments) {
            if (a.faculty && a.faculty.toString) {
              const fid = a.faculty.toString();
              const key = `${d}-${p}`;
              if (!availability.has(fid)) availability.set(fid, new Set());
              availability.get(fid).add(key);
            }
          }
        }
      }
    }
  }
  return availability;
}

function getFacultyRemainingPeriods(facultyAvailability, facultyId, workingDays, periodsPerDay, maxPerWeek) {
  const used = facultyAvailability.get(facultyId);
  const totalSlots = workingDays.length * periodsPerDay;
  const usedCount = used ? used.size : 0;
  return Math.min(maxPerWeek - usedCount, totalSlots);
}

function getFacultyCountOnDay(globalAvailability, facultyId, dayIndex) {
  if (!globalAvailability.has(facultyId)) return 0;
  let count = 0;
  for (const key of globalAvailability.get(facultyId)) {
    if (key.startsWith(dayIndex + '-')) count++;
  }
  return count;
}

function canPlaceFaculty(globalAvailability, facultyId, dayIndex, periodIndex, facultyTotalUsed, maxPerDay, maxPerWeek) {
  const key = `${dayIndex}-${periodIndex}`;
  if (globalAvailability.has(facultyId) && globalAvailability.get(facultyId).has(key)) return false;
  const dayCount = getFacultyCountOnDay(globalAvailability, facultyId, dayIndex);
  if (dayCount >= maxPerDay) return false;
  if ((facultyTotalUsed.get(facultyId) || 0) >= maxPerWeek) return false;
  return true;
}

function isBreakPeriod(breakPeriodIndices, dayIndex, periodIndex, periodsPerDay) {
  if (!breakPeriodIndices || !breakPeriodIndices.length) return false;
  return breakPeriodIndices.includes(periodIndex);
}

function dedupeFacultyRoomEntries(frList = []) {
  const seen = new Set();
  const out = [];
  for (const fr of frList) {
    if (!fr || !fr.faculty) continue;
    const fid = fr.faculty._id ? fr.faculty._id.toString() : fr.faculty.toString();
    if (seen.has(fid)) continue;
    seen.add(fid);
    out.push(fr);
  }
  return out;
}

function buildUniqueFacultyPoolFromAssignments(assignments = []) {
  const seen = new Set();
  const pool = [];
  for (const a of assignments) {
    if (!a || !a.faculty) continue;
    const fid = a.faculty._id ? a.faculty._id.toString() : a.faculty.toString();
    if (seen.has(fid)) continue;
    seen.add(fid);
    pool.push({
      faculty: a.faculty,
      facultyName: a.facultyName || '',
      roomNumber: a.roomNumber || ''
    });
  }
  return pool;
}

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
          if (slot && slot.assignments) {
            const uniqueInSlot = new Set();
            for (const a of slot.assignments) {
              if (a.faculty) {
                uniqueInSlot.add(a.faculty.toString());
              }
            }
            for (const fid of uniqueInSlot) {
              facultyTotalUsed.set(fid, (facultyTotalUsed.get(fid) || 0) + 1);
            }
          }
        }
      }
    }
  }

  let globalAvailability = buildGlobalFacultyAvailability(existingTimetables, workingDays, periodsPerDay);
  const generated = [];

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

  for (const dept of departments) {
    const sectionsCount = dept.sectionsCount || 1;
    const deptIdStr = idStr(dept._id);
    const cached = deptSubjectsCache.get(deptIdStr);
    if (!cached) continue;
    const { deptSubjects } = cached;

    // If replaceExisting is OFF, we will seed scheduling from the existing timetable
    // (so a "Monday-only" timetable can be expanded).
    let existingForDept = null;
    if (!replaceExisting) {
      existingForDept = await Timetable.findOne({
        department: dept._id,
        semester: semNum
      }).lean();
    }

    const sectionErrors = [];
    const slots = Array.from({ length: workingDays.length }, () =>
      Array.from({ length: periodsPerDay }, () => null)
    );

    if (!replaceExisting && existingForDept && Array.isArray(existingForDept.slots)) {
      // Only copy existing when replaceExisting is OFF (preserve/expand mode)
      for (let d = 0; d < Math.min(workingDays.length, existingForDept.slots.length); d++) {
        const srcDay = existingForDept.slots[d] || [];
        for (let p = 0; p < Math.min(periodsPerDay, srcDay.length); p++) {
          const cell = srcDay[p];
          if (cell) slots[d][p] = cell;
        }
      }
    }

    // Monday template mode:
    // If Monday has any slots and replaceExisting is OFF, treat Monday as master template
    // and generate all other working days from it with shuffled periods.
    // This intentionally bypasses constraint-based scheduling for this flow.
    const mondayIndex = workingDays.indexOf('Monday');
    if (!replaceExisting && mondayIndex >= 0 && Array.isArray(slots) && slots[mondayIndex]) {
      let mondayHasAny = false;

      for (let d = 0; d < workingDays.length; d++) {
        for (let p = 0; p < periodsPerDay; p++) {
          if (isBreakPeriod(breakPeriodIndices, d, p, periodsPerDay)) continue;
          const cell = slots[d] && slots[d][p];
          if (!cell) continue;
          if (d === mondayIndex) mondayHasAny = true;
        }
      }

      if (mondayHasAny) {
        // Use Monday as a template, but shuffle period positions for every other day.
        // Each slot cell already contains per-section assignments (faculty/room), so copying the
        // cell preserves your "same subject, different faculty per section" requirement.
        const mondayDay = slots[mondayIndex] || [];
        const nonBreakPeriodIndices = [];
        const mondayCells = [];

        for (let p = 0; p < periodsPerDay; p++) {
          if (isBreakPeriod(breakPeriodIndices, mondayIndex, p, periodsPerDay)) continue;
          nonBreakPeriodIndices.push(p);
          mondayCells.push(mondayDay[p] ? JSON.parse(JSON.stringify(mondayDay[p])) : null);
        }

        const shuffle = (arr) => {
          // Fisher–Yates shuffle
          for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
          }
          return arr;
        };

        for (let d = 0; d < workingDays.length; d++) {
          if (d === mondayIndex) continue;

          const shuffledCells = shuffle([...mondayCells]);
          for (let i = 0; i < nonBreakPeriodIndices.length; i++) {
            const destP = nonBreakPeriodIndices[i];
            const srcCell = shuffledCells[i];
            slots[d][destP] = srcCell ? JSON.parse(JSON.stringify(srcCell)) : null;
          }
        }

        // Save expanded timetable and skip auto-scheduling.
        let timetable = await Timetable.findOne({
          department: dept._id,
          semester: semNum
        });

        if (!timetable) {
          timetable = new Timetable({
            department: dept._id,
            semester: semNum,
            sectionsCount: sectionsCount,
            workingDays,
            periodsPerDay,
            slots: [],
            generationErrors: []
          });
        }

        timetable.slots = slots;
        timetable.sectionsCount = sectionsCount;
        timetable.workingDays = workingDays;
        timetable.periodsPerDay = periodsPerDay;
        timetable.generationErrors = sectionErrors;
        timetable.generatedAt = new Date();
        timetable.updatedAt = new Date();
        await timetable.save();
        generated.push(timetable);
        continue;
      }
    }

    // Uniform multi-section mode - ONE subject per slot, four different faculty (one per section):
    // - Each cell: exactly ONE subject + FOUR different faculty (one per section)
    // - Only subjects with >= sectionsCount faculty are used
    // - Subjects rotate evenly across the week
    const nonBreakPeriodsPerDay = periodsPerDay - (breakPeriodIndices ? breakPeriodIndices.length : 0);
    const eligibleSubjects = [...deptSubjects]
      .filter((s) => {
        const sid = s._id.toString();
        const unique = dedupeFacultyRoomEntries(facultyRoomsBySubject.get(sid) || []);
        return unique.length >= 1;
      })
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    let subjectBase = eligibleSubjects;
    if (subjectBase.length < nonBreakPeriodsPerDay) {
      for (const s of deptSubjects) {
        if (subjectBase.find((x) => x._id.toString() === s._id.toString())) continue;
        const sid = s._id.toString();
        const unique = dedupeFacultyRoomEntries(facultyRoomsBySubject.get(sid) || []);
        if (unique.length >= 1) subjectBase = [...subjectBase, s];
        if (subjectBase.length >= nonBreakPeriodsPerDay) break;
      }
    }
    // Same subject name can appear in multiple rows; schedule by unique name.
    if (subjectBase.length > 0) {
      const seenSubjectNames = new Set();
      subjectBase = subjectBase.filter((s) => {
        const key = String(s.name || '').trim().toLowerCase();
        if (!key || seenSubjectNames.has(key)) return false;
        seenSubjectNames.add(key);
        return true;
      });
    }
    if (subjectBase.length === 0 && deptSubjects.length > 0) {
      errors.push(`[${dept.name}] No subjects have faculty mapping. Add faculty in Subjects -> Faculty & Room.`);
    }
    const canUseUniformSectionMode =
      sectionsCount >= 1 &&
      nonBreakPeriodsPerDay > 0 &&
      subjectBase.length > 0;

    if (canUseUniformSectionMode) {
      const sectionErrors = [];
      const slots = Array.from({ length: workingDays.length }, () =>
        Array.from({ length: periodsPerDay }, () => null)
      );

      const subjectUsageCount = new Map();
      for (const s of subjectBase) subjectUsageCount.set(s._id.toString(), 0);
      // Keep daily subject spread balanced.
      const maxSameSubjectPerDay = Math.max(
        1,
        Math.ceil(nonBreakPeriodsPerDay / Math.max(1, subjectBase.length))
      );

      const shuffle = (arr) => {
        const out = [...arr];
        for (let i = out.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [out[i], out[j]] = [out[j], out[i]];
        }
        return out;
      };

      const getNormalizedName = (s) => String(s?.name || '').trim().toLowerCase();
      const desiredRowsPerSlot = Math.max(sectionsCount || 1, 4);
      const buildEffectivePool = (subject, forLab = false) => {
        const normalizedName = getNormalizedName(subject);
        const sameNameSubjects = deptSubjects.filter(
          (s) => getNormalizedName(s) === normalizedName
        );
        const seenFaculty = new Set();
        const effectivePool = [];
        for (const s of sameNameSubjects) {
          const sId = s._id.toString();
          const uniqueFr = dedupeFacultyRoomEntries(facultyRoomsBySubject.get(sId) || []);
          for (const fr of uniqueFr) {
            const fid = fr.faculty && (fr.faculty._id ? fr.faculty._id.toString() : fr.faculty.toString());
            if (!fid || seenFaculty.has(fid)) continue;
            seenFaculty.add(fid);
            effectivePool.push({
              faculty: fr.faculty,
              facultyName: fr.faculty.name || '',
              facultyId: fr.faculty.facultyId || '',
              roomNumber: (forLab ? (fr.labRoomNumber || fr.roomNumber || '') : (fr.roomNumber || ''))
            });
          }
        }
        // Keep classrooms in stable ascending order for each subject.
        effectivePool.sort((a, b) => String(a.roomNumber || '').localeCompare(String(b.roomNumber || ''), undefined, { numeric: true, sensitivity: 'base' }));
        return effectivePool;
      };

      // Lab-first placement:
      // - At most one lab block per day
      // - Consecutive periods only (for 7 periods: 1-2, 3-4, 5-6)
      // - No theory for the same subject on the same day
      const labSubjects = subjectBase.filter((s) => {
        const normalized = getNormalizedName(s);
        return deptSubjects.some((ds) => getNormalizedName(ds) === normalized && ds.courseType === 'Theory + Lab');
      });
      const labSessionsRemainingByName = new Map();
      const labSubjectByName = new Map();
      for (const s of labSubjects) {
        const normalized = getNormalizedName(s);
        if (!labSubjectByName.has(normalized)) labSubjectByName.set(normalized, s);
        const sessions = deptSubjects
          .filter((ds) => getNormalizedName(ds) === normalized && ds.courseType === 'Theory + Lab')
          .map((ds) => ds.labSessionsPerWeek || 1);
        const needed = Math.max(1, sessions.length ? Math.max(...sessions) : 1);
        if (!labSessionsRemainingByName.has(normalized)) {
          labSessionsRemainingByName.set(normalized, needed);
        }
      }
      const labSubjectNameByDay = new Map();
      const candidatePairs = [];
      if (periodsPerDay >= 7) {
        candidatePairs.push([0, 1], [2, 3], [4, 5]);
      } else {
        for (let p = 0; p < periodsPerDay - 1; p++) {
          candidatePairs.push([p, p + 1]);
        }
      }

      for (let d = 0; d < workingDays.length; d++) {
        const labCandidates = [...labSubjectByName.entries()]
          .filter(([name]) => (labSessionsRemainingByName.get(name) || 0) > 0)
          .sort((a, b) => (labSessionsRemainingByName.get(b[0]) || 0) - (labSessionsRemainingByName.get(a[0]) || 0));
        if (labCandidates.length === 0) continue;

        let placedLabToday = false;
        for (const [normalized, subject] of labCandidates) {
          if (placedLabToday) break;
          const effectivePool = buildEffectivePool(subject, true);
          if (effectivePool.length === 0) continue;
          const targetSections = Math.min(desiredRowsPerSlot, effectivePool.length);

          for (const [p1, p2] of candidatePairs) {
            if (isBreakPeriod(breakPeriodIndices, d, p1, periodsPerDay) || isBreakPeriod(breakPeriodIndices, d, p2, periodsPerDay)) continue;
            if (slots[d][p1] || slots[d][p2]) continue;

            const assignments = [];
            let conflict = false;
            for (let sec = 1; sec <= targetSections; sec++) {
              const fr = effectivePool[sec - 1];
              const faculty = fr.faculty;
              const fid = (faculty._id || faculty).toString();
              const key1 = `${d}-${p1}`;
              const key2 = `${d}-${p2}`;
              if ((globalAvailability.has(fid) && globalAvailability.get(fid).has(key1)) ||
                  (globalAvailability.has(fid) && globalAvailability.get(fid).has(key2))) {
                conflict = true;
                break;
              }
              assignments.push({
                sectionNumber: sec,
                subject: subject._id,
                subjectName: subject.name,
                faculty: faculty._id || faculty,
                facultyName: fr.facultyName || faculty.name || 'Unknown Faculty',
                facultyId: fr.facultyId || faculty.facultyId || '',
                roomNumber: fr.roomNumber || ''
              });
            }
            if (conflict || assignments.length === 0) continue;

            for (const a of assignments) {
              const fid = a.faculty && a.faculty.toString ? a.faculty.toString() : null;
              if (!fid) continue;
              if (!globalAvailability.has(fid)) globalAvailability.set(fid, new Set());
              globalAvailability.get(fid).add(`${d}-${p1}`);
              globalAvailability.get(fid).add(`${d}-${p2}`);
              facultyTotalUsed.set(fid, (facultyTotalUsed.get(fid) || 0) + 2);
            }

            slots[d][p1] = { subject: subject._id, subjectName: `${subject.name} (Lab)`, type: 'Lab', assignments };
            slots[d][p2] = { subject: subject._id, subjectName: `${subject.name} (Lab)`, type: 'Lab', assignments };
            labSubjectNameByDay.set(d, normalized);
            labSessionsRemainingByName.set(normalized, (labSessionsRemainingByName.get(normalized) || 0) - 1);
            subjectUsageCount.set(subject._id.toString(), (subjectUsageCount.get(subject._id.toString()) || 0) + 2);
            placedLabToday = true;
            break;
          }
        }
      }

      for (let d = 0; d < workingDays.length; d++) {
        const subjectsUsedToday = new Set();
        const subjectDayCount = new Map();
        const shuffledToday = shuffle(subjectBase);
        const dayRank = new Map(shuffledToday.map((s, idx) => [s._id.toString(), idx]));

        for (let p = 0; p < periodsPerDay; p++) {
          if (isBreakPeriod(breakPeriodIndices, d, p, periodsPerDay)) continue;
          if (slots[d][p]) continue; // already occupied by lab

          const key = `${d}-${p}`;
          let placed = false;

          const orderedSubjects = [...subjectBase].sort((a, b) => {
            const aId = a._id.toString();
            const bId = b._id.toString();
            const aUsedToday = subjectsUsedToday.has(aId) ? 1 : 0;
            const bUsedToday = subjectsUsedToday.has(bId) ? 1 : 0;
            if (aUsedToday !== bUsedToday) return aUsedToday - bUsedToday;
            const aDayCount = subjectDayCount.get(aId) || 0;
            const bDayCount = subjectDayCount.get(bId) || 0;
            if (aDayCount !== bDayCount) return aDayCount - bDayCount;
            const aCount = subjectUsageCount.get(aId) || 0;
            const bCount = subjectUsageCount.get(bId) || 0;
            if (aCount !== bCount) return aCount - bCount;
            const aRank = dayRank.get(aId) ?? 0;
            const bRank = dayRank.get(bId) ?? 0;
            if (aRank !== bRank) return aRank - bRank;
            return String(a.name || '').localeCompare(String(b.name || ''));
          });

          for (let tryIdx = 0; tryIdx < orderedSubjects.length && !placed; tryIdx++) {
            const subject = orderedSubjects[tryIdx];
            const sid = subject._id.toString();
            const usedTodayForSubject = subjectDayCount.get(sid) || 0;
            if (usedTodayForSubject >= maxSameSubjectPerDay) continue;

            const normalizedName = getNormalizedName(subject);
            if (labSubjectNameByDay.get(d) === normalizedName) continue;

            const effectivePool = buildEffectivePool(subject, false);

            if (effectivePool.length < 1) continue;

            const assignments = [];
            // Do not rotate faculty-room mapping across slots.
            const offset = 0;
            let conflict = false;

            const targetSections = Math.min(desiredRowsPerSlot, effectivePool.length);
            for (let sec = 1; sec <= targetSections; sec++) {
              const fr = effectivePool[(sec - 1 + offset) % effectivePool.length];
              const faculty = fr.faculty;
              const fid = (faculty._id || faculty).toString();
              if (globalAvailability.has(fid) && globalAvailability.get(fid).has(key)) {
                conflict = true;
                break;
              }
              assignments.push({
                sectionNumber: sec,
                subject: subject._id,
                subjectName: subject.name,
                faculty: faculty._id || faculty,
                facultyName: fr.facultyName || faculty.name || 'Unknown Faculty',
                facultyId: fr.facultyId || faculty.facultyId || '',
                roomNumber: fr.roomNumber || ''
              });
            }

            if (!conflict && assignments.length > 0) {
              for (const a of assignments) {
                const fid = (a.faculty && a.faculty.toString) ? a.faculty.toString() : null;
                if (fid) {
                  if (!globalAvailability.has(fid)) globalAvailability.set(fid, new Set());
                  globalAvailability.get(fid).add(key);
                  facultyTotalUsed.set(fid, (facultyTotalUsed.get(fid) || 0) + 1);
                }
              }
              slots[d][p] = { subject: subject._id, subjectName: subject.name, type: 'Theory', assignments };
              subjectsUsedToday.add(sid);
              subjectDayCount.set(sid, (subjectDayCount.get(sid) || 0) + 1);
              subjectUsageCount.set(sid, (subjectUsageCount.get(sid) || 0) + 1);
              placed = true;
            }
          }

          if (!placed) {
            sectionErrors.push(`Could not fill slot (${d},${p}) with one subject. Check faculty mapping/availability.`);
          }
        }
      }

      let timetable = await Timetable.findOne({
        department: dept._id,
        semester: semNum
      });
      if (!timetable) {
        timetable = new Timetable({
          department: dept._id,
          semester: semNum,
          sectionsCount,
          workingDays,
          periodsPerDay,
          slots: [],
          generationErrors: []
        });
      }

      timetable.slots = slots;
      timetable.sectionsCount = sectionsCount;
      timetable.workingDays = workingDays;
      timetable.periodsPerDay = periodsPerDay;
      timetable.generationErrors = sectionErrors;
      timetable.generatedAt = new Date();
      timetable.updatedAt = new Date();
      await timetable.save();
      generated.push(timetable);

      if (sectionErrors.length > 0) {
        errors.push(...sectionErrors.map((e) => `[${dept.name}] ${e}`));
      }
      continue;
    }
    const subjectDayCount = new Map();

    function getSubjectCountOnDay(sid, d) {
      if (!subjectDayCount.has(sid)) return 0;
      return subjectDayCount.get(sid).get(d) || 0;
    }
    function canPlaceSubjectOnDay(sid, d) {
      if (getSubjectCountOnDay(sid, d) >= 2) return false;
      return true;
    }
    function recordPlace(sid, d) {
      if (!subjectDayCount.has(sid)) subjectDayCount.set(sid, new Map());
      const m = subjectDayCount.get(sid);
      m.set(d, (m.get(d) || 0) + 1);
    }

    // Seed subject/day counters from any already-filled cells in `slots`
    // (e.g., Monday-only input that we want to expand).
    for (let d = 0; d < workingDays.length; d++) {
      for (let p = 0; p < periodsPerDay; p++) {
        const slot = slots[d][p];
        if (slot && slot.subject) {
          recordPlace(slot.subject.toString(), d);
        }
      }
    }

    function canPlaceSubjectForAllSections(subject, d, p, duration = 1, isLab = false) {
      const sid = subject._id.toString();
      const frList = facultyRoomsBySubject.get(sid);
      const uniqueFr = dedupeFacultyRoomEntries(frList || []);
      const poolSize = uniqueFr.length || (subject.assignedFaculty ? 1 : 0);

      if (sectionsCount > 1 && poolSize < sectionsCount) return false;

      const uniqueFaculties = new Set();
      const facultyData = new Map();

      for (let sec = 1; sec <= sectionsCount; sec++) {
        let faculty;
        if (frList && frList.length > 0) {
          const idx = (sec - 1) % uniqueFr.length;
          faculty = uniqueFr[idx].faculty;
        } else {
          faculty = subject.assignedFaculty;
        }
        if (!faculty) return false;

        const fid = faculty._id ? faculty._id.toString() : faculty.toString();
        if (!uniqueFaculties.has(fid)) {
          uniqueFaculties.add(fid);
          facultyData.set(fid, faculty);
        }
      }
      if (sectionsCount > 1 && uniqueFaculties.size < sectionsCount) return false;

      for (const fid of uniqueFaculties) {
        const faculty = facultyData.get(fid);
        const maxPerDay = faculty.maxPeriodsPerDay || 6;
        const maxPerWeek = faculty.maxPeriodsPerWeek || 30;

        // Check aggregate week limit
        if ((facultyTotalUsed.get(fid) || 0) + duration > maxPerWeek) return false;
        
        // Check aggregate day limit
        const dayCount = getFacultyCountOnDay(globalAvailability, fid, d);
        if (dayCount + duration > maxPerDay) return false;

        for (let k = 0; k < duration; k++) {
          const key = `${d}-${p + k}`;
          if (globalAvailability.has(fid) && globalAvailability.get(fid).has(key)) return false;
        }
      }
      return true;
    }

    function buildAssignments(subject, isLab = false) {
      const sid = subject._id.toString();
      const frList = facultyRoomsBySubject.get(sid);
      const uniqueFr = dedupeFacultyRoomEntries(frList || []);
      const assignments = [];

      for (let sec = 1; sec <= sectionsCount; sec++) {
        let faculty, roomNumber;
        if (uniqueFr.length > 0) {
          const idx = (sec - 1) % uniqueFr.length;
          faculty = uniqueFr[idx].faculty;
          roomNumber = isLab ? (uniqueFr[idx].labRoomNumber || uniqueFr[idx].roomNumber || '') : (uniqueFr[idx].roomNumber || '');
        } else {
          faculty = subject.assignedFaculty;
          roomNumber = '';
        }
        if (!faculty) break;
        assignments.push({
          sectionNumber: sec,
          subject: subject._id,
          subjectName: subject.name,
          faculty: faculty._id || faculty,
          facultyName: faculty.name || 'Unknown Faculty',
          facultyId: faculty.facultyId || '',
          roomNumber: roomNumber
        });
      }
      return assignments;
    }

    function recordFacultyUsage(assignments, d, p, duration = 1) {
      const uniqueFaculties = new Set();
      for (const a of assignments) {
        if (a.faculty) {
          uniqueFaculties.add(a.faculty.toString());
        }
      }

      for (const facultyId of uniqueFaculties) {
        for (let k = 0; k < duration; k++) {
          const key = `${d}-${p + k}`;
          if (!globalAvailability.has(facultyId)) {
            globalAvailability.set(facultyId, new Set());
          }
          globalAvailability.get(facultyId).add(key);
          facultyTotalUsed.set(facultyId, (facultyTotalUsed.get(facultyId) || 0) + 1);
        }
      }
    }

    // Lab Placement
    const labSubjects = deptSubjects.filter(s => s.courseType === 'Theory + Lab');
    const existingLabPeriodsBySid = new Map();
    for (let d = 0; d < workingDays.length; d++) {
      for (let p = 0; p < periodsPerDay; p++) {
        const slot = slots[d][p];
        if (slot && slot.subject && slot.type === 'Lab') {
          const sid = slot.subject.toString();
          existingLabPeriodsBySid.set(sid, (existingLabPeriodsBySid.get(sid) || 0) + 1);
        }
      }
    }

    for (const s of labSubjects) {
      const sessionsNeeded = s.labSessionsPerWeek || 0;
      const duration = s.labDuration || 2;
      const sid = s._id.toString();

      const frList = facultyRoomsBySubject.get(sid);
      if ((!frList || frList.length === 0) && !s.assignedFaculty) {
        sectionErrors.push(`Lab Subject "${s.name}" has no faculty. Add Faculty.`);
        continue;
      }

      const existingLabPeriods = existingLabPeriodsBySid.get(sid) || 0;
      const existingSessions = Math.floor(existingLabPeriods / duration);
      const sessionsToPlace = Math.max(0, sessionsNeeded - existingSessions);

      for (let sess = 0; sess < sessionsToPlace; sess++) {
        let placed = false;
        const daysShuffled = Array.from({ length: workingDays.length }, (_, i) => i).sort(() => Math.random() - 0.5);

        for (const d of daysShuffled) {
          for (let p = 0; p <= periodsPerDay - duration; p++) {
            let validBlock = true;
            for (let k = 0; k < duration; k++) {
              if (slots[d][p + k]) { validBlock = false; break; }
              if (isBreakPeriod(breakPeriodIndices, d, p + k, periodsPerDay)) { validBlock = false; break; }
            }
            if (!validBlock) continue;

            if (!canPlaceSubjectForAllSections(s, d, p, duration, true)) {
              continue;
            }

            const assignments = buildAssignments(s, true);

            for (let k = 0; k < duration; k++) {
              slots[d][p + k] = {
                subject: s._id,
                subjectName: s.name + ' (Lab)',
                type: 'Lab',
                assignments: assignments
              };
            }

            recordFacultyUsage(assignments, d, p, duration);
            if (!subjectDayCount.has(sid)) subjectDayCount.set(sid, new Map());
            const m = subjectDayCount.get(sid);
            m.set(d, (m.get(d) || 0) + 1);

            placed = true;
            break;
          }
          if (placed) break;
        }
        if (!placed) {
          sectionErrors.push(`Could not place Lab Session ${sess + 1} for "${s.name}". Faculties likely booked or day limits exceeded.`);
        }
      }
    }

    // Theory Placement
    const labAssignments = new Map(); // sid -> total periods
    for (let d = 0; d < workingDays.length; d++) {
      for (let p = 0; p < periodsPerDay; p++) {
        const slot = slots[d][p];
        if (slot && slot.subject && slot.type === 'Lab') {
          const sid = slot.subject.toString();
          labAssignments.set(sid, (labAssignments.get(sid) || 0) + 1);
        }
      }
    }

    const theoryPeriodsBySid = new Map();
    for (let d = 0; d < workingDays.length; d++) {
      for (let p = 0; p < periodsPerDay; p++) {
        const slot = slots[d][p];
        if (slot && slot.subject && slot.type === 'Theory') {
          const sid = slot.subject.toString();
          theoryPeriodsBySid.set(sid, (theoryPeriodsBySid.get(sid) || 0) + 1);
        }
      }
    }

    const subjectRequirements = deptSubjects
      .map(s => {
        const sid = s._id.toString();
        const labPeriods = labAssignments.get(sid) || 0;
        const totalTheoryNeeded = Math.max(0, s.periodsPerWeek - labPeriods);
        const existingTheoryPeriods = theoryPeriodsBySid.get(sid) || 0;
        const remainingTheoryNeeded = Math.max(0, totalTheoryNeeded - existingTheoryPeriods);
        return { subject: s, periodsNeeded: remainingTheoryNeeded, periodsAssigned: 0 };
      })
      .filter(req => req.periodsNeeded > 0)
      .sort((a, b) => b.periodsNeeded - a.periodsNeeded);

    const dayIndices = [];
    for (let d = 0; d < workingDays.length; d++) {
      for (let p = 0; p < periodsPerDay; p++) {
        if (!isBreakPeriod(breakPeriodIndices, d, p, periodsPerDay)) {
          dayIndices.push({ d, p });
        }
      }
    }

    for (let i = dayIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [dayIndices[i], dayIndices[j]] = [dayIndices[j], dayIndices[i]];
    }

    for (const req of subjectRequirements) {
      const subject = req.subject;
      const sid = subject._id.toString();

      let assigned = 0;
      for (let k = 0; k < req.periodsNeeded; k++) {
        let placed = false;
        for (const { d, p } of dayIndices) {
          if (slots[d][p]) continue;

          if (!canPlaceSubjectOnDay(sid, d)) continue;

          if (!canPlaceSubjectForAllSections(subject, d, p, 1, false)) continue;

          const assignments = buildAssignments(subject, false);

          slots[d][p] = {
            subject: subject._id,
            subjectName: subject.name,
            type: 'Theory',
            assignments: assignments
          };

          req.periodsAssigned++;
          assigned++;
          recordPlace(sid, d);
          recordFacultyUsage(assignments, d, p, 1);
          placed = true;
          break;
        }
        if (!placed) {
          const hasFaculty = (subject.assignedFaculty || facultyRoomsBySubject.has(sid));
          if (!hasFaculty) {
            if (!sectionErrors.includes(`Subject "${subject.name}" has no faculty allocation.`))
              sectionErrors.push(`Subject "${subject.name}" has no faculty allocation.`);
          } else {
            sectionErrors.push(`No valid slot for "${subject.name}" (Dept ${dept.name}). Facult(y/ies) may be booked or limits exceeded.`);
          }
        }
      }
    }

    // Filler Logic
    for (let d = 0; d < workingDays.length; d++) {
      for (let p = 0; p < periodsPerDay; p++) {
        if (slots[d][p]) continue;
        if (isBreakPeriod(breakPeriodIndices, d, p, periodsPerDay)) continue;

        let filled = false;
        for (const s of deptSubjects) {
          const sid = s._id.toString();

          if (!canPlaceSubjectOnDay(sid, d)) continue;

          if (!canPlaceSubjectForAllSections(s, d, p, 1, false)) continue;

          const assignments = buildAssignments(s, false);

          slots[d][p] = {
            subject: s._id,
            subjectName: s.name,
            type: 'Theory',
            assignments: assignments
          };
          recordPlace(sid, d);
          recordFacultyUsage(assignments, d, p, 1);
          filled = true;
          break;
        }
      }
    }

    let timetable = await Timetable.findOne({
      department: dept._id,
      semester: semNum
    });

    if (!timetable) {
      timetable = new Timetable({
        department: dept._id,
        semester: semNum,
        sectionsCount: sectionsCount,
        workingDays,
        periodsPerDay,
        slots: [],
        generationErrors: []
      });
    }

    timetable.slots = slots;
    timetable.sectionsCount = sectionsCount;
    timetable.workingDays = workingDays;
    timetable.periodsPerDay = periodsPerDay;
    timetable.generationErrors = sectionErrors;
    timetable.generatedAt = new Date();
    timetable.updatedAt = new Date();
    await timetable.save();
    generated.push(timetable);

    if (sectionErrors.length > 0) {
      errors.push(...sectionErrors.map(e => `[${dept.name}] ${e}`));
    }
  }

  return { timetables: generated, errors, skipped, skippedDepartments };
}

module.exports = {
  generateTimetablesForSemester,
  buildGlobalFacultyAvailability
};
