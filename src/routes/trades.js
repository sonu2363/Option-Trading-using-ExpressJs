const express = require('express');
const router = express.Router();
const Trade = require('../models/Trade');
const Event = require('../models/Event');
const User = require('../models/User');
const auth = require('../middleware/auth');
const logger = require('../../utils/logger');

// Get all trades for authenticated user
router.get('/my-trades', auth, async (req, res) => {
    try {
        const trades = await Trade.find({ user: req.user.userId })
            .populate('event', 'title type status')
            .sort({ createdAt: -1 });
        res.json(trades);
    } catch (error) {
        logger.error('Error fetching trades:', error);
        res.status(500).json({ message: 'Error fetching trades' });
    }
});

// Place a new trade
router.post('/', auth, async (req, res) => {
    try {
        const { eventId, amount, selectedOption } = req.body;

        // Find event and verify it's live
        const event = await Event.findById(eventId);
        if (!event || event.status !== 'live') {
            return res.status(400).json({ 
                message: 'Event not available for trading' 
            });
        }

        // Get latest odds for selected option
        const latestOdds = event.odds
            .filter(odd => odd.option === selectedOption)
            .sort((a, b) => b.timestamp - a.timestamp)[0];

        if (!latestOdds) {
            return res.status(400).json({ 
                message: 'Invalid trading option' 
            });
        }

        // Verify user has sufficient balance
        const user = await User.findById(req.user.userId);
        if (user.balance < amount) {
            return res.status(400).json({ 
                message: 'Insufficient balance' 
            });
        }

        // Create trade
        const trade = new Trade({
            user: req.user.userId,
            event: eventId,
            amount,
            selectedOption,
            odds: latestOdds.value
        });

        // Update user balance
        user.balance -= amount;
        await user.save();

        await trade.save();
        
        // Populate event details before sending response
        await trade.populate('event', 'title type status');
        
        res.status(201).json(trade);
    } catch (error) {
        logger.error('Error placing trade:', error);
        res.status(500).json({ message: 'Error placing trade' });
    }
});

// Get trade by ID
router.get('/:id', auth, async (req, res) => {
    try {
        const trade = await Trade.findOne({
            _id: req.params.id,
            user: req.user.userId
        }).populate('event', 'title type status');

        if (!trade) {
            return res.status(404).json({ message: 'Trade not found' });
        }

        res.json(trade);
    } catch (error) {
        logger.error('Error fetching trade:', error);
        res.status(500).json({ message: 'Error fetching trade' });
    }
});

// Cancel trade (if event hasn't started)
router.delete('/:id', auth, async (req, res) => {
    try {
        const trade = await Trade.findOne({
            _id: req.params.id,
            user: req.user.userId,
            status: 'pending'
        }).populate('event');

        if (!trade) {
            return res.status(404).json({ message: 'Trade not found' });
        }

        if (trade.event.status !== 'upcoming') {
            return res.status(400).json({ 
                message: 'Cannot cancel trade after event has started' 
            });
        }

        // Refund user's balance
        const user = await User.findById(req.user.userId);
        user.balance += trade.amount;
        await user.save();

        trade.status = 'cancelled';
        await trade.save();

        res.json({ message: 'Trade cancelled successfully' });
    } catch (error) {
        logger.error('Error cancelling trade:', error);
        res.status(500).json({ message: 'Error cancelling trade' });
    }
});

// Admin route: Settle trades for an event
router.post('/settle/:eventId', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const event = await Event.findById(req.params.eventId);
        if (!event || event.status !== 'completed' || !event.result) {
            return res.status(400).json({ 
                message: 'Event not ready for settlement' 
            });
        }

        const trades = await Trade.find({
            event: event._id,
            status: 'pending'
        });

        for (const trade of trades) {
            const user = await User.findById(trade.user);
            
            // Calculate winnings if user selected correct option
            if (trade.selectedOption === event.result) {
                const winnings = trade.amount * trade.odds;
                user.balance += winnings;
                trade.settledAmount = winnings;
            }

            trade.status = 'settled';
            trade.result = event.result;
            
            await Promise.all([user.save(), trade.save()]);
        }

        res.json({ message: `Settled ${trades.length} trades` });
    } catch (error) {
        logger.error('Error settling trades:', error);
        res.status(500).json({ message: 'Error settling trades' });
    }
});

module.exports = router;