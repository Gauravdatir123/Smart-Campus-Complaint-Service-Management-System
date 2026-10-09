import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { notificationApi } from "../services/api";
import { timeAgo } from "../utils/format";

export default function NotificationBell() {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [unread, setUnread] = useState(0);
    const ref = useRef(null);
    const navigate = useNavigate();

    const load = useCallback(async () => {
        try {
            const res = await notificationApi.list();
            setItems(res.data);
            setUnread(res.unread);
        } catch { /* a failed poll should never bother the user */ }
    }, []);

    // Load now and poll every 30 seconds
    useEffect(() => {
        load();
        const t = setInterval(load, 30000);
        return () => clearInterval(t);
    }, [load]);

    // Close on outside click
    useEffect(() => {
        if (!open) return undefined;
        const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, [open]);

    const openItem = async (n) => {
        setOpen(false);
        if (!n.isRead) {
            notificationApi.markRead(n._id).then(load).catch(() => {});
        }
        if (n.complaintId) navigate(`/complaints/${n.complaintId}`);
    };

    const markAll = async () => {
        await notificationApi.markAllRead().catch(() => {});
        load();
    };

    return (
        <div className="bell" ref={ref}>
            <button
                className="icon-btn bell-btn"
                onClick={() => { setOpen((o) => !o); if (!open) load(); }}
                aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
                aria-expanded={open}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z" />
                    <path d="M10 20a2 2 0 0 0 4 0" />
                </svg>
                {unread > 0 && <span className="bell-count">{unread > 9 ? "9+" : unread}</span>}
            </button>

            {open && (
                <div className="bell-panel">
                    <div className="bell-head">
                        <strong>Notifications</strong>
                        {unread > 0 && <button className="link-btn" onClick={markAll}>Mark all read</button>}
                    </div>
                    {items.length === 0 ? (
                        <p className="muted bell-empty">Nothing yet. Updates on your complaints will show up here.</p>
                    ) : (
                        <ul>
                            {items.map((n) => (
                                <li key={n._id}>
                                    <button className={`bell-item ${n.isRead ? "" : "unread"}`} onClick={() => openItem(n)}>
                                        <span>{n.message}</span>
                                        <span className="muted small">{timeAgo(n.createdAt)}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
