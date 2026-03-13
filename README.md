# Gharpayy Dashboard

## Overview
Gharpayy Dashboard is a comprehensive administration and management system built for Gharpayy. It provides a centralized web-based application to handle various operational aspects, including leads, inventory, properties, bookings, and user analytics.

## Features
- **Authentication & Authorization**: Secure login, signup, and password reset functionalities.
- **Analytics & Reporting**: Data-driven insights and historical logs for business performance metrics.
- **CRM Pipeline**: Track and capture leads, manage conversations, and handle visits.
- **Inventory & Property Management**: Detailed property tracking, matching, and zone management.
- **Owner Portals**: Dedicated interfaces for tracking availability, handling owners, and managing bookings.

## Technology Stack
- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn-ui, Radix UI
- **State Management**: TanStack React Query
- **Backend & Database**: Supabase
- **Routing**: React Router

## What's New (Production Upgrades)
Following the V1 prototype, the system architecture has been heavily fortified for production scale:
- **Strict Role-Based Access Control (RBAC):** Database-level security enforced via Supabase Row Level Security (RLS) and custom PostgreSQL `has_role()` functions.
- **Automated Owner Onboarding:** Database triggers (`on_auth_user_created`) automatically assign roles and route users to appropriate portals upon signup.
- **Integrated Payment Gateway:** End-to-end Razorpay checkout flow with secure Deno Edge Functions (`create-payment-intent`) and transaction logging.
- **System Observability:** Sentry integration and React Global Error Boundaries for real-time crash reporting and stack trace tracking.
- **Automated Background Jobs:** `pg_cron` integration for automated stale-lock cleanup and dynamic lead score recalculations.
- **Realtime Infrastructure:** Live property chat and dynamic availability boards powered by Supabase Realtime.

## Technology Stack
- **Frontend:** React 18, TypeScript, Vite
- **Architecture:** Single Page Application (SPA) with React Router
- **Styling:** Tailwind CSS, shadcn/ui, Radix UI, Framer Motion
- **State Management:** TanStack React Query (Server State)
- **Backend & Database:** Supabase (PostgreSQL)
- **Serverless:** Deno Edge Functions
- **Observability:** Sentry

## Interviewer & Reviewer Access (Demo Credentials)
To thoroughly evaluate the Role-Based Access Control (RBAC) and routing logic, please use the following credentials to access different clearance levels within the system:

| Role | Email | Password | Landing Portal |
| :--- | :--- | :--- | :--- |
| **System Admin** | `taujiludo@gmail.com` | `tauji123` | `/dashboard`  |

*(Note to reviewers: Ensure you test the intelligent routing by logging in via the `/auth` gateway with different accounts to see the RBAC UI restrictions in action.)*

## Local Setup Instructions

Follow these steps to run the dashboard application on your local machine.

### Prerequisites
- Node.js
- npm (Node Package Manager)
- Git

### 1. Clone the Repository
Open your terminal and clone the repository:
```sh
git clone <YOUR_GIT_URL>
```

### 2. Navigate to the Project Directory
```sh
cd gharpayy-flow
```

### 3. Install Dependencies
Install all required packages:
```sh
npm install
```

### 4. Configure Environment Variables
Create a `.env` file in the root directory of the project and add your Supabase credentials:
```env
VITE_SUPABASE_PROJECT_ID="your_project_id_here"
VITE_SUPABASE_PUBLISHABLE_KEY="your_publishable_key_here"
VITE_SUPABASE_URL="https://your_project_id_here.supabase.co"
```

### 5. Start the Development Server
Run the application in development mode:
```sh
npm run dev
```

The application will launch and you can view it in your browser, typically at `http://localhost:8080` (or another port specified in the terminal output).

