import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import StatusTrack from "../components/StatusTrack";
import { ROLE_HOME } from "../utils/constants";

function Home() {
    const { user } = useAuth();

    return (
        <div className="home">
            <header className="home-nav">
                <div className="brand brand-dark">
                    <span className="brand-mark" aria-hidden="true" />
                    <span>Smart Campus</span>
                </div>
                <nav className="home-nav-links">
                    {user ? (
                        <Link className="btn btn-primary" to={ROLE_HOME[user.role]}>Open my dashboard</Link>
                    ) : (
                        <>
                            <Link className="btn btn-ghost" to="/login">Log in</Link>
                            <Link className="btn btn-primary" to="/register">Sign up</Link>
                        </>
                    )}
                </nav>
            </header>

            <section className="hero">
                <div className="hero-copy">
                    <h1>Report it once. Watch it get fixed.</h1>
                    <p>
                        Students report broken equipment, Wi-Fi dead zones, leaking taps and anything else that
                        needs fixing. The right department picks it up, and everyone sees where it stands.
                    </p>
                    <div className="hero-cta">
                        <Link className="btn btn-primary btn-lg" to={user ? "/student/new" : "/register"}>Report a problem</Link>
                        {!user && <Link className="btn btn-ghost btn-lg" to="/login">I already have an account</Link>}
                    </div>
                </div>

                <figure className="ticket-demo" aria-label="Example complaint">
                    <div className="ticket-demo-head">
                        <span className="ticket">#4F2A1C</span>
                        <span className="badge priority-high">High</span>
                    </div>
                    <h3>Ceiling fan not working in room 12</h3>
                    <p className="muted">Hostel block B, reported yesterday at 6:40 pm</p>
                    <StatusTrack status="in_progress" />
                    <div className="ticket-demo-note">
                        <strong>Electrical team</strong>
                        <span>Accepted the job and ordered a replacement capacitor.</span>
                    </div>
                </figure>
            </section>

            <section className="roles">
                <div>
                    <h2>Students</h2>
                    <p>Describe the problem, attach a photo, and follow every step until it is closed. Rate the fix afterwards.</p>
                </div>
                <div>
                    <h2>Staff</h2>
                    <p>See only the complaints that belong to your department, update their status and upload proof of the repair.</p>
                </div>
                <div>
                    <h2>Administrators</h2>
                    <p>Assign work, set priorities and watch resolution rates, response times and trends across campus.</p>
                </div>
            </section>

            <footer className="home-foot">
                <span>Smart Campus Complaint and Service Management System</span>
            </footer>
        </div>
    );
}

export default Home;
