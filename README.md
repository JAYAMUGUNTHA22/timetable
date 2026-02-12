# College Timetable Generator

A full-stack, rule-based, admin-driven scheduling application that generates separate timetables for each department and section with no faculty clashes.

## Tech Stack

- **Frontend:** React.js (.js), CSS
- **Backend:** Node.js (Express)
- **Database:** MongoDB

## Features

- **Academic Configuration:** Working days (default Mon–Sat), periods per day (default 7), optional break periods
- **Departments:** Department ID, name, number of sections per department
- **Subjects:** Name, semester, department, periods per week, assigned faculty
- **Faculty:** ID, name, home department, subjects handled, max periods per day/week
- **Timetable Generation:** Global faculty availability; department-wise generation; clash detection; admin notification on unplaceable slots
- **Output:** Separate timetable per department and section; Day × Period grid; faculty name and subject per cell; stored in DB; admin can edit or regenerate

## Prerequisites

- Node.js 
- MongoDB 

## Setup

### 1. Backend

cd backend
npm install

Create a `.env` file 
PORT=5000
MONGODB_URI=mongodb://localhost:27017/college_timetable

Start the server:

npm start


### 2. Frontend

cd client
npm install
npm start

The app runs at http://localhost:3000. The API runs at http://localhost:5000.

### 3. MongoDB

Ensure MongoDB is running. If using a remote URI, set `MONGODB_URI` in `backend/.env`.

## Usage

1. **Academic Config** — Set working days and periods per day.
2. **Departments** — Add departments and section count for each.
3. **Faculty** — Add faculty with home department, subjects handled, and max periods per day/week.
4. **Subjects** — Add subjects per semester/department; assign faculty and periods per week.
5. **Timetables** — Choose semester and click "Generate / Regenerate". View each timetable and edit slots if needed.

## API Endpoints

- `GET/PUT /api/config` — Academic configuration
- `GET/POST /api/departments` — List, create departments
- `GET/PUT/DELETE /api/departments/:id` — Department by ID
- `GET/POST /api/subjects` — List, create subjects (query: semester, department)
- `GET/PUT/DELETE /api/subjects/:id` — Subject by ID
- `GET/POST /api/faculty` — List, create faculty
- `GET/PUT/DELETE /api/faculty/:id` — Faculty by ID
- `GET /api/timetables` — List timetables (query: semester, department)
- `GET /api/timetables/:id` — Timetable by ID
- `POST /api/timetables/generate` — Generate timetables (body: `{ "semester": 1 }`)
- `PUT /api/timetables/:id/slot` — Update a slot (body: dayIndex, periodIndex, subject, faculty, subjectName, facultyName)
- `DELETE /api/timetables/semester/:semester` — Delete all timetables for a semester

## Scheduling Rules

- One faculty per time slot globally (no clashes).
- Faculty can teach multiple departments on the same day in different periods.
- Break periods are not used.
- Weekly subject period requirements are satisfied when possible.
- Faculty workload limits (max per day/week) are enforced.
- If no valid slot exists for a subject, the admin is notified in generation errors.
