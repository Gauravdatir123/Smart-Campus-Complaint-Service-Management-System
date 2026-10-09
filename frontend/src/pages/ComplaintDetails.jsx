import { Link, useNavigate, useParams } from "react-router-dom";
import { complaintApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import useFetch from "../hooks/useFetch";
import { PriorityBadge, StatusBadge } from "../components/Badges";
import ComplaintActions from "../components/ComplaintActions";
import StarRating from "../components/StarRating";
import StatusTrack from "../components/StatusTrack";
import Timeline from "../components/Timeline";
import { ErrorState, Loader } from "../components/ui";
import { CATEGORIES, ROLE_HOME, labelOf } from "../utils/constants";
import { formatDateTime, ticketId } from "../utils/format";

function Row({ label, children }) {
    return (
        <div className="kv">
            <dt>{label}</dt>
            <dd>{children || "-"}</dd>
        </div>
    );
}

function ComplaintDetails() {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const { data, loading, error, reload } = useFetch(() => complaintApi.get(id), [id]);

    const back = () => navigate(user.role === "student" ? "/student/complaints" : user.role === "admin" ? "/admin/complaints" : ROLE_HOME.staff);

    if (loading && !data) return <Loader label="Loading complaint" />;
    if (error) {
        return (
            <>
                <button className="link-btn" onClick={back}>Back to the list</button>
                <ErrorState message={error} onRetry={reload} />
            </>
        );
    }
    if (!data) return null;

    const c = data.data;
    const feedback = data.feedback;

    // When did each stage last happen? (shown under the status track)
    const times = {};
    c.statusHistory.forEach((h) => { times[h.status] = h.at; });

    return (
        <>
            <button className="link-btn back" onClick={back}>Back to the list</button>

            <header className="detail-head">
                <div>
                    <div className="detail-id">
                        <span className="ticket">{ticketId(c._id)}</span>
                        <StatusBadge status={c.status} />
                        <PriorityBadge priority={c.priority} />
                    </div>
                    <h1>{c.title}</h1>
                </div>
            </header>

            <section className="panel track-panel">
                <StatusTrack status={c.status} times={times} />
            </section>

            <div className="detail-grid">
                <div className="detail-main">
                    <section className="panel">
                        <h2>What was reported</h2>
                        <p className="prose">{c.description}</p>
                        {c.imageUrl && (
                            <a href={c.imageUrl} target="_blank" rel="noreferrer" className="evidence">
                                <img src={c.imageUrl} alt="Evidence uploaded with the complaint" />
                            </a>
                        )}
                    </section>

                    {(c.resolutionComment || c.resolutionImageUrl) && ["resolved", "closed"].includes(c.status) && (
                        <section className="panel panel-resolved">
                            <h2>How it was resolved</h2>
                            {c.resolutionComment && <p className="prose">{c.resolutionComment}</p>}
                            {c.resolutionImageUrl && (
                                <a href={c.resolutionImageUrl} target="_blank" rel="noreferrer" className="evidence">
                                    <img src={c.resolutionImageUrl} alt="Proof of the repair" />
                                </a>
                            )}
                        </section>
                    )}

                    {feedback && (
                        <section className="panel">
                            <h2>Student feedback</h2>
                            <StarRating value={feedback.rating} />
                            {feedback.comment && <p className="prose">{feedback.comment}</p>}
                            <p className="muted small">{feedback.studentId?.name}, {formatDateTime(feedback.createdAt)}</p>
                        </section>
                    )}

                    <section className="panel">
                        <h2>History</h2>
                        <Timeline history={c.statusHistory} />
                    </section>
                </div>

                <aside className="detail-side">
                    <section className="panel">
                        <h2>Details</h2>
                        <dl className="kvs">
                            <Row label="Category">{labelOf(CATEGORIES, c.category)}</Row>
                            <Row label="Reported by">{c.studentId?.name}</Row>
                            <Row label="Department">{c.department?.name}</Row>
                            <Row label="Handled by">{c.assignedTo?.name}</Row>
                            <Row label="Reported">{formatDateTime(c.createdAt)}</Row>
                            {c.assignedAt && <Row label="Assigned">{formatDateTime(c.assignedAt)}</Row>}
                            {c.resolvedAt && <Row label="Resolved">{formatDateTime(c.resolvedAt)}</Row>}
                            {c.closedAt && <Row label="Closed">{formatDateTime(c.closedAt)}</Row>}
                        </dl>
                    </section>

                    <section className="panel">
                        <h2>{user.role === "student" ? "What you can do" : "Actions"}</h2>
                        <ComplaintActions complaint={c} feedback={feedback} reload={reload} />
                    </section>
                </aside>
            </div>

            {user.role === "admin" && (
                <p className="muted small"><Link to="/admin/complaints">All complaints</Link></p>
            )}
        </>
    );
}

export default ComplaintDetails;
