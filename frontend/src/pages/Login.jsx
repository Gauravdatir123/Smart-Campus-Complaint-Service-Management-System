import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthShell from "../components/AuthShell";
import { Field } from "../components/ui";
import { ROLE_HOME } from "../utils/constants";
import { errorMessage, fieldErrors } from "../utils/format";

function Login() {
    const { user, login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [form, setForm] = useState({ email: "", password: "" });
    const [error, setError] = useState("");
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);

    if (user) return <Navigate to={ROLE_HOME[user.role]} replace />;

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        setErrors({});
        try {
            const loggedIn = await login(form.email, form.password);
            navigate(location.state?.from || ROLE_HOME[loggedIn.role], { replace: true });
        } catch (err) {
            setErrors(fieldErrors(err));
            setError(errorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <AuthShell
            title="Log in"
            subtitle="Use the email you registered with."
            footer={<>New here? <Link to="/register">Create a student account</Link></>}
        >
            <form onSubmit={handleSubmit} className="form" noValidate>
                {error && <div className="alert alert-error" role="alert">{error}</div>}
                <Field label="Email" error={errors.email}>
                    <input className="input" type="email" name="email" autoComplete="email" value={form.email}
                        onChange={handleChange} placeholder="you@college.edu" required />
                </Field>
                <Field label="Password" error={errors.password}>
                    <input className="input" type="password" name="password" autoComplete="current-password" value={form.password}
                        onChange={handleChange} required />
                </Field>
                <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
                    {busy ? "Logging in..." : "Log in"}
                </button>
            </form>
        </AuthShell>
    );
}

export default Login;
