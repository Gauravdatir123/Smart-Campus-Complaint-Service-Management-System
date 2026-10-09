import { useState } from "react";
import { adminApi } from "../services/api";
import { useToast } from "../context/ToastContext";
import { Field } from "./ui";
import { errorMessage, fieldErrors } from "../utils/format";

// Admin: pick a department (and optionally one staff member) for a complaint.
// `departments` must be the admin department list, which includes each department's staff.
export default function AssignForm({ complaint, departments, onDone }) {
    const toast = useToast();
    const [department, setDepartment] = useState(complaint.department?._id || "");
    const [staff, setStaff] = useState(complaint.assignedTo?._id || "");
    const [busy, setBusy] = useState(false);
    const [errors, setErrors] = useState({});

    const dept = departments.find((d) => d._id === department);
    const staffOptions = (dept?.staff || []).filter((s) => s.isActive !== false);

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        setErrors({});
        try {
            await adminApi.assign(complaint._id, { department, assignedTo: staff || undefined });
            toast.success("Complaint assigned");
            onDone();
        } catch (err) {
            setErrors(fieldErrors(err));
            toast.error(errorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <form className="form" onSubmit={submit}>
            <Field label="Department" error={errors.department}>
                <select className="input" value={department} onChange={(e) => { setDepartment(e.target.value); setStaff(""); }} required>
                    <option value="" disabled>Choose a department</option>
                    {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                </select>
            </Field>
            <Field label="Staff member" error={errors.assignedTo} hint="Leave empty to let any staff member of the department accept it.">
                <select className="input" value={staff} onChange={(e) => setStaff(e.target.value)} disabled={!department}>
                    <option value="">Anyone in the department</option>
                    {staffOptions.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
            </Field>
            <button className="btn btn-primary" type="submit" disabled={busy || !department}>
                {busy ? "Assigning..." : complaint.department ? "Reassign" : "Assign"}
            </button>
        </form>
    );
}
