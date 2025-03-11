const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const auth = require('../middleware/auth');
const logger = require('../../utils/logger');

// Get all events
router.get('/', async (req, res) => {
    try {
        const events = await Event.find()
            .sort({ startTime: -1 });
        res.json(events);
    } catch (error) {
        logger.error('Error fetching events:', error);
        res.status(500).json({ message: 'Error fetching events' });
    }
});

// Get a single event by ID
router.get('/:id', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        res.json(event);
    } catch (error) {
        logger.error('Error fetching event:', error);
        res.status(500).json({ message: 'Error fetching event' });
    }
});

// Create new event (admin only)
router.post('/', auth, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const { title, type, startTime, odds } = req.body;

        const event = new Event({
            title,
            type,
            startTime,
            odds: odds.map(odd => ({
                option: odd.option,
                value: odd.value,
                timestamp: new Date()
            }))
        });

        await event.save();
        res.status(201).json(event);
    } catch (error) {
        logger.error('Error creating event:', error);
        res.status(500).json({ message: 'Error creating event' });
    }
});

// Update event (admin only)
router.put('/:id', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const { title, type, status, odds, result } = req.body;
        const event = await Event.findByIdAndUpdate(
            req.params.id,
            {
                title,
                type,
                status,
                odds: odds?.map(odd => ({
                    option: odd.option,
                    value: odd.value,
                    timestamp: new Date()
                })),
                result,
                ...(status === 'completed' ? { endTime: new Date() } : {})
            },
            { new: true }
        );

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        res.json(event);
    } catch (error) {
        logger.error('Error updating event:', error);
        res.status(500).json({ message: 'Error updating event' });
    }
});

// Delete event (admin only)
router.delete('/:id', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Check if event has any active trades
        if (event.status === 'live') {
            return res.status(400).json({ 
                message: 'Cannot delete event with active trades' 
            });
        }

        await event.remove();
        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        logger.error('Error deleting event:', error);
        res.status(500).json({ message: 'Error deleting event' });
    }
});

// Get live events
router.get('/status/live', async (req, res) => {
    try {
        const events = await Event.find({ status: 'live' })
            .sort({ startTime: -1 });
        res.json(events);
    } catch (error) {
        logger.error('Error fetching live events:', error);
        res.status(500).json({ message: 'Error fetching live events' });
    }
});

// Update event odds (admin only)
router.patch('/:id/odds', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const { odds } = req.body;
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        if (event.status !== 'live') {
            return res.status(400).json({ 
                message: 'Can only update odds for live events' 
            });
        }

        event.odds.push(...odds.map(odd => ({
            option: odd.option,
            value: odd.value,
            timestamp: new Date()
        })));

        await event.save();
        res.json(event);
    } catch (error) {
        logger.error('Error updating odds:', error);
        res.status(500).json({ message: 'Error updating odds' });
    }
});

module.exports = router;