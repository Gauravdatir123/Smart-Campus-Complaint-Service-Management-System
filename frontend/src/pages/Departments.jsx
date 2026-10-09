import { useState } from "react";
import { departmentApi } from "../services/api";
import { useToast } from "../context/ToastContext";
import useFetch from "../hooks/useFetch";
import { EmptyState, ErrorState, Field, Loader, Modal, PageHeader } from "../components/ui";
import { errorMessage, fieldErrors } from "../utils/format";

function DepartmentForm({ department, onDone }) {
    const toast = useToast();
    const [form, setForm] = useState({ name: department?.name || "", description: department?.description || "" });
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        setErrors({});
        try {
            if (department) await departmentApi.update(department._id, form);
            else await departmentApi.create(form);
            toast.success(department ? "Department updated" : "Department created");
            onDone();
        } catch (err) {
            setErrors(fieldErrors(err));
            toast.error(errorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <form className="form" onSubmit={submit} noValidate>
            <Field label="Name" error={errors.name}>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="What does it handle?" error={errors.description}>
                <textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={300} />
            </Field>
            <div className="form-actions">
                <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Saving..." : "Save"}</button>
            </div>
        </form>
    );
}

function Departments() {
    const toast = useToast();
    const { data, loading, error, reload } = useFetch(() => departmentApi.list(), []);
    const [modal, setModal] = useState(null); // null | "new" | department
    const list = data?.data || [];

    const remove = async (d) => {
        if (!window.confirm(`Delete the ${d.name} department?`)) return;
        try {
            await departmentApi.remove(d._id);
            toast.success("Department deleted");
            reload();
        } catch (err) { toast.error(errorMessage(err)); }
    };

    return (
        <>
            <PageHeader title="Departments" subtitle="Complaints are assigned to a department, then handled by its staff.">
                <button className="btn btn-primary" onClick={() => setModal("new")}>Add department</button>
            </PageHeader>

            {loading && !data && <Loader />}
            {error && <ErrorState message={error} onRetry={reload} />}
            {data && list.length === 0 && (
                <EmptyState title="No departments yet">Create one so you can assign complaints.</EmptyState>
            )}

            <div className="cards">
                {list.map((d) => (
                    <article key={d._id} className="panel dept">
                        <h2>{d.name}</h2>
                        <p className="muted">{d.description || "No description"}</p>
                        <div>
                            <strong className="small">Staff ({d.staff?.length || 0})</strong>
                            {d.staff?.length ? (
                                <ul className="plain-list">
                                    {d.staff.map((s) => (
                                        <li key={s._id} className={s.isActive ? "" : "row-muted"}>
                                            {s.name} <span className="muted small">{s.email}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : <p className="muted small">No staff yet. Add them on the Users page.</p>}
                        </div>
                        <div className="form-actions">
                            <button className="btn btn-ghost btn-sm" onClick={() => setModal(d)}>Edit</button>
                            <button className="btn btn-danger-ghost btn-sm" onClick={() => remove(d)}>Delete</button>
                        </div>
                    </article>
                ))}
            </div>

            {modal && (
                <Modal title={modal === "new" ? "Add department" : `Edit ${modal.name}`} onClose={() => setModal(null)}>
                    <DepartmentForm
                        department={modal === "new" ? null : modal}
                        onDone={() => { setModal(null); reload(); }}
                    />
                </Modal>
            )}
        </>
    );
}

export default Departments;
