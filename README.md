# Smart Campus Complaint & Service Management System

A MERN-style web app where students report campus problems, staff resolve them, and administrators
monitor the whole process. Images are stored on **Cloudinary**; only their URL and public id are kept in MongoDB.

**Stack:** React 19 (Vite), React Router, Axios, Recharts - Node.js, Express 5, MongoDB/Mongoose 9, JWT, bcrypt, Multer, Cloudinary.

```
smart-campus/
  backend/    Express REST API   (config, controllers, middleware, models, routes, utils, scripts, tests)
  frontend/   React app          (components, pages, layouts, routes, services, context, hooks, utils)
```

## 1. Run it locally

You need Node.js 20.19+ (or 22+) and a MongoDB (local install or a free MongoDB Atlas cluster).

### Backend
```bash
cd backend
cp .env.example .env        # then edit it (see below)
npm install
npm run seed                # creates departments, an admin, one staff per department, a demo student
npm run dev                 # API on http://localhost:5000
```

`.env` values:

| Variable | Meaning |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Long random string used to sign tokens |
| `CLIENT_URL` | Frontend origin(s) allowed by CORS, comma-separated (`http://localhost:5173`) |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | From https://cloudinary.com/console. Without them everything works except photo upload (the API answers 503 with a clear message). |

### Frontend
```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173  (Vite proxies /api to localhost:5000)
```

### Demo accounts (created by `npm run seed`, password `Password@123`)

| Role | Email |
|---|---|
| Admin | `admin@campus.test` |
| Staff (Electrical) | `staff.electrical@campus.test` (one per department, e.g. `staff.it.network@campus.test`) |
| Student | `student@campus.test` |

Change these before deploying. Public registration always creates a **student**; admins create staff on the *Users* page.

## 2. What it does

**Workflow:** Submitted -> Assigned -> In progress -> Resolved -> Closed (then feedback). Each step is stored in the
complaint's `statusHistory` with who did it, and `createdAt / assignedAt / resolvedAt / closedAt` are recorded so the
dashboard can compute average resolution time.

| Role | Can do |
|---|---|
| Student | Register/login, report a complaint with photo, edit/delete it until it is assigned, track the timeline, confirm or reject the fix, rate the result |
| Staff | See their department's complaints, accept work, resolve with a comment and proof photo |
| Admin | Dashboard + charts, assign complaints to a department/staff, change priority, manage users (create, edit, deactivate, delete), manage departments, delete inappropriate records |

Also included: search + filters (category, status, priority, department) with pagination, in-app notifications
(bell with unread count), responsive layout, profile page with password change.

### Allowed status changes (enforced by the API, mirrored in the UI)

| Role | From -> To |
|---|---|
| Staff | assigned -> in_progress, in_progress -> resolved, resolved -> in_progress |
| Student (owner) | resolved -> closed, resolved -> in_progress (needs a reason) |
| Admin | assigned/in_progress -> in_progress, resolved, closed; resolved -> closed or back to in_progress; submitted -> closed |

Assigning (submitted -> assigned) goes through the dedicated assign endpoint.

## 3. REST API

All routes except register/login need `Authorization: Bearer <token>`. Errors look like
`{ "success": false, "message": "...", "errors": { "field": "..." } }`.

| Module | Method | Endpoint | Who |
|---|---|---|---|
| Auth | POST | `/api/auth/register` | public (creates a student) |
| Auth | POST | `/api/auth/login` | public |
| Auth | GET / PUT | `/api/auth/me` | any (PUT: name, password) |
| Complaints | POST | `/api/complaints` (multipart, field `image`) | student |
| Complaints | GET | `/api/complaints?search&status&category&priority&department&sort&page&limit` | any (scoped by role) |
| Complaints | GET | `/api/complaints/stats` | any (counts by status, scoped by role) |
| Complaints | GET | `/api/complaints/:id` | owner / department staff / admin |
| Complaints | PUT | `/api/complaints/:id` | student (until assigned) / admin (priority, category) |
| Complaints | PUT | `/api/complaints/:id/status` (multipart: `status`, `comment`, optional `image`) | student / staff / admin |
| Complaints | DELETE | `/api/complaints/:id` | student (until assigned) / admin |
| Admin | GET | `/api/admin/dashboard` | admin |
| Admin | PUT | `/api/admin/complaints/:id/assign` `{department, assignedTo?}` | admin |
| Admin | PUT | `/api/admin/complaints/:id/status` | admin |
| Admin | GET/POST/PUT/DELETE | `/api/admin/users[/:id]` | admin |
| Departments | GET | `/api/departments` | any |
| Departments | POST/PUT/DELETE | `/api/departments[/:id]` | admin |
| Feedback | POST | `/api/feedback` `{complaintId, rating 1-5, comment}` | student (once, after resolution) |
| Feedback | GET | `/api/feedback/:complaintId` | owner / staff / admin |
| Notifications | GET, PUT | `/api/notifications`, `/:id/read`, `/read-all` | any |

## 4. Design decisions worth knowing (good interview material)

- **Role escalation is impossible from the client:** `register` ignores any `role` in the body.
- **Authorization is checked on the server for every action**, not just hidden in the UI. Staff only reach complaints of their department; students only their own.
- **`Department.staffIds`** from the guide is implemented as a *virtual populate* over `User.department`, so the two can never disagree.
- **Image flow:** multer keeps the file in memory -> streamed to Cloudinary -> `imageUrl` + `imagePublicId` saved. Old images are deleted from Cloudinary when replaced or when the complaint is deleted; an upload is rolled back if saving the complaint fails. Only JPG/PNG/WEBP up to 5 MB are accepted.
- **Input hardening:** all inputs are type-checked (blocks NoSQL operator injection), search text is regex-escaped, ids are validated, `helmet` + CORS allow-list + rate limiting on login/register, passwords hashed with bcrypt and never returned.
- **Errors:** one central error middleware turns validation, duplicate-key, cast, multer and JWT errors into clean JSON.
- **Token storage:** the JWT is kept in `localStorage` (simple, fine for a college project). For a high-security deployment, prefer an httpOnly cookie.

## 5. Tests

```bash
cd backend
npm test        # 24 end-to-end API tests (needs a reachable MongoDB; override with TEST_MONGO_URI)
```
The suite covers auth, role-based access, the full status workflow, uploads (Cloudinary is stubbed), feedback, search/pagination, dashboard numbers, user/department management and CORS.

## 6. Deployment

**Backend (Render / Railway):** root directory `backend`, build `npm install`, start `npm start`.
Set `MONGO_URI` (Atlas), `JWT_SECRET`, `NODE_ENV=production`, the three `CLOUDINARY_*` values, and
`CLIENT_URL=https://<your-frontend-domain>`. Run `npm run seed` once (locally with the production `MONGO_URI`) or create the first admin yourself.

**Frontend (Vercel / Netlify):** root directory `frontend`, build `npm run build`, output `dist`.
Set `VITE_API_URL=https://<your-backend-domain>/api`. `vercel.json` / `public/_redirects` already make page refreshes work with React Router.

## 7. Final checklist

- [x] React frontend connected to backend, MongoDB connected, env variables
- [x] JWT authentication + role-based authorization
- [x] Complaint CRUD, Cloudinary upload, admin assignment, staff status workflow
- [x] Search/filter, dashboard with charts, feedback, notifications
- [x] Validation + error handling, responsive UI
- [ ] Push to GitHub, deploy, add screenshots to this README, practise the interview explanation
