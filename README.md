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
## Screenshots

### Patient Portal

![Patient Portal](<img width="702" height="828" alt="image" src="https://github.com/user-attachments/assets/ac49b55d-c9be-4db5-b5bd-28c5a5b36dfc" />
)

### Admin Dashboard

![Admin Dashboard](<img width="915" height="648" alt="image" src="https://github.com/user-attachments/assets/84fdffeb-a92a-480a-94c1-d76a4229ef70" />
)

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
