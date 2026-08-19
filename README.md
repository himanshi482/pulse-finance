# ⚡ Pulse Finance - Full-Stack Personal Finance Tracker

Pulse Finance is a modern, full-stack personal finance application built with **Node.js**, **Express.js**, and **MySQL**. It helps users take control of their finances by tracking income, expenses, monthly category budgets, interactive goal progress, and detailed activity logs in real-time.

---

## 🌟 Key Features

* **User Authentication & Security**: Secure user signup, login with JWT authentication, password hashing via bcrypt, and a dedicated **Forgot Password / Password Reset** workflow.
* **Income & Expense Management**: Easily record, filter, and manage income and expense transactions.
* **Real-time Budget Tracking**: Set overall monthly budgets and category-specific budget limits.
* **Interactive Doughnut Progress Chart**: Visual doughnut chart showing live percentage of budget used, days under budget, and top spending category highlights.
* **Upcoming Bills Tracking**: Track upcoming bills due within 30 days and mark them as paid.
* **Activity Logging**: Full audit log tracking user logins, registrations, password resets, and transaction edits.
* **Export Reports**: Export transaction history into CSV format for external analysis.

---

## 🛠️ Technology Stack

### Frontend
* **HTML5 / CSS3** (Custom responsive design with modern dark & green theme palette)
* **JavaScript (ES6+)** with Fetch API & Dynamic SVG Charts
* **FontAwesome 6** Icons

### Backend
* **Node.js** & **Express.js** REST API server
* **JSON Web Token (JWT)** for stateless auth session management
* **BcryptJS** for secure password encryption

### Database
* **MySQL** (MySQL2 driver with connection pooling & async/await support)

---

## 📂 Project Structure

```text
Finance Tracker/
├── config/
│   └── db.js                 # MySQL pool connection setup
├── controllers/
│   ├── authController.js     # Signup, login, password reset logic
│   ├── transactionController.js # CRUD operations for transactions
│   ├── budgetController.js   # Overall and category budget management
│   └── activityController.js # Activity log retrieval
├── middleware/
│   └── authMiddleware.js     # JWT authorization middleware
├── routes/
│   ├── authRoutes.js         # /api/auth routes
│   ├── transactionRoutes.js  # /api/transactions routes
│   ├── budgetRoutes.js       # /api/budgets routes
│   └── activityRoutes.js     # /api/activity routes
├── utils/
│   └── activityLogger.js     # MySQL activity audit logger helper
├── Pulse Finance/            # Static Frontend Application Assets
│   ├── index.html            # Landing / Marketing Page
│   ├── login.html            # User Login Page
│   ├── forgot-password.html  # Password Reset Page
│   ├── sign-up.html          # Registration Page
│   └── Personal-Finance-Tracker-main/ # Main App Dashboard & Tracker
│       ├── index.html        # App Shell & Dashboard Layout
│       ├── css/custom.css    # Tracker styles & Doughnut Chart Widget
│       └── js/app.js         # Frontend Logic & API Integration
├── schema.sql                # MySQL Database Schema Creation Script
├── server.js                 # Express Application Entry Point
├── package.json              # Project Dependencies & Scripts
├── .env.example              # Sample Environment Variables
└── .gitignore                # Git Excluded Files (node_modules, .env)
```

---

## 🚀 Getting Started

### 1. Prerequisites
* **Node.js** (v16 or higher)
* **MySQL Server** (XAMPP, WAMP, or standalone MySQL Server)

### 2. Database Setup
Create the MySQL database using the provided schema:
```bash
mysql -u root -p < schema.sql
```

### 3. Environment Configuration
Create a `.env` file in the root directory (refer to `.env.example`):
```env
PORT=3000
JWT_SECRET=pulse_finance_super_secret_jwt_key_2026

# MySQL Database Configuration
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=pulse_finance
```

### 4. Install Dependencies
```bash
npm install
```

### 5. Run the Application
For production:
```bash
npm start
```

For development with live-reloading:
```bash
npm run dev
```

Visit the application at: `http://localhost:3000`  
Health Check API: `http://localhost:3000/api/health`

---

## 📝 Future Enhancements
* Email verification and OTP password reset.
* Dark / Light mode toggle.
* Recurring automatic transaction scheduling.
* Multi-currency conversion support.

---

## 📄 License
This project is licensed under the ISC License.
