import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthShell from "../components/AuthShell";
import { Field } from "../components/ui";
import { ROLE_HOME } from "../utils/constants";
import { errorMessage, fieldErrors } from "../utils/format";

function Register() {
    const { user, register } = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ name: "", email: "", password: "", confirm: "" });
    const [error, setError] = useState("");
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);

    if (user) return <Navigate to={ROLE_HOME[user.role]} replace />;

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (formData.password !== formData.confirm) {
            setErrors({ confirm: "Passwords do not match" });
            return;
        }

        setBusy(true);
        setErrors({});
        try {
            const created = await register(formData.name, formData.email, formData.password);
            navigate(ROLE_HOME[created.role], { replace: true });
        } catch (err) {
            setErrors(fieldErrors(err));
            setError(errorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <AuthShell
            title="Create your account"
            subtitle="Student accounts only. Staff accounts are created by an administrator."
            footer={<>Already registered? <Link to="/login">Log in</Link></>}
        >
            <form onSubmit={handleSubmit} className="form" noValidate>
                {error && <div className="alert alert-error" role="alert">{error}</div>}

                <Field label="Full name" error={errors.name}>
                    <input className="input" type="text" name="name" autoComplete="name" placeholder="Enter your name"
                        value={formData.name} onChange={handleChange} required />
                </Field>

                <Field label="Email" error={errors.email}>
                    <input className="input" type="email" name="email" autoComplete="email" placeholder="Enter your email"
                        value={formData.email} onChange={handleChange} required />
                </Field>

                <Field label="Password" error={errors.password} hint="At least 6 characters">
                    <input className="input" type="password" name="password" autoComplete="new-password" placeholder="Enter your password"
                        value={formData.password} onChange={handleChange} required minLength={6} />
                </Field>

                <Field label="Confirm password" error={errors.confirm}>
                    <input className="input" type="password" name="confirm" autoComplete="new-password"
                        value={formData.confirm} onChange={handleChange} required />
                </Field>

                <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
                    {busy ? "Creating account..." : "Create account"}
                </button>
            </form>
        </AuthShell>
    );
}

export default Register;
