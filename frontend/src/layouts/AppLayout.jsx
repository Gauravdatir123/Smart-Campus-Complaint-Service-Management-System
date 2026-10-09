import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "../components/NotificationBell";

const NAV = {
    student: [
        { to: "/student", label: "Dashboard", end: true },
        { to: "/student/new", label: "New complaint" },
        { to: "/student/complaints", label: "My complaints" }
    ],
    staff: [
        { to: "/staff", label: "My workload", end: true }
    ],
    admin: [
        { to: "/admin", label: "Dashboard", end: true },
        { to: "/admin/complaints", label: "Complaints" },
        { to: "/admin/users", label: "Users" },
        { to: "/admin/departments", label: "Departments" }
    ]
};

export default function AppLayout() {
    const { user, logout } = useAuth();
    const [open, setOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    // close the mobile menu after navigating
    useEffect(() => { setOpen(false); }, [location.pathname]);

    const signOut = () => {
        logout();
        navigate("/login");
    };

    return (
        <div className="shell">
            <aside className={`sidebar ${open ? "open" : ""}`}>
                <div className="brand">
                    <span className="brand-mark" aria-hidden="true" />
                    <span>Smart Campus</span>
                </div>

                <nav className="nav" aria-label="Main">
                    {NAV[user.role].map((item) => (
                        <NavLink key={item.to} to={item.to} end={item.end} className="nav-link">
                            {item.label}
                        </NavLink>
                    ))}
                    <NavLink to="/profile" className="nav-link">Profile</NavLink>
                </nav>

                <div className="sidebar-foot">
                    <div className="who">
                        <strong>{user.name}</strong>
                        <span>{user.role}{user.department?.name ? `, ${user.department.name}` : ""}</span>
                    </div>
                    <button className="btn btn-sidebar" onClick={signOut}>Log out</button>
                </div>
            </aside>

            {open && <div className="scrim" onClick={() => setOpen(false)} />}

            <div className="main">
                <header className="topbar">
                    <button className="icon-btn menu-btn" onClick={() => setOpen(true)} aria-label="Open menu">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                            <path d="M4 7h16M4 12h16M4 17h16" />
                        </svg>
                    </button>
                    <span className="topbar-brand">Smart Campus</span>
                    <div className="topbar-right">
                        <NotificationBell />
                    </div>
                </header>
                <main className="content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
