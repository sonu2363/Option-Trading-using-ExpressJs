const axios = require('axios');
const Event = require('../models/Event');
const MarketData = require('../models/MarketData');
const logger = require('../../utils/logger');

class DataFetchService {
    // Mock API endpoints (replace with real API endpoints later)
    static API_ENDPOINTS = {
        SPORTS: 'https://api.sportradar.com/v3',
        ODDS: 'https://api.the-odds-api.com/v4'
    };

    // Fetch live sports data
    static async fetchLiveSportsData() {
        try {
            // Mock data for demonstration (replace with actual API call)
            const mockData = [
                {
                    title: "Man City vs Liverpool",
                    type: "sports",
                    startTime: new Date(Date.now() + 3600000),
                    odds: [
                        { option: "Home Win", value: 1.8 },
                        { option: "Draw", value: 3.5 },
                        { option: "Away Win", value: 4.2 }
                    ]
                }
                // Add more mock events
            ];

            // In real implementation, use axios to fetch data:
            // const response = await axios.get(this.API_ENDPOINTS.SPORTS);
            // const data = response.data;

            return mockData;
        } catch (error) {
            logger.error('Error fetching sports data:', error);
            throw error;
        }
    }

    // Store fetched data in MongoDB
    static async storeEventData(eventData) {
        try {
            const event = new Event({
                title: eventData.title,
                type: eventData.type,
                startTime: eventData.startTime,
                status: 'upcoming',
                odds: eventData.odds.map(odd => ({
                    option: odd.option,
                    value: odd.value,
                    timestamp: new Date()
                }))
            });

            await event.save();

            // Create associated market data
            const marketData = new MarketData({
                event: event._id,
                odds: event.odds,
                marketStatus: 'open'
            });

            await marketData.save();

            return { event, marketData };
        } catch (error) {
            logger.error('Error storing event data:', error);
            throw error;
        }
    }

    // Update odds from third-party API
    static async updateEventOdds(eventId) {
        try {
            // Mock odds update (replace with actual API call)
            const mockOddsUpdate = [
                { option: "Home Win", value: 1.9 },
                { option: "Draw", value: 3.3 },
                { option: "Away Win", value: 4.0 }
            ];

            // In real implementation:
            // const response = await axios.get(`${this.API_ENDPOINTS.ODDS}/${eventId}`);
            // const newOdds = response.data;

            const event = await Event.findById(eventId);
            if (!event) {
                throw new Error('Event not found');
            }

            event.updateOdds(mockOddsUpdate);
            await event.save();

            // Update market data
            const marketData = await MarketData.findOne({ event: eventId });
            if (marketData) {
                marketData.updateOdds(mockOddsUpdate);
                await marketData.save();
            }

            return { event, marketData };
        } catch (error) {
            logger.error('Error updating odds:', error);
            throw error;
        }
    }

    // Sync data with third-party API periodically
    static async startDataSync(interval = 300000) { // 5 minutes default
        setInterval(async () => {
            try {
                const liveData = await this.fetchLiveSportsData();
                for (const eventData of liveData) {
                    await this.storeEventData(eventData);
                }
                logger.info('Data sync completed successfully');
            } catch (error) {
                logger.error('Error during data sync:', error);
            }
        }, interval);
    }
}

module.exports = DataFetchService;