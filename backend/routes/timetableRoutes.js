 const express = require('express');
const { saveTimetable, getAllTimetables, autoScheduleTimetable, getTimetableByFacultyName, getTimetableByBatch, getTeachingOverview, getRoomAllocations, createRoomAllocation, deleteRoomAllocation } = require('../controllers/timetableController');
const Timetable = require('../models/Timetable');
const RoomAllocation = require('../models/RoomAllocation');

const router = express.Router();

router.post('/', saveTimetable);
router.post('/save', saveTimetable);
router.get('/', getAllTimetables);

router.put('/:id', async (req, res) => {
  try {
    const timetable = await Timetable.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!timetable) {
      return res.status(404).json({ message: 'Timetable not found' });
    }
    res.json(timetable);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.delete('/:id', async (req, res) => {
  try {
    const timetable = await Timetable.findByIdAndDelete(req.params.id);
    if (!timetable) {
      return res.status(404).json({ message: 'Timetable not found' });
    }
    res.json({ message: 'Timetable deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});




router.post('/auto-schedule', autoScheduleTimetable);
router.get('/by-faculty-name', getTimetableByFacultyName);
router.get('/by-batch', getTimetableByBatch);
router.get('/teaching-overview', getTeachingOverview);
router.get('/room-allocations', getRoomAllocations);
router.post('/room-allocations', createRoomAllocation);
router.delete('/room-allocations/:id', deleteRoomAllocation);

router.get('/timetables/room-allocations', async (req, res) => {
  try {
    const allocations = await RoomAllocation.find(); // or whatever your model is
    res.json(allocations);
  } catch (error) {
    console.error('Error fetching room allocations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/test-room', async (req, res) => {
  try {
    const RoomAllocation = require('../models/RoomAllocation');
    const all = await RoomAllocation.find();
    res.json({ message: 'Success', count: all.length });
  } catch (e) {
    res.status(500).json({ error: e.message, stack: e.stack });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const timetable = await Timetable.findById(req.params.id);
    if (!timetable) {
      return res.status(404).json({ message: 'Timetable not found' });
    }
    res.json(timetable);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const timetable = await Timetable.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!timetable) {
      return res.status(404).json({ message: 'Timetable not found' });
    }
    res.json(timetable);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.delete('/:id', async (req, res) => {
  try {
    const timetable = await Timetable.findByIdAndDelete(req.params.id);
    if (!timetable) {
      return res.status(404).json({ message: 'Timetable not found' });
    }
    res.json({ message: 'Timetable deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/room-allocations/:id', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const RoomAllocation = require('../models/RoomAllocation');
    const updated = await RoomAllocation.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) {
      return res.status(404).json({ message: 'Room allocation not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 