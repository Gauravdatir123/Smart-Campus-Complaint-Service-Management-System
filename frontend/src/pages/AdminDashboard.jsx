import { Link } from "react-router-dom";
import {
    Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
    ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import { adminApi } from "../services/api";
import useFetch from "../hooks/useFetch";
import ComplaintList from "../components/ComplaintList";
import { ErrorState, Loader, PageHeader, StatCard } from "../components/ui";
import { CATEGORIES, STATUSES, labelOf } from "../utils/constants";
import { formatHours } from "../utils/format";

const STATUS_COLORS = {
    submitted: "#7A8794",
    assigned: "#2F6FDB",
    in_progress: "#D9941E",
    resolved: "#2E8B57",
    closed: "#0F2740"
};
const NAVY = "#0F2740";
const SIGNAL = "#F2B705";

function ChartCard({ title, children, empty }) {
    return (
        <section className="panel chart-card">
            <h2>{title}</h2>
            {empty ? <p className="muted">No data yet.</p> : <div className="chart-box">{children}</div>}
        </section>
    );
}

function AdminDashboard() {
    const { data, loading, error, reload } = useFetch(() => adminApi.dashboard(), []);

    if (loading && !data) return <Loader label="Loading dashboard" />;
    if (error) return <ErrorState message={error} onRetry={reload} />;
    if (!data) return null;

    const d = data.data;
    const categoryData = d.byCategory.map((c) => ({ ...c, name: labelOf(CATEGORIES, c.name) }));
    const statusData = STATUSES.map((s) => ({ key: s.value, name: s.label, value: d.byStatus[s.value] })).filter((s) => s.value > 0);

    return (
        <>
            <PageHeader title="Dashboard" subtitle="How campus issues are being handled." />

            <div className="stats">
                <StatCard label="Total complaints" value={d.totals.total} />
                <StatCard label="Pending (not started)" value={d.totals.pending} tone="blue" />
                <StatCard label="In progress" value={d.totals.inProgress} tone="amber" />
                <StatCard label="Resolved or closed" value={d.totals.resolved} tone="green" />
                <StatCard label="Open high or critical" value={d.totals.highCritical} tone="red" />
                <StatCard label="Resolution rate" value={`${d.resolutionRate}%`} />
                <StatCard label="Average resolution time" value={formatHours(d.avgResolutionHours)} />
                <StatCard
                    label="Average rating"
                    value={d.avgRating ? `${d.avgRating} / 5` : "-"}
                    hint={d.ratingCount ? `${d.ratingCount} review${d.ratingCount > 1 ? "s" : ""}` : "No reviews yet"}
                />
            </div>

            <div className="charts">
                <ChartCard title="Complaints per month" empty={d.totals.total === 0}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={d.monthlyTrend} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                            <CartesianGrid stroke="#E3E8ED" vertical={false} />
                            <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                            <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                            <Tooltip />
                            <Line type="monotone" dataKey="count" name="Complaints" stroke={NAVY} strokeWidth={3} dot={{ r: 4, fill: SIGNAL, stroke: NAVY, strokeWidth: 2 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="By status" empty={statusData.length === 0}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={statusData} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2}>
                                {statusData.map((s) => <Cell key={s.key} fill={STATUS_COLORS[s.key]} />)}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" iconType="circle" />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="By category" empty={categoryData.length === 0}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                            <CartesianGrid stroke="#E3E8ED" horizontal={false} />
                            <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                            <YAxis type="category" dataKey="name" width={110} tickLine={false} axisLine={false} fontSize={12} />
                            <Tooltip cursor={{ fill: "rgba(15,39,64,0.05)" }} />
                            <Bar dataKey="count" name="Complaints" fill={NAVY} radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="By department" empty={d.byDepartment.length === 0}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={d.byDepartment} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                            <CartesianGrid stroke="#E3E8ED" horizontal={false} />
                            <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                            <YAxis type="category" dataKey="name" width={130} tickLine={false} axisLine={false} fontSize={12} />
                            <Tooltip cursor={{ fill: "rgba(15,39,64,0.05)" }} />
                            <Bar dataKey="count" name="Complaints" fill={SIGNAL} stroke={NAVY} radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>

            <section className="panel">
                <div className="panel-head">
                    <h2>Waiting to be assigned</h2>
                    <Link to="/admin/complaints">All complaints</Link>
                </div>
                <ComplaintList
                    hideFilters
                    showStudent
                    pageSize={5}
                    initialFilters={{ status: "submitted" }}
                    emptyTitle="Everything has been assigned"
                    emptyText="New complaints will show up here."
                />
            </section>
        </>
    );
}

export default AdminDashboard;
