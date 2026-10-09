import { useState } from "react";
import { complaintApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import useFetch from "../hooks/useFetch";
import ComplaintList from "../components/ComplaintList";
import { ErrorState, Loader, PageHeader, StatCard } from "../components/ui";

const TABS = [
    { key: "assigned", label: "To accept" },
    { key: "in_progress", label: "In progress" },
    { key: "resolved", label: "Waiting for confirmation" },
    { key: "", label: "Everything" }
];

function StaffDashboard() {
    const { user } = useAuth();
    const [tab, setTab] = useState("assigned");
    const { data, loading, error, reload } = useFetch(() => complaintApi.stats(), []);
    const s = data?.data;

    return (
        <>
            <PageHeader
                title="My workload"
                subtitle={user.department?.name ? `Complaints for ${user.department.name}` : "You are not part of a department yet. Ask an administrator to add you."}
            />

            {loading && !s && <Loader />}
            {error && <ErrorState message={error} onRetry={reload} />}

            {s && (
                <div className="stats">
                    <StatCard label="Waiting to be accepted" value={s.byStatus.assigned} tone="blue" />
                    <StatCard label="In progress" value={s.byStatus.in_progress} tone="amber" />
                    <StatCard label="Waiting for student" value={s.byStatus.resolved} tone="green" />
                    <StatCard label="Closed" value={s.byStatus.closed} />
                </div>
            )}

            <div className="tabs" role="tablist">
                {TABS.map((t) => (
                    <button
                        key={t.label}
                        role="tab"
                        aria-selected={tab === t.key}
                        className={`tab ${tab === t.key ? "active" : ""}`}
                        onClick={() => setTab(t.key)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* key remounts the list so the chosen tab becomes its starting filter */}
            <ComplaintList
                key={tab}
                showStudent
                initialFilters={{ status: tab }}
                emptyTitle="Nothing here"
                emptyText="No complaints in this group right now."
            />
        </>
    );
}

export default StaffDashboard;
