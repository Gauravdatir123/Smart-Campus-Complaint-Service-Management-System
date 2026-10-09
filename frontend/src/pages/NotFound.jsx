import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLE_HOME } from "../utils/constants";

function Screen({ code, title, text }) {
    const { user } = useAuth();
    return (
        <div className="page-center">
            <div className="notfound">
                <div className="notfound-code">{code}</div>
                <h1>{title}</h1>
                <p className="muted">{text}</p>
                <Link className="btn btn-primary" to={user ? ROLE_HOME[user.role] : "/"}>
                    {user ? "Back to my dashboard" : "Back to home"}
                </Link>
            </div>
        </div>
    );
}

export const NotFound = () => (
    <Screen code="404" title="This page does not exist" text="The link may be wrong or the page may have moved." />
);

export const Unauthorized = () => (
    <Screen code="403" title="You do not have access to this page" text="This area is for a different type of account." />
);
