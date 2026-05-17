# Trackr - Goal Tracking Portal

<p align="center">
  <img src="frontend/public/logo.png" alt="Trackr Logo" width="200" />
</p>

Trackr is a comprehensive **In-House Goal Setting & Tracking Portal** designed for enterprise environments. It digitizes the entire performance management lifecycle—from quarterly goal setting and manager approvals to progress tracking and audit-ready reporting.

---

## 🚀 Features

### 👤 Employee Portal
- **Goal Management**: Create and manage quarterly goals with strict weightage validation (total must equal 100%).
- **Draft & Submission**: Save goals as drafts and submit them for manager review during active windows.
- **Quarterly Check-ins**: Record progress for each goal using various Units of Measurement (numeric, boolean, timeline).
- **Automated Scoring**: Real-time achievement score calculation based on predefined targets.

### 👥 Manager Dashboard
- **Team Oversight**: View and manage goal sheets for all direct reports.
- **Approval Workflow**: Approve goal sheets or return them for rework with comments.
- **Shared Goals**: Propagate organizational or departmental goals to team members with automated progress synchronization.
- **Performance Tracking**: Monitor team check-ins and completion statuses at a glance.

### 🛡️ Admin & HR Control Panel
- **Cycle Management**: Configure goal-setting cycles and active submission windows.
- **Org Hierarchy**: Manage user roles (Employee, Manager, Admin) and reporting structures.
- **Audit Trails**: Complete transparency with detailed logging for every modification to locked goal sheets.
- **Analytics & Reporting**: Export comprehensive achievement and completion reports to CSV/Excel.

### 🤖 Trackr AI Assistant (Chatbot)
- **Live Context Querying**: Securely queries the active database to retrieve personalized profile details, manager reporting hierarchy, goal statuses, and quarterly check-ins.
- **Dynamic Progress Calculations**: Computes real-time weighted progress scores and visualizes them with inline progress bars directly in the conversation.
- **Rule Verification**: Guides users on organizational goal-setting constraints (e.g., maximum of 8 goals, minimum 10% weightage, and cycle lock/unlock mechanics).
- **Dual-Engine Pipeline**: Leverages the **Mistral AI Large API** for state-of-the-art conversational experiences with a robust, intelligent **Local NLP Agent fallback** for offline/dev environments.
- **Premium Glassmorphism UI**: Beautiful, interactive drawer widget with dynamic suggestion chips, smooth scroll animations, history clearing capabilities, and full light/dark theme synchronization.

### ✉️ Email Notifications (Nodemailer)
- **Action-Triggered Dispatches**: Sends automated emails for critical system actions, including Goal Submission, Goal Approval, and Goal Rework comments.
- **Automated Check-in Reminders**: Dynamic quarterly performance check-in templates notify team members automatically as review cycles approach deadlines.
- **Fail-Safe Mechanism**: Non-blocking dispatches ensure that SMTP server hiccups or connection timeouts do not impact user request execution.
- **Responsive HTML Branding**: Custom, responsive HTML templates containing direct call-to-action link buttons.

### 🔔 Real-Time In-App Alerts
- **Top Nav Dropdown**: Premium glassmorphism dropdown widget with glowing indicator dots and unread badge counters.
- **Persistent Supabase Schema**: Automatically populates database logs with unread states, titles, body descriptions, and action deep-links.
- **Dynamic Icon Mapping**: Custom contextual icons mapping visually to approved, rework, submission, and reminder alert states.
- **Deep Linking Navigation**: Seamless single-click routing using React Router, automatically navigating users directly to the relevant goal sheets or review dashboards.

---

## 🏗️ Architecture

Trackr uses a modern, scalable **MERN + Supabase** architecture:

- **Frontend**: React 18 (Vite) + Tailwind CSS + TanStack Query.
- **Backend**: Node.js + Express + TypeScript + Zod validation.
- **Data**: Supabase (PostgreSQL 15) for persistence and authentication.

![alt text](image.png)
*For more details, see the [System Architecture Documentation](System_Architecture_Goal_Tracking_Portal.md).*

---

## 🛠️ Tech Stack

- **UI Framework**: [React 18](https://reactjs.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **State Management**: [TanStack Query v5](https://tanstack.com/query/latest)
- **API Runtime**: [Node.js](https://nodejs.org/) & [Express](https://expressjs.com/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [PostgreSQL 15](https://www.postgresql.org/) (via [Supabase](https://supabase.com/))
- **Email Delivery**: [Nodemailer](https://nodemailer.com/) *(with fail-safe non-blocking handlers)*
- **AI Capabilities**: [Mistral AI API](https://mistral.ai/) *(with smart local fallback NLP agent)*
- **Documentation**: [Swagger / OpenAPI](https://swagger.io/)

---

## 🏁 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn
- A Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YASH-DHADGE/Trackr---Goal-Tracking-Portal.git
   cd Trackr---Goal-Tracking-Portal
   ```

2. **Install dependencies**
   Use the root-level script to install all frontend and backend dependencies:
   ```bash
   npm run install-all
   ```

3. **Environment Setup**
   Create a `.env` file in the `/backend` directory:
   ```env
   PORT=3001
   DATABASE_URL=your_supabase_postgresql_connection_string
   JWT_SECRET=your_jwt_secret
   MISTRAL_API_KEY=your_mistral_api_key_here # Optional: For advanced AI chatbot capabilities
   
   # Nodemailer SMTP Configuration
   SMTP_HOST=your_smtp_host
   SMTP_PORT=your_smtp_port
   SMTP_USER=your_smtp_username
   SMTP_PASS=your_smtp_password
   
   # Deep Linking & Webhooks
   FRONTEND_URL=http://localhost:5173
   TEAMS_WEBHOOK_URL=your_teams_webhook_url # Optional: For Microsoft Teams cards
   ```

4. **Database Migration**
   The backend automatically runs migrations on startup. Ensure your `DATABASE_URL` is correct.

5. **Run the application**
   From the root directory, run both frontend and backend concurrently:
   ```bash
   npm run dev
   ```
   - Frontend: `http://localhost:5173`
   - Backend: `http://localhost:3001`
   - API Docs: `http://localhost:3001/api/docs`

---

## 📁 Project Structure

```text
├── backend
│   ├── src
│   │   ├── config        # DB connection & migrations
│   │   ├── middleware    # Auth & validation guards
│   │   ├── modules       # Domain-driven feature logic
│   │   └── routes        # Express API endpoints
│   └── supabase/migrations
├── frontend
│   ├── src
│   │   ├── api           # Axios client & Query hooks
│   │   ├── components    # Shared UI library
│   │   ├── features      # Feature-specific components
│   │   ├── layouts       # Role-based layout wrappers
│   │   └── pages         # Route-level views
│   └── public            # Static assets
└── docs                  # Architecture & design documentation
```

---

## 📄 License
This project is licensed under the ISC License.
