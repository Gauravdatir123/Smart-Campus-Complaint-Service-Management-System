import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loader } from "../components/ui";

// <ProtectedRoute roles={["admin"]}> ... </ProtectedRoute>
// Not logged in -> /login. Logged in with the wrong role -> /unauthorized.
export default function ProtectedRoute({ roles }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) return <div className="page-center"><Loader label="Checking your session" /></div>;
    if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    if (roles && !roles.includes(user.role)) return <Navigate to="/unauthorized" replace />;
    return <Outlet />;
}
