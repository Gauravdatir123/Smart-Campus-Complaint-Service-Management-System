import { useEffect } from "react";

export function Loader({ label = "Loading" }) {
    return (
        <div className="loader" role="status" aria-label={label}>
            <span className="spinner" />
            <span>{label}...</span>
        </div>
    );
}

export function ErrorState({ message, onRetry }) {
    return (
        <div className="state state-error" role="alert">
            <p>{message}</p>
            {onRetry && <button className="btn btn-ghost" onClick={onRetry}>Try again</button>}
        </div>
    );
}

export function EmptyState({ title, children, action }) {
    return (
        <div className="state">
            <h3>{title}</h3>
            {children && <p>{children}</p>}
            {action}
        </div>
    );
}

export function StatCard({ label, value, tone = "", hint }) {
    return (
        <div className={`stat ${tone ? `stat-${tone}` : ""}`}>
            <div className="stat-value">{value}</div>
            <div className="stat-label">{label}</div>
            {hint && <div className="stat-hint">{hint}</div>}
        </div>
    );
}

export function PageHeader({ title, subtitle, children }) {
    return (
        <header className="page-header">
            <div>
                <h1>{title}</h1>
                {subtitle && <p className="muted">{subtitle}</p>}
            </div>
            {children && <div className="page-actions">{children}</div>}
        </header>
    );
}

export function Modal({ title, onClose, children }) {
    useEffect(() => {
        const onKey = (e) => e.key === "Escape" && onClose();
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onClose]);

    return (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
                <div className="modal-head">
                    <h2>{title}</h2>
                    <button className="icon-btn" onClick={onClose} aria-label="Close">×</button>
                </div>
                {children}
            </div>
        </div>
    );
}

export function Field({ label, error, hint, children }) {
    return (
        <label className={`field ${error ? "has-error" : ""}`}>
            <span className="field-label">{label}</span>
            {children}
            {hint && !error && <span className="field-hint">{hint}</span>}
            {error && <span className="field-error">{error}</span>}
        </label>
    );
}

export function Pagination({ pagination, onPage }) {
    if (!pagination || pagination.pages <= 1) return null;
    const { page, pages, total } = pagination;
    return (
        <nav className="pagination" aria-label="Pagination">
            <button className="btn btn-ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
            <span className="muted">Page {page} of {pages} ({total} complaints)</span>
            <button className="btn btn-ghost" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
        </nav>
    );
}
