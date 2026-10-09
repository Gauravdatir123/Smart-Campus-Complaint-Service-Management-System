import { useState } from "react";
import { adminApi, departmentApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import useFetch from "../hooks/useFetch";
import useDebounce from "../hooks/useDebounce";
import { EmptyState, ErrorState, Field, Loader, Modal, PageHeader } from "../components/ui";
import { errorMessage, fieldErrors, formatDate } from "../utils/format";

const ROLES = ["student", "staff", "admin"];

function UserForm({ user, departments, onDone }) {
    const toast = useToast();
    const editing = Boolean(user);
    const [form, setForm] = useState({
        name: user?.name || "",
        email: user?.email || "",
        password: "",
        role: user?.role || "staff",
        department: user?.department?._id || ""
    });
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);

    const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        setErrors({});
        try {
            if (editing) {
                const body = { name: form.name, role: form.role, department: form.role === "staff" ? form.department : undefined };
                if (form.password) body.password = form.password;
                await adminApi.updateUser(user._id, body);
            } else {
                await adminApi.createUser({ ...form, department: form.role === "staff" ? form.department : undefined });
            }
            toast.success(editing ? "User updated" : "User created");
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
            <Field label="Full name" error={errors.name}>
                <input className="input" value={form.name} onChange={set("name")} required />
            </Field>
            <Field label="Email" error={errors.email}>
                <input className="input" type="email" value={form.email} onChange={set("email")} disabled={editing} required />
            </Field>
            <Field label={editing ? "New password (leave empty to keep)" : "Password"} error={errors.password}>
                <input className="input" type="password" value={form.password} onChange={set("password")} autoComplete="new-password" required={!editing} />
            </Field>
            <div className="form-row">
                <Field label="Role" error={errors.role}>
                    <select className="input" value={form.role} onChange={set("role")}>
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                </Field>
                {form.role === "staff" && (
                    <Field label="Department" error={errors.department}>
                        <select className="input" value={form.department} onChange={set("department")} required>
                            <option value="" disabled>Choose a department</option>
                            {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                        </select>
                    </Field>
                )}
            </div>
            <div className="form-actions">
                <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Saving..." : editing ? "Save changes" : "Create user"}</button>
            </div>
        </form>
    );
}

function ManageUsers() {
    const { user: me } = useAuth();
    const toast = useToast();
    const [role, setRole] = useState("");
    const [search, setSearch] = useState("");
    const debounced = useDebounce(search, 400);
    const [modal, setModal] = useState(null); // null | "new" | user object

    const { data: deptData } = useFetch(() => departmentApi.list(), []);
    const departments = deptData?.data || [];

    const { data, loading, error, reload } = useFetch(() => {
        const params = {};
        if (role) params.role = role;
        if (debounced.trim()) params.search = debounced.trim();
        return adminApi.users(params);
    }, [role, debounced]);
    const users = data?.data || [];

    const toggleActive = async (u) => {
        try {
            await adminApi.updateUser(u._id, { isActive: !u.isActive });
            toast.success(u.isActive ? "Account deactivated" : "Account reactivated");
            reload();
        } catch (err) { toast.error(errorMessage(err)); }
    };

    const remove = async (u) => {
        if (!window.confirm(`Delete ${u.name}? This cannot be undone.`)) return;
        try {
            await adminApi.deleteUser(u._id);
            toast.success("User deleted");
            reload();
        } catch (err) { toast.error(errorMessage(err)); }
    };

    return (
        <>
            <PageHeader title="Users" subtitle="Create staff accounts and manage who can sign in.">
                <button className="btn btn-primary" onClick={() => setModal("new")}>Add user</button>
            </PageHeader>

            <div className="filters">
                <input type="search" className="input filters-search" placeholder="Search by name or email"
                    value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search users" />
                <select className="input" value={role} onChange={(e) => setRole(e.target.value)} aria-label="Filter by role">
                    <option value="">All roles</option>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
            </div>

            {loading && !data && <Loader />}
            {error && <ErrorState message={error} onRetry={reload} />}
            {data && users.length === 0 && <EmptyState title="No users found">Try a different search.</EmptyState>}

            {users.length > 0 && (
                <ul className="c-list">
                    {users.map((u) => (
                        <li key={u._id} className={`c-row ${u.isActive ? "" : "row-muted"}`}>
                            <div className="c-main">
                                <span className="c-title">{u.name}</span>
                                <span className="c-meta">
                                    <span>{u.email}</span>
                                    {u.department?.name && <span>{u.department.name}</span>}
                                    <span>joined {formatDate(u.createdAt)}</span>
                                </span>
                            </div>
                            <div className="c-side">
                                <span className={`badge role-${u.role}`}>{u.role}</span>
                                {!u.isActive && <span className="badge status-submitted">Deactivated</span>}
                                <button className="btn btn-ghost btn-sm" onClick={() => setModal(u)}>Edit</button>
                                {u._id !== me._id && (
                                    <>
                                        <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(u)}>
                                            {u.isActive ? "Deactivate" : "Reactivate"}
                                        </button>
                                        <button className="btn btn-danger-ghost btn-sm" onClick={() => remove(u)}>Delete</button>
                                    </>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {modal && (
                <Modal title={modal === "new" ? "Add user" : `Edit ${modal.name}`} onClose={() => setModal(null)}>
                    <UserForm
                        user={modal === "new" ? null : modal}
                        departments={departments}
                        onDone={() => { setModal(null); reload(); }}
                    />
                </Modal>
            )}
        </>
    );
}

export default ManageUsers;
