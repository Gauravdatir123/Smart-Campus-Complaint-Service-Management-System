import { labelOf } from "../utils/constants";
import { PRIORITIES, STATUSES } from "../utils/constants";

export function StatusBadge({ status }) {
    return <span className={`badge status-${status}`}>{labelOf(STATUSES, status)}</span>;
}

export function PriorityBadge({ priority }) {
    return <span className={`badge priority-${priority}`}>{labelOf(PRIORITIES, priority)}</span>;
}
