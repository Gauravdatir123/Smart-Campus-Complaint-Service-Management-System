import { Link } from "react-router-dom";

// Shared frame for the login / register pages
export default function AuthShell({ title, subtitle, children, footer }) {
    return (
        <div className="auth">
            <aside className="auth-side">
                <Link to="/" className="brand brand-light">
                    <span className="brand-mark" aria-hidden="true" />
                    <span>Smart Campus</span>
                </Link>
                <div className="auth-pitch">
                    <h2>Broken fan in room 12? Say it once and watch it get fixed.</h2>
                    <p>Every complaint has an owner, a status and a history, so nothing gets lost in a group chat.</p>
                </div>
            </aside>
            <main className="auth-main">
                <div className="auth-card">
                    <h1>{title}</h1>
                    {subtitle && <p className="muted">{subtitle}</p>}
                    {children}
                    {footer && <p className="auth-footer">{footer}</p>}
                </div>
            </main>
        </div>
    );
}
