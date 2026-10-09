import { STATUSES } from "../utils/constants";
import { formatDate } from "../utils/format";

// The work-order track: one stop per workflow stage, filled up to the current one.
// `times` is an optional { status: ISODate } map shown under each reached stage.
export default function StatusTrack({ status, times = {}, compact = false }) {
    const current = STATUSES.findIndex((s) => s.value === status);

    return (
        <ol className={`track ${compact ? "track-compact" : ""}`} aria-label={`Status: ${status}`}>
            {STATUSES.map((s, i) => {
                const state = i < current ? "done" : i === current ? "current" : "todo";
                return (
                    <li key={s.value} className={`track-step track-${state}`} aria-current={state === "current" ? "step" : undefined}>
                        <span className="track-dot" />
                        <span className="track-label">{s.label}</span>
                        {!compact && times[s.value] && <span className="track-time">{formatDate(times[s.value])}</span>}
                    </li>
                );
            })}
        </ol>
    );
}
