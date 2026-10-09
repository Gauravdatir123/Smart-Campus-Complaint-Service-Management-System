import { STATUSES, labelOf } from "../utils/constants";
import { formatDateTime } from "../utils/format";

export default function Timeline({ history = [] }) {
    if (!history.length) return null;
    // newest first
    const items = [...history].reverse();
    return (
        <ul className="timeline">
            {items.map((h, i) => (
                <li key={`${h.at}-${i}`} className={`timeline-item status-${h.status}`}>
                    <div className="timeline-head">
                        <strong>{labelOf(STATUSES, h.status)}</strong>
                        <span className="muted">{formatDateTime(h.at)}</span>
                    </div>
                    {h.changedBy?.name && (
                        <div className="muted small">by {h.changedBy.name} ({h.changedBy.role})</div>
                    )}
                    {h.comment && <p className="timeline-comment">{h.comment}</p>}
                </li>
            ))}
        </ul>
    );
}
