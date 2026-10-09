import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute";
import RoleRedirect from "./routes/RoleRedirect";
import AppLayout from "./layouts/AppLayout";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import StudentDashboard from "./pages/StudentDashboard";
import CreateComplaint from "./pages/CreateComplaint";
import MyComplaints from "./pages/MyComplaints";
import ComplaintDetails from "./pages/ComplaintDetails";
import StaffDashboard from "./pages/StaffDashboard";
import { Loader } from "./components/ui";

// The dashboard pulls in the charting library, so load it only when an admin opens it
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
import ManageComplaints from "./pages/ManageComplaints";
import ManageUsers from "./pages/ManageUsers";
import Departments from "./pages/Departments";
import Profile from "./pages/Profile";
import { NotFound, Unauthorized } from "./pages/NotFound";

function App() {
    return (
        <Routes>
            {/* public */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* any logged-in user */}
            <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<RoleRedirect />} />
                <Route element={<AppLayout />}>
                    <Route path="/complaints/:id" element={<ComplaintDetails />} />
                    <Route path="/profile" element={<Profile />} />
                </Route>
            </Route>

            {/* students */}
            <Route element={<ProtectedRoute roles={["student"]} />}>
                <Route element={<AppLayout />}>
                    <Route path="/student" element={<StudentDashboard />} />
                    <Route path="/student/new" element={<CreateComplaint />} />
                    <Route path="/student/complaints" element={<MyComplaints />} />
                    <Route path="/student/complaints/:id/edit" element={<CreateComplaint />} />
                </Route>
            </Route>

            {/* staff */}
            <Route element={<ProtectedRoute roles={["staff"]} />}>
                <Route element={<AppLayout />}>
                    <Route path="/staff" element={<StaffDashboard />} />
                </Route>
            </Route>

            {/* admins */}
            <Route element={<ProtectedRoute roles={["admin"]} />}>
                <Route element={<AppLayout />}>
                    <Route path="/admin" element={<Suspense fallback={<Loader />}><AdminDashboard /></Suspense>} />
                    <Route path="/admin/complaints" element={<ManageComplaints />} />
                    <Route path="/admin/users" element={<ManageUsers />} />
                    <Route path="/admin/departments" element={<Departments />} />
                </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
        </Routes>
    );
}

export default App;
