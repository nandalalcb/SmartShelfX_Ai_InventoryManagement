# SmartShelfX – AI-Powered Inventory Management System

Enterprise-grade inventory management platform with AI demand forecasting, automated restocking, and real-time analytics.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Angular 19    │───▶│  Node.js/Express  │───▶│  Python/FastAPI  │
│   Frontend      │    │   Backend API     │    │  AI Forecasting  │
│   Port: 4200    │    │   Port: 5000      │    │   Port: 8000     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                       ┌──────┴──────┐
                       │    MySQL     │
                       │  Port: 3306  │
                       └─────────────┘
```

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+
- MySQL 8.0+
- npm / pip

### 1. Database Setup
```sql
CREATE DATABASE smartshelfx_ai;
```

### 2. Backend
```bash
cd backend
npm install
# Edit .env with your MySQL credentials
npm run migrate    # Create tables
npm run seed       # Load sample data
npm run dev        # Start on port 5000
```

### 3. AI Service
```bash
cd ai-service
pip install -r requirements.txt
python main.py     # Start on port 8000
```

### 4. Frontend
```bash
cd frontend
npm install
npm start           # Start on port 4200
```

### 5. Open Browser
Navigate to `http://localhost:4200`

## Demo Credentials
| Role    | Email                      | Password    |
|---------|----------------------------|-------------|
| Admin   | admin@smartshelfx.com      | admin123    |
| Manager | manager@smartshelfx.com    | password123 |
| Vendor  | vendor1@smartshelfx.com    | password123 |

## API Documentation
After starting the backend: `http://localhost:5000/api-docs`

## Features
- **User & Role Management** – ADMIN, MANAGER, VENDOR with JWT auth
- **Inventory Catalog** – CRUD, SKU validation, CSV import, filtering
- **Stock Transactions** – IN/OUT recording with auto stock updates
- **AI Demand Forecasting** – ML predictions via Python microservice
- **Auto-Restock** – Cron-based PO generation for at-risk products
- **Purchase Orders** – Approve/Reject/Dispatch workflow
- **Alerts & Notifications** – Real-time low-stock and vendor alerts
- **Analytics Dashboard** – Trends, charts, Excel/PDF export

## Tech Stack
| Layer     | Technology                              |
|-----------|-----------------------------------------|
| Frontend  | Angular 19, Angular Material, Chart.js  |
| Backend   | Node.js, Express, Sequelize, JWT        |
| AI        | Python, FastAPI, Scikit-learn           |
| Database  | MySQL 8.0                               |
