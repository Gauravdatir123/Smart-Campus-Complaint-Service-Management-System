import { Link } from "react-router-dom";
import { complaintApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import useFetch from "../hooks/useFetch";
import ComplaintList from "../components/ComplaintList";
import { ErrorState, Loader, PageHeader, StatCard } from "../components/ui";

function StudentDashboard() {
    const { user } = useAuth();
    const { data, loading, error, reload } = useFetch(() => complaintApi.stats(), []);
    const s = data?.data;
    const open = s ? s.byStatus.submitted + s.byStatus.assigned + s.byStatus.in_progress : 0;

    return (
        <>
            <PageHeader title={`Hello, ${user.name.split(" ")[0]}`} subtitle="Here is where your complaints stand.">
                <Link className="btn btn-primary" to="/student/new">Report a problem</Link>
            </PageHeader>

            {loading && !s && <Loader />}
            {error && <ErrorState message={error} onRetry={reload} />}

            {s && (
                <div className="stats">
                    <StatCard label="Total reported" value={s.total} />
                    <StatCard label="Still open" value={open} tone="amber" />
                    <StatCard label="Waiting for your confirmation" value={s.byStatus.resolved} tone="green" />
                    <StatCard label="Closed" value={s.byStatus.closed} />
                </div>
            )}

            {s?.byStatus.resolved > 0 && (
                <section className="panel">
                    <h2>Please confirm these fixes</h2>
                    <p className="muted">Staff marked these as resolved. Open one to confirm it is fixed, or tell us it is not.</p>
                    <ComplaintList hideFilters pageSize={5} initialFilters={{ status: "resolved" }} />
                </section>
            )}

            <section className="panel">
                <div className="panel-head">
                    <h2>Recent complaints</h2>
                    <Link to="/student/complaints">View all</Link>
                </div>
                <ComplaintList
                    hideFilters
                    pageSize={5}
                    emptyTitle="You have not reported anything yet"
                    emptyText="When something on campus needs fixing, report it here and track it to the end."
                    emptyAction={<Link className="btn btn-primary" to="/student/new">Report a problem</Link>}
                />
            </section>
        </>
    );
}

export default StudentDashboard;
