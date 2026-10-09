import { useState } from "react";
import { authApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Field, PageHeader } from "../components/ui";
import { errorMessage, fieldErrors, formatDate } from "../utils/format";

function Profile() {
    const { user, setUser } = useAuth();
    const toast = useToast();
    const [name, setName] = useState(user.name);
    const [pw, setPw] = useState({ currentPassword: "", newPassword: "" });
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        setErrors({});
        try {
            const body = { name };
            if (pw.newPassword) Object.assign(body, pw);
            const res = await authApi.updateMe(body);
            setUser(res.user);
            setPw({ currentPassword: "", newPassword: "" });
            toast.success("Profile saved");
        } catch (err) {
            setErrors(fieldErrors(err));
            toast.error(errorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <PageHeader title="Profile" subtitle="Your account details." />
            <form className="form card form-wide" onSubmit={submit} noValidate>
                <dl className="kvs">
                    <div className="kv"><dt>Email</dt><dd>{user.email}</dd></div>
                    <div className="kv"><dt>Role</dt><dd>{user.role}</dd></div>
                    {user.department?.name && <div className="kv"><dt>Department</dt><dd>{user.department.name}</dd></div>}
                    <div className="kv"><dt>Member since</dt><dd>{formatDate(user.createdAt)}</dd></div>
                </dl>

                <Field label="Name" error={errors.name}>
                    <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
                </Field>

                <h2>Change password</h2>
                <Field label="Current password" error={errors.currentPassword}>
                    <input className="input" type="password" autoComplete="current-password" value={pw.currentPassword}
                        onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
                </Field>
                <Field label="New password" error={errors.newPassword} hint="Leave empty to keep your current password.">
                    <input className="input" type="password" autoComplete="new-password" value={pw.newPassword}
                        onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
                </Field>

                <div className="form-actions">
                    <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Saving..." : "Save changes"}</button>
                </div>
            </form>
        </>
    );
}

export default Profile;
