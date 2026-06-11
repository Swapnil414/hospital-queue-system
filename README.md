# Hospital Queue Management System (HQMS)

A full-stack Hospital Queue Management System built using **React, Express.js, MySQL, and JWT Authentication**.

## Features

### Patient Portal

* Book appointments online
* Select appointment date and time slot
* Real-time slot availability
* Automatic token generation
* Queue position tracking

### Admin Dashboard

* Secure admin login using JWT
* View daily patient queue
* Call next patient
* Skip patients
* Restore skipped patients
* Mark consultations as completed
* View all patient records

## Tech Stack

### Frontend

* React
* JavaScript
* CSS

### Backend

* Node.js
* Express.js
* JWT Authentication

### Database

* MySQL

## Project Structure

```text
hospital-queue-system/
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── server.js
├── db.js
├── package.json
└── .gitignore
```

## Environment Variables

Backend `.env`

```env
ADMIN_USERNAME=your_admin_username
ADMIN_PASSWORD=your_admin_password
JWT_SECRET=your_jwt_secret
PORT=8000

DB_HOST=your_database_host
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=your_database_name
```

Frontend `.env`

```env
REACT_APP_API_URL=http://localhost:8000
```

## Installation

### Backend

```bash
npm install
node server.js
```

### Frontend

```bash
cd frontend
npm install
npm start
```

## Future Improvements

* Patient authentication
* Appointment cancellation
* Doctor dashboard
* SMS/Email notifications
* Analytics dashboard
* Search and filtering

## Author

Swapnil Sinha

Built as a full-stack web development project for learning backend development, database management, authentication, and deployment workflows.
