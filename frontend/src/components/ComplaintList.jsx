import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { complaintApi } from "../services/api";
import useFetch from "../hooks/useFetch";
import useDebounce from "../hooks/useDebounce";
import { CATEGORIES, PRIORITIES, STATUSES, labelOf } from "../utils/constants";
import { ticketId, timeAgo } from "../utils/format";
import { StatusBadge, PriorityBadge } from "./Badges";
import { EmptyState, ErrorState, Loader, Pagination } from "./ui";

const EMPTY = { search: "", status: "", category: "", priority: "", department: "" };

/**
 * Searchable, filterable, paginated list of complaints. The API decides what each role may see.
 *
 * props:
 *  - departments   : [{_id, name}]  show a department filter when provided
 *  - showStudent   : show who reported it
 *  - initialFilters: starting filter values
 *  - hideFilters   : compact mode for dashboards (no filter bar)
 *  - pageSize      : rows per page (default 10)
 *  - renderAction  : (complaint, reload) => node   extra per-row controls (e.g. admin "Assign")
 *  - refreshKey    : change it to force a reload
 *  - emptyTitle / emptyText / emptyAction
 */
export default function ComplaintList({
    departments,
    showStudent = false,
    initialFilters = {},
    hideFilters = false,
    pageSize = 10,
    renderAction,
    refreshKey = 0,
    emptyTitle = "No complaints found",
    emptyText = "Nothing to show here yet.",
    emptyAction
}) {
    const [filters, setFilters] = useState({ ...EMPTY, ...initialFilters });
    const [page, setPage] = useState(1);
    const debouncedSearch = useDebounce(filters.search, 400);

    // Any filter change goes back to page 1
    useEffect(() => { setPage(1); }, [debouncedSearch, filters.status, filters.category, filters.priority, filters.department]);

    const { data, loading, error, reload } = useFetch(() => {
        const params = { page, limit: pageSize };
        if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
        ["status", "category", "priority", "department"].forEach((k) => { if (filters[k]) params[k] = filters[k]; });
        return complaintApi.list(params);
    }, [page, debouncedSearch, filters.status, filters.category, filters.priority, filters.department, refreshKey]);

    const set = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));
    const filtered = !hideFilters && Object.values(filters).some(Boolean);

    return (
        <section>
            {!hideFilters && <div className="filters">
                <input
                    type="search"
                    className="input filters-search"
                    placeholder="Search title or description"
                    value={filters.search}
                    onChange={set("search")}
                    aria-label="Search complaints"
                />
                <select className="input" value={filters.status} onChange={set("status")} aria-label="Filter by status">
                    <option value="">All statuses</option>
                    {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <select className="input" value={filters.category} onChange={set("category")} aria-label="Filter by category">
                    <option value="">All categories</option>
                    {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <select className="input" value={filters.priority} onChange={set("priority")} aria-label="Filter by priority">
                    <option value="">All priorities</option>
                    {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
                {departments && (
                    <select className="input" value={filters.department} onChange={set("department")} aria-label="Filter by department">
                        <option value="">All departments</option>
                        {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                    </select>
                )}
                {filtered && (
                    <button className="btn btn-ghost" onClick={() => setFilters({ ...EMPTY })}>Clear filters</button>
                )}
            </div>}

            {loading && !data && <Loader label="Loading complaints" />}
            {error && <ErrorState message={error} onRetry={reload} />}

            {data && data.data.length === 0 && (
                <EmptyState title={emptyTitle} action={filtered ? null : emptyAction}>
                    {filtered ? "No complaint matches these filters. Try changing or clearing them." : emptyText}
                </EmptyState>
            )}

            {data && data.data.length > 0 && (
                <ul className={`c-list ${loading ? "is-loading" : ""}`}>
                    {data.data.map((c) => (
                        <li key={c._id} className={`c-row status-edge-${c.status}`}>
                            <Link to={`/complaints/${c._id}`} className="c-main">
                                <span className="c-title">
                                    <span className="ticket">{ticketId(c._id)}</span>
                                    {c.title}
                                </span>
                                <span className="c-meta">
                                    <span>{labelOf(CATEGORIES, c.category)}</span>
                                    {showStudent && c.studentId?.name && <span>by {c.studentId.name}</span>}
                                    {c.department?.name && <span>{c.department.name}</span>}
                                    {c.assignedTo?.name && <span>handled by {c.assignedTo.name}</span>}
                                    <span>{timeAgo(c.createdAt)}</span>
                                </span>
                            </Link>
                            <div className="c-side">
                                <PriorityBadge priority={c.priority} />
                                <StatusBadge status={c.status} />
                                {renderAction && renderAction(c, reload)}
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            <Pagination pagination={data?.pagination} onPage={setPage} />
        </section>
    );
}
