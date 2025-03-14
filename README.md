# Option Trading using Express.js

This project is a backend application for an option trading platform built using Express.js, MongoDB, and Socket.IO. It provides RESTful APIs for user authentication, event management, trade management, and real-time updates via WebSocket.

## Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [License](#license)

## Installation

1. Clone the repository:
    sh
    git clone https://github.com/yourusername/option-trading-expressjs.git
    cd option-trading-expressjs
    

2. Install dependencies:
    sh
    npm install
    

3. Create a .env file in the root directory and add the following environment variables:
    env
    PORT=3000
    MONGODB_URI=your_mongodb_uri
    NODE_ENV=development
    CORS_ORIGIN=http://localhost:3000
    LOG_LEVEL=info
    SPORTS_API_KEY=your_api_key
    SPORTS_API_URL=https://api.sportsdata.com/v3
    

## Configuration

The configuration settings are located in the src/config/config.js file. You can customize the server, database, authentication, WebSocket, CORS, logging, rate limiting, trading, event, and security settings.

## Usage

1. Start the server:
    sh
    npm start
    

2. For development, use:
    sh
    npm run dev
    

## API Endpoints

### Authentication 

- For deployed on render - e.g - https://option-trading-using-expressjs.onrender.com/api/auth/register

- For locally running - e.g - http://localhost:3000/api/auth/register

- *Register a new user*
    http
    POST /api/auth/register
    

- *Login user*
    http
    POST /api/auth/login
    

- *Get user profile*
    http
    GET /api/auth/profile
    

- *Update user profile*
    http
    PUT /api/auth/profile
    

### Events

- *Get all events*
    http
    GET /api/events
    

- *Get a single event by ID*
    http
    GET /api/events/:id
    

- *Create new event (admin only)*
    http
    POST /api/events
    

- *Update event (admin only)*
    http
    PUT /api/events/:id
    

- *Delete event (admin only)*
    http
    DELETE /api/events/:id
    

- *Get live events*
    http
    GET /api/events/status/live
    

- *Update event odds (admin only)*
    http
    PATCH /api/events/:id/odds
    

### Trades

- *Get all trades for authenticated user*
    http
    GET /api/trades/my-trades
    

- *Place a new trade*
    http
    POST /api/trades
    

- *Get trade by ID*
    http
    GET /api/trades/:id
    

- *Cancel trade (if event hasn't started)*
    http
    DELETE /api/trades/:id
    

- *Settle trades for an event (admin only)*
    http
    POST /api/trades/settle/:eventId
    

### Server Events

- *event_update*
    json
    {
        "eventId": "event_id",
        "type": "odds_update",
        "odds": [],
        "status": "live"
    }
    

- *trade_update*
    json
    {
        "type": "trade_settled",
        "tradeId": "trade_id",
        "settledAmount": 100,
        "result": "win"
    }
    

## License

This project is licensed under the MIT License.