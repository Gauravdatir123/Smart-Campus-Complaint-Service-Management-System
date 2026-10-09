import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { complaintApi, departmentApi, feedbackApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import useFetch from "../hooks/useFetch";
import AssignForm from "./AssignForm";
import ImagePicker from "./ImagePicker";
import StarRating from "./StarRating";
import { Field } from "./ui";
import { PRIORITIES, TRANSITIONS } from "../utils/constants";
import { errorMessage, fieldErrors } from "../utils/format";

// Runs an async action with a busy flag, toasts, and a reload of the page data afterwards.
function useAction(reload) {
    const toast = useToast();
    const [busy, setBusy] = useState(false);
    const run = async (fn, successMessage) => {
        setBusy(true);
        try {
            const result = await fn();
            if (successMessage) toast.success(successMessage);
            await reload();
            return result;
        } catch (err) {
            toast.error(errorMessage(err));
            return undefined;
        } finally {
            setBusy(false);
        }
    };
    return { busy, run };
}

// Staff / admin: mark as resolved with a description and an optional proof photo
function ResolveForm({ complaint, reload }) {
    const [comment, setComment] = useState("");
    const [file, setFile] = useState(null);
    const [errors, setErrors] = useState({});
    const { busy, run } = useAction(reload);

    const submit = async (e) => {
        e.preventDefault();
        setErrors({});
        // run() shows the error toast; we also keep the field error for the textarea
        await run(async () => {
            try {
                await complaintApi.setStatus(complaint._id, { status: "resolved", comment }, file);
            } catch (err) {
                setErrors(fieldErrors(err));
                throw err;
            }
        }, "Marked as resolved");
    };

    return (
        <form className="form" onSubmit={submit}>
            <Field label="How was it resolved?" error={errors.comment}>
                <textarea className="input" rows={4} value={comment} onChange={(e) => setComment(e.target.value)}
                    placeholder="What was wrong and what did you do?" required />
            </Field>
            <ImagePicker label="Proof photo (optional)" file={file} onChange={setFile} />
            <button className="btn btn-primary" type="submit" disabled={busy}>
                {busy ? "Saving..." : "Mark as resolved"}
            </button>
        </form>
    );
}

function StaffActions({ complaint, reload }) {
    const { user } = useAuth();
    const { busy, run } = useAction(reload);
    const allowed = TRANSITIONS.staff[complaint.status] || [];
    const ownerId = complaint.assignedTo?._id;

    if (ownerId && ownerId !== user._id) {
        return <p className="muted">This complaint is handled by {complaint.assignedTo.name}.</p>;
    }
    if (!allowed.length) {
        return <p className="muted">Nothing for you to do right now.</p>;
    }

    const setStatus = (status, success) => run(() => complaintApi.setStatus(complaint._id, { status }), success);

    return (
        <div className="action-stack">
            {allowed.includes("in_progress") && (
                <button className="btn btn-primary" disabled={busy} onClick={() => setStatus("in_progress", complaint.status === "resolved" ? "Work re-opened" : "You are now working on this")}>
                    {complaint.status === "resolved" ? "Re-open work" : "Accept and start work"}
                </button>
            )}
            {allowed.includes("resolved") && <ResolveForm complaint={complaint} reload={reload} />}
        </div>
    );
}

function StudentActions({ complaint, reload, feedback }) {
    const navigate = useNavigate();
    const toast = useToast();
    const { busy, run } = useAction(reload);
    const [rejecting, setRejecting] = useState(false);
    const [reason, setReason] = useState("");
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");

    const setStatus = (status, text, success) =>
        run(() => complaintApi.setStatus(complaint._id, { status, comment: text }), success);

    const remove = async () => {
        if (!window.confirm("Delete this complaint? This cannot be undone.")) return;
        const ok = await run(() => complaintApi.remove(complaint._id), "Complaint deleted");
        if (ok !== undefined) navigate("/student/complaints");
    };

    const sendFeedback = (e) => {
        e.preventDefault();
        if (!rating) { toast.error("Choose a star rating first"); return; }
        run(() => feedbackApi.create({ complaintId: complaint._id, rating, comment }), "Thank you for your feedback");
    };

    return (
        <div className="action-stack">
            {complaint.status === "submitted" && (
                <>
                    <Link className="btn btn-ghost" to={`/student/complaints/${complaint._id}/edit`}>Edit complaint</Link>
                    <button className="btn btn-danger-ghost" onClick={remove} disabled={busy}>Delete complaint</button>
                </>
            )}

            {complaint.status === "resolved" && !rejecting && (
                <>
                    <p>Staff say this is fixed. Is it?</p>
                    <button className="btn btn-primary" disabled={busy} onClick={() => setStatus("closed", "", "Complaint closed")}>
                        Yes, it is fixed
                    </button>
                    <button className="btn btn-ghost" disabled={busy} onClick={() => setRejecting(true)}>No, it is still a problem</button>
                </>
            )}

            {complaint.status === "resolved" && rejecting && (
                <form className="form" onSubmit={(e) => { e.preventDefault(); setStatus("in_progress", reason, "Sent back to the team"); }}>
                    <Field label="What is still wrong?">
                        <textarea className="input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} required />
                    </Field>
                    <div className="form-actions">
                        <button type="button" className="btn btn-ghost" onClick={() => setRejecting(false)}>Cancel</button>
                        <button className="btn btn-primary" type="submit" disabled={busy}>Send back</button>
                    </div>
                </form>
            )}

            {["resolved", "closed"].includes(complaint.status) && !feedback && (
                <form className="form feedback-form" onSubmit={sendFeedback}>
                    <h3>Rate the fix</h3>
                    <StarRating value={rating} onChange={setRating} size={30} />
                    <Field label="Comments (optional)">
                        <textarea className="input" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} />
                    </Field>
                    <button className="btn btn-primary" type="submit" disabled={busy}>Send feedback</button>
                </form>
            )}

            {complaint.status === "closed" && feedback && <p className="muted">This complaint is closed. Thanks for your feedback.</p>}
            {["assigned", "in_progress"].includes(complaint.status) && <p className="muted">The team is working on it. You will get a notification when it changes.</p>}
        </div>
    );
}

function AdminActions({ complaint, reload }) {
    const navigate = useNavigate();
    const { busy, run } = useAction(reload);
    const [showResolve, setShowResolve] = useState(false);
    const { data: deptData } = useFetch(() => departmentApi.list(), []);
    const departments = deptData?.data || [];
    const allowed = TRANSITIONS.admin[complaint.status] || [];
    const canAssign = ["submitted", "assigned", "in_progress"].includes(complaint.status);

    const setStatus = (status, success) => run(() => complaintApi.setStatus(complaint._id, { status }), success);
    const setPriority = (priority) => run(() => complaintApi.update(complaint._id, { priority }), "Priority updated");

    const remove = async () => {
        if (!window.confirm("Delete this complaint permanently, including its photos and feedback?")) return;
        const ok = await run(() => complaintApi.remove(complaint._id), "Complaint deleted");
        if (ok !== undefined) navigate("/admin/complaints");
    };

    return (
        <div className="action-stack">
            <Field label="Priority">
                <select className="input" value={complaint.priority} disabled={busy} onChange={(e) => setPriority(e.target.value)}>
                    {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
            </Field>

            {canAssign && (
                <div className="subpanel">
                    <h3>{complaint.department ? "Reassign" : "Assign to a department"}</h3>
                    {departments.length === 0
                        ? <p className="muted">Create a department first.</p>
                        : <AssignForm key={complaint.updatedAt} complaint={complaint} departments={departments} onDone={reload} />}
                </div>
            )}

            {allowed.includes("in_progress") && (
                <button className="btn btn-ghost" disabled={busy} onClick={() => setStatus("in_progress", "Moved to in progress")}>
                    {complaint.status === "resolved" ? "Re-open" : "Mark in progress"}
                </button>
            )}
            {allowed.includes("resolved") && !showResolve && (
                <button className="btn btn-ghost" disabled={busy} onClick={() => setShowResolve(true)}>Mark as resolved</button>
            )}
            {allowed.includes("resolved") && showResolve && <ResolveForm complaint={complaint} reload={reload} />}
            {allowed.includes("closed") && (
                <button className="btn btn-ghost" disabled={busy} onClick={() => setStatus("closed", "Complaint closed")}>Close complaint</button>
            )}

            <button className="btn btn-danger-ghost" disabled={busy} onClick={remove}>Delete complaint</button>
        </div>
    );
}

export default function ComplaintActions({ complaint, feedback, reload }) {
    const { user } = useAuth();
    if (user.role === "admin") return <AdminActions complaint={complaint} reload={reload} />;
    if (user.role === "staff") return <StaffActions complaint={complaint} reload={reload} />;
    return <StudentActions complaint={complaint} feedback={feedback} reload={reload} />;
}
