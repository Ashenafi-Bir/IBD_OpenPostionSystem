# International Banking Department System

A comprehensive backend system for managing international banking operations, including balance calculations, position reporting, and correspondent bank monitoring.

## Features

- **Daily Balance Calculation**: Automatically calculates cash on hand based on previous balances and transactions
- **Position Reporting**: Calculates bank's foreign currency position against paid-up capital
- **Correspondent Bank Monitoring**: Tracks balances and generates limit alerts
- **Role-based Access Control**: Maker-Authorizer workflow for financial transactions
- **Real-time Reporting**: Generate various financial reports on demand

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up MySQL database
4. Copy `.env.example` to `.env` and configure your settings
5. Run database seed: `npm run seed`
6. Start the server: `npm run dev`

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Balances & Reports
- `GET /api/balances/cash-on-hand/:currency?date=YYYY-MM-DD` - Calculate cash on hand
- `GET /api/balances/totals?date=YYYY-MM-DD` - Get asset/liability totals
- `GET /api/balances/position?date=YYYY-MM-DD` - Calculate bank position

### Correspondent Banks
- `GET /api/correspondent/limits?date=YYYY-MM-DD` - Generate limits report
- `GET /api/correspondent/cash-cover?date=YYYY-MM-DD` - Generate cash cover report

## Database Schema

The system uses the following main tables:
- `users` - System users with roles
- `currencies` - Supported currencies
- `balance_items` - Asset/liability categories
- `daily_balances` - Daily balance records
- `fcy_transactions` - Foreign currency transactions
- `correspondent_banks` - Correspondent bank details
- `exchange_rates` - Daily exchange rates

## Security Features

- JWT-based authentication
- Role-based access control
- Input validation and sanitization
- SQL injection prevention
- XSS protection

## Monitoring

The system includes comprehensive logging and can be monitored via:
- Health check endpoint: `/health`
- System logs in `error.log` and `combined.log`
- Database query logging (in development)