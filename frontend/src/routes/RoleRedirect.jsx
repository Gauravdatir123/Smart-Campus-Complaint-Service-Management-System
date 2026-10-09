import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLE_HOME } from "../utils/constants";

// /dashboard sends each role to its own home page
export default function RoleRedirect() {
    const { user } = useAuth();
    return <Navigate to={user ? ROLE_HOME[user.role] : "/login"} replace />;
}
