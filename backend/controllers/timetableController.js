const Timetable = require('../models/Timetable');
const Course = require('../models/Course');
const RoomAllocation = require('../models/RoomAllocation');

exports.saveTimetable = async (req, res) => {
  try {
    const timetablesToSave = req.body; // Expecting an array of { semester, batch, timetable }

    if (!Array.isArray(timetablesToSave) || timetablesToSave.length === 0) {
      return res.status(400).json({ message: 'No timetable data provided.' });
    }

    const savedResults = [];

    for (const timetableData of timetablesToSave) {
      const { semester, batch, timetable } = timetableData;

      if (!semester || !batch || !timetable) {
        return res.status(400).json({ message: 'Missing required fields (semester, batch, or timetable) for one or more timetables.' });
      }

      // Find and update if exists, otherwise create new
      const savedTimetable = await Timetable.findOneAndUpdate(
        { semester, batch },
        { timetable, createdAt: new Date() },
        { new: true, upsert: true, runValidators: true }
      );
      savedResults.push(savedTimetable);
    }

    res.status(200).json(savedResults);
  } catch (error) {
    console.error('Error saving timetables:', error);
    if (error.code === 11000) {
      return res.status(409).json({ message: 'A timetable for this semester and batch already exists.' });
    }
    res.status(500).json({ message: error.message });
  }
};

exports.getAllTimetables = async (req, res) => {
  try {
    const timetables = await Timetable.find({}); // Fetch all timetables
    res.status(200).json(timetables);
  } catch (error) {
    console.error('Error fetching all timetables:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.autoScheduleTimetable = async (req, res) => {
  try {
    const { semester, courses, batches, studentType } = req.body;
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const timeSlots = ['08:30-09:20', '09:25-10:15', '10:30-11:20', '11:25-12:15', '01:10-02:00', '02:05-02:55', '03:00-03:50', '03:55-04:45'];
    const lunchStart = 4; // 11:25-12:15 (index 3), lunch break after slot 4 (index 3), resumes at index 4 (01:10-02:00)
    const lunchEnd = 4; // slot index 4 is after lunch

    // 1. Build faculty-course-batch mapping from DB
    const facultyDocs = await require('../models/Faculty').find({});
    const facultyMap = {};
    facultyDocs.forEach(fac => {
      fac.courseHandled.forEach(ch => {
        if (!facultyMap[ch.courseCode]) facultyMap[ch.courseCode] = [];
        facultyMap[ch.courseCode].push({
          faculty: fac.name,
          role: ch.role,
          batch: ch.batch
        });
      });
    });

    // 2. Build course list with faculty assignments for this semester/batches
    const courseList = [];
    for (const course of courses) {
      // Find faculty for this course and batch
      let assignedFaculty = 'Unassigned';
      if (facultyMap[course.code]) {
        // Prefer batch-specific, else any
        const batchFac = facultyMap[course.code].find(f => f.batch === course.batch);
        assignedFaculty = batchFac ? batchFac.faculty : facultyMap[course.code][0].faculty;
      }
      courseList.push({ ...course, faculty: assignedFaculty });
    }

    // 3. Build faculty schedule tracker
    const allFaculty = Array.from(new Set(courseList.map(c => c.faculty).filter(f => f && f !== 'Unassigned')));
    const facultySchedule = {};
    allFaculty.forEach(fac => {
      facultySchedule[fac] = {};
      days.forEach(day => {
        facultySchedule[fac][day] = Array(timeSlots.length).fill(null); // slot: courseCode or null
      });
    });

    // 4. Build timetable skeleton for each batch
    const timetable = {};
    batches.forEach(batch => {
      timetable[batch] = {};
      days.forEach(day => {
        timetable[batch][day] = {};
        timeSlots.forEach(slot => {
          timetable[batch][day][slot] = null;
        });
      });
    });

    // 5. Helper: get required hours for a course
    function getCourseHourMapping(course) {
      const credits = Number(course.credits);
      const cat = (course.category || '').toLowerCase();
      // Strict mapping for theory courses (non-continuous)
      if (cat === 'theory') {
        if ([1,2,3,4].includes(credits)) return { theory: credits, lab: 0, labIntegrated: 0, labBlock: 0 };
        return { theory: 0, lab: 0, labIntegrated: 0, labBlock: 0 };
      }
      // Strict mapping for lab courses (continuous)
      if (cat === 'lab') {
        if (credits === 2) return { theory: 0, lab: 2, labIntegrated: 0, labBlock: 2 };
        return { theory: 0, lab: 0, labIntegrated: 0, labBlock: 0 };
      }
      // Strict mapping for lab-integrated theory
      if (cat.includes('lab integrated')) {
        if (credits === 2) return { theory: 0, lab: 3, labIntegrated: 3, labBlock: 3 }; // 3 hours/week (continuous)
        if (credits === 3) return { theory: 2, lab: 2, labIntegrated: 4, labBlock: 2 }; // 2 theory (non-continuous) + 2 lab (continuous)
        if (credits === 4) return { theory: 3, lab: 2, labIntegrated: 5, labBlock: 2 }; // 3 theory (non-continuous) + 2 lab (continuous)
        if (credits === 5) return { theory: 3, lab: 4, labIntegrated: 7, labBlock: 4 }; // 3 theory (non-continuous) + 4 lab (continuous)
        if (credits === 6) return { theory: 3, lab: 4, labIntegrated: 7, labBlock: 4 }; // 3 theory (non-continuous) + 4 lab (continuous)
        return { theory: 0, lab: 0, labIntegrated: 0, labBlock: 0 };
      }
      // Fallback: no hours for any other case
      return { theory: 0, lab: 0, labIntegrated: 0, labBlock: 0 };
    }

    // 6. Track unscheduled entries
    const unscheduled = [];

    // 7. Allocate first-hour classes for each faculty (prioritize)
    const facultyFirstHourAssigned = {};
    for (const fac of allFaculty) facultyFirstHourAssigned[fac] = false;
    for (const fac of allFaculty) {
      let assigned = false;
      for (const batch of batches) {
        for (const day of days) {
          if (assigned) break;
          // Find a theory course for this faculty and batch
          const course = courseList.find(c => c.faculty === fac && c.batch === batch && getCourseHourMapping(c).theory > 0);
          if (!course) continue;
          if (!timetable[batch][day][timeSlots[0]]) {
            // Check faculty is free
            if (!facultySchedule[fac][day][0]) {
              timetable[batch][day][timeSlots[0]] = {
                ...course,
                type: 'Theory',
                slotType: 'FirstHour'
              };
              facultySchedule[fac][day][0] = course.code;
              assigned = true;
              facultyFirstHourAssigned[fac] = true;
            }
          }
        }
      }
    }

    // 8. Allocate labs and lab-integrated (consecutive slots, never split across lunch)
    for (const course of courseList) {
      const { lab, labIntegrated, labBlock } = getCourseHourMapping(course);
      if (lab > 0 || labIntegrated > 0) {
        // Strict: Only schedule if a single continuous block of the required length is available for the batch
        const required = labBlock || (lab > 0 ? lab : labIntegrated);
    for (const batch of batches) {
          if (course.batch !== batch) continue;
          let scheduled = false;
          for (const day of days) {
            // Do not schedule if batch already has a lab on this day
            let hasLab = false;
            for (const slot of timeSlots) {
              if (timetable[batch][day][slot] && (timetable[batch][day][slot].type === 'Lab' || timetable[batch][day][slot].type === 'LabIntegrated')) {
                hasLab = true;
                break;
              }
            }
            if (hasLab) continue;
            // Only allow labs fully before lunch or fully after lunch
            const validRanges = [];
            if (required <= lunchStart) validRanges.push([0, lunchStart - required + 1]); // before lunch
            if (required <= (timeSlots.length - lunchEnd)) validRanges.push([lunchEnd, timeSlots.length - required + 1]); // after lunch
            for (const [start, end] of validRanges) {
              for (let i = start; i < end; i++) {
                let canAssign = true;
                for (let j = 0; j < required; j++) {
                  if (timetable[batch][day][timeSlots[i + j]]) canAssign = false;
                  if (course.faculty !== 'Unassigned' && facultySchedule[course.faculty][day][i + j]) canAssign = false;
                }
                // If faculty already has a lab that day, skip
                if (course.faculty !== 'Unassigned' && facultySchedule[course.faculty][day].some(val => val && val.includes('LAB'))) canAssign = false;
                if (canAssign) {
                  // Assign the entire block as a single continuous lab
                  for (let j = 0; j < required; j++) {
                  timetable[batch][day][timeSlots[i + j]] = {
                      ...course,
                      type: lab > 0 && !course.category.toLowerCase().includes('lab integrated') ? 'Lab' : 'LabIntegrated',
                      slotType: lab > 0 && !course.category.toLowerCase().includes('lab integrated') ? 'Lab' : 'LabIntegrated'
                    };
                    if (course.faculty !== 'Unassigned') facultySchedule[course.faculty][day][i + j] = course.code + '_LAB';
                  }
                  scheduled = true;
                  break;
                }
              }
              if (scheduled) break;
            }
            if (scheduled) break;
          }
          // If not scheduled for this batch, do not schedule any part of the lab for this batch
          if (!scheduled) unscheduled.push({ code: course.code, faculty: course.faculty, semester: course.semester, batch: course.batch, reason: 'Lab/Lab-Integrated block could not be scheduled as a single continuous block' });
        }
      }
    }

    // 9. Allocate theory hours (non-continuous, respect lab-day constraint, and spread across days)
    for (const course of courseList) {
      const { theory } = getCourseHourMapping(course);
      if (theory > 0) {
    for (const batch of batches) {
          if (course.batch !== batch) continue;
          let assigned = 0;
          let availableSlots = [];
          // Track days already used for this course and batch
          let usedDays = new Set();
          for (const day of days) {
            // Do not schedule if batch already has max classes for this day
            let classCount = 0;
            for (const slot of timeSlots) {
              if (timetable[batch][day][slot]) classCount++;
            }
            if (classCount >= timeSlots.length) continue;
            if (usedDays.size >= theory) break; // Do not assign more than needed
            for (let slotIdx = 0; slotIdx < timeSlots.length; slotIdx++) {
              // Only consider non-continuous slots
              if (slotIdx > 0 && timetable[batch][day][timeSlots[slotIdx - 1]] && timetable[batch][day][timeSlots[slotIdx - 1]].type === 'Theory') continue;
              if (!timetable[batch][day][timeSlots[slotIdx]]) {
                // Check faculty is free
                if (course.faculty !== 'Unassigned' && facultySchedule[course.faculty][day][slotIdx]) continue;
                // Check for overlap across batches/semesters
                let overlap = false;
                if (course.faculty !== 'Unassigned') {
                  for (const otherBatch of batches) {
                    if (otherBatch === batch) continue;
                    if (timetable[otherBatch][day][timeSlots[slotIdx]] && timetable[otherBatch][day][timeSlots[slotIdx]].faculty === course.faculty) {
                      overlap = true;
                      break;
                    }
                  }
                }
                if (overlap) continue;
                // Only one theory class per course per batch per day
                if (usedDays.has(day)) continue;
                availableSlots.push({ day, slotIdx });
                usedDays.add(day);
                break; // Move to next day after assigning one slot for this course
              }
            }
          }
          // Only schedule if enough days/slots are available
          if (availableSlots.length === theory) {
            for (const { day, slotIdx } of availableSlots) {
              timetable[batch][day][timeSlots[slotIdx]] = {
                ...course,
                type: 'Theory',
                slotType: 'Theory'
              };
              if (course.faculty !== 'Unassigned') facultySchedule[course.faculty][day][slotIdx] = course.code;
              assigned++;
            }
          } else {
            // If not enough days/slots, do not schedule any theory for this batch
            unscheduled.push({ code: course.code, faculty: course.faculty, semester: course.semester, batch: course.batch, reason: 'Not enough days/slots for theory (spread required)' });
          }
        }
      }
    }

    // 10. Ensure every faculty has at least one free day (per faculty, not per batch)
    for (const fac of allFaculty) {
      let freeDay = null;
      for (const day of days) {
        if (facultySchedule[fac][day].every(val => !val)) {
          freeDay = day;
          break;
        }
      }
      if (!freeDay) {
        // Try to clear a day with minimum assignments
        let minCount = Infinity, minDay = null;
        for (const day of days) {
          const count = facultySchedule[fac][day].filter(Boolean).length;
          if (count < minCount) {
            minCount = count;
            minDay = day;
          }
        }
        // Remove all assignments for that day for all batches
        for (const batch of batches) {
          for (let slotIdx = 0; slotIdx < timeSlots.length; slotIdx++) {
            if (timetable[batch][minDay][timeSlots[slotIdx]] && timetable[batch][minDay][timeSlots[slotIdx]].faculty === fac) {
              timetable[batch][minDay][timeSlots[slotIdx]] = null;
              facultySchedule[fac][minDay][slotIdx] = null;
            }
          }
        }
      }
    }
    
    // 11. Save the generated timetable for each batch
    const savedResults = [];
    for (const batch of batches) {
      const existing = await Timetable.findOne({ semester, batch });
      if (existing) {
        existing.timetable = timetable[batch];
        await existing.save();
        savedResults.push(existing);
      } else {
        const newTT = new Timetable({ semester, batch, timetable: timetable[batch] });
        await newTT.save();
        savedResults.push(newTT);
      }
    }
    
    // After scheduling and rebalancing, ensure no day in a week is left empty for any batch
    for (const batch of batches) {
      let changed = true;
      while (changed) {
        changed = false;
      for (const day of days) {
          // If this day is empty for this batch
          let isEmpty = true;
          for (const slot of timeSlots) {
            if (timetable[batch][day][slot]) {
              isEmpty = false;
              break;
            }
          }
          if (isEmpty) {
            // Try to move a class from a day with more than one class
            let moved = false;
            for (const donorDay of days) {
              if (donorDay === day) continue;
              // Count classes on donorDay
              let donorCount = 0;
              for (const slot of timeSlots) {
                if (timetable[batch][donorDay][slot]) donorCount++;
              }
              if (donorCount > 1) {
        for (const slot of timeSlots) {
                  const entry = timetable[batch][donorDay][slot];
                  if (!entry) continue;
                  // For theory: ensure non-continuity and only one per course per day
                  if (entry.type === 'Theory') {
                    // No theory in previous slot
                    let slotIdx = timeSlots.indexOf(slot);
                    if (slotIdx > 0 && timetable[batch][day][timeSlots[slotIdx - 1]] && timetable[batch][day][timeSlots[slotIdx - 1]].type === 'Theory') continue;
                    // No other theory for this course on this day
                    let alreadyTheory = false;
                    for (const s of timeSlots) {
                      if (timetable[batch][day][s] && timetable[batch][day][s].code === entry.code && timetable[batch][day][s].type === 'Theory') {
                        alreadyTheory = true;
                        break;
                      }
                    }
                    if (alreadyTheory) continue;
                  }
                  // For lab/lab-integrated: only move if it is a single slot (not a block), and only if no lab already on this day
                  if ((entry.type === 'Lab' || entry.type === 'LabIntegrated')) {
                    if (entry.labBlock && entry.labBlock > 1) continue;
                    let hasLab = false;
                    for (const s of timeSlots) {
                      if (timetable[batch][day][s] && (timetable[batch][day][s].type === 'Lab' || timetable[batch][day][s].type === 'LabIntegrated')) {
                        hasLab = true;
                        break;
                      }
                    }
                    if (hasLab) continue;
                  }
                  // Move the class
                  timetable[batch][day][slot] = entry;
                  timetable[batch][donorDay][slot] = null;
                  changed = true;
                  moved = true;
                  break;
                }
              }
              if (moved) break;
            }
          }
        }
      }
    }

    res.status(200).json({
      timetable,
      unscheduled
    });
  } catch (error) {
    console.error('Error in autoScheduleTimetable:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get timetable by faculty name
exports.getTimetableByFacultyName = async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) return res.status(400).json({ message: 'Faculty name is required' });
    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const TIME_SLOTS = ['08:30-09:20', '09:25-10:15', '10:30-11:20', '11:25-12:15', '01:10-02:00', '02:05-02:55', '03:00-03:50', '03:55-04:45'];
    // Initialize empty timetable structure
    const facultyTimetable = {};
    DAYS.forEach(day => {
      facultyTimetable[day] = {};
      TIME_SLOTS.forEach(slot => {
        facultyTimetable[day][slot] = null;
      });
    });
    // Fetch all timetables
    const timetables = await require('../models/Timetable').find({});
    timetables.forEach(tt => {
      const { batch, timetable } = tt;
      if (!timetable || typeof timetable !== 'object') return;
      DAYS.forEach(day => {
        if (!timetable[day] || typeof timetable[day] !== 'object') return;
        TIME_SLOTS.forEach(slot => {
          const period = timetable[day][slot];
          if (
            period &&
            typeof period === 'object' &&
            period.faculty &&
            typeof period.faculty === 'string' &&
            period.faculty.trim().toLowerCase() === name.trim().toLowerCase()
          ) {
            // Place the period in the facultyTimetable structure
            facultyTimetable[day][slot] = {
              ...period,
              batch: batch,
              day: day,
              slot: slot
            };
          }
        });
      });
    });
    return res.status(200).json({ timetable: facultyTimetable });
  } catch (error) {
    console.error('Error in getTimetableByFacultyName:', error);
    return res.status(500).json({ message: 'Internal server error: ' + error.message });
  }
};

// Get timetable by batch (and optionally semester and type)
exports.getTimetableByBatch = async (req, res) => {
  try {
    const { batch, semester, type } = req.query;
    if (!type || (type !== 'UG' && type !== 'PG')) {
      return res.status(400).json({ message: 'Type (UG or PG) is required' });
    }
    let query = {};
    if (type === 'UG') {
      if (!batch || !semester) {
        return res.status(400).json({ message: 'Batch and semester are required for UG' });
      }
      query = { batch, semester: String(semester) };
    } else if (type === 'PG') {
      if (!semester) {
        return res.status(400).json({ message: 'Semester is required for PG' });
      }
      query = { semester };
    }
    const timetable = await Timetable.findOne(query);
    if (!timetable) {
      return res.status(404).json({ message: 'No timetable found for the selected criteria' });
    }
    res.json({ timetable });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get teaching overview for a faculty
exports.getTeachingOverview = async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) return res.status(400).json({ message: 'Faculty name is required' });
    const timetables = await Timetable.find({});
    let totalHours = 0;
    const uniqueClasses = new Set();
    timetables.forEach(tt => {
      Object.values(tt.timetable).forEach(daySlots => {
        Object.values(daySlots).forEach(period => {
          if (period && period.faculty && period.faculty.toLowerCase() === name.toLowerCase()) {
            totalHours += 1;
            if (period.code) uniqueClasses.add(period.code);
          }
        });
      });
    });
    res.json({ totalHours, classesHandled: uniqueClasses.size });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
console.log('===> Inside getRoomAllocations controller');

exports.getRoomAllocations = async (req, res) => {
  try {
    console.log('===> Inside getRoomAllocations controller (RAW QUERY)');
    const mongoose = require('mongoose');
    const allocations = await mongoose.connection.db.collection('roomallocations').find({}).toArray();
    console.log('Allocations found (raw):', allocations.length);
    res.json(allocations);
  } catch (err) {
    console.error('Error fetching room allocations (raw):', err);
    res.status(500).json({ 
      message: 'Failed to fetch room allocations (raw).',
      error: err.message,
      stack: err.stack
    });
  }
};

exports.createRoomAllocation = async (req, res) => {
  try {
    console.log('Received room allocation request:', req.body); // Debug log
    const { courseType, semester, batch, room, assignedBy, semesterType } = req.body;
    
    // Validate required fields
    if (!courseType || !semester || !room || !assignedBy || !semesterType) {
      console.log('Missing required fields:', { courseType, semester, room, assignedBy, semesterType }); // Debug log
      return res.status(400).json({ 
        message: 'Missing required fields: courseType, semester, room, assignedBy, and semesterType are required.' 
      });
    }
    
    // Prevent duplicate room assignment for the same semester and time
    let conflict;
    if (courseType === 'UG') {
      // For UG, allow different batches to use the same room in the same semester
      conflict = await RoomAllocation.findOne({ courseType, semester, room, batch });
    } else {
      // For PG, keep unique per courseType, semester, room
      conflict = await RoomAllocation.findOne({ courseType, semester, room });
    }
    if (conflict) {
      console.log('Conflict found:', conflict); // Debug log
      return res.status(400).json({ 
        message: 'This room is already assigned to this batch (UG) or semester (PG).' 
      });
    }
    
    const allocationData = { courseType, semester, batch, room, assignedBy, semesterType };
    console.log('Creating allocation with data:', allocationData); // Debug log
    const allocation = new RoomAllocation(allocationData);
    await allocation.save();
    console.log('Allocation saved successfully:', allocation); // Debug log
    res.status(201).json(allocation);
  } catch (err) {
    console.error('Error creating room allocation:', err);
    res.status(500).json({ 
      message: 'Failed to create room allocation.',
      error: err.message 
    });
  }
};

exports.deleteRoomAllocation = async (req, res) => {
  try {
    const { id } = req.params;
    await RoomAllocation.findByIdAndDelete(id);
    res.json({ message: 'Room allocation deleted successfully.' });
  } catch (err) {
    console.error('Error deleting room allocation:', err);
    res.status(500).json({ 
      message: 'Failed to delete room allocation.',
      error: err.message 
    });
  }
};

// Removed getTimetable, updateTimetable, deleteTimetable as they are based on ID and not suitable for the new schema.

