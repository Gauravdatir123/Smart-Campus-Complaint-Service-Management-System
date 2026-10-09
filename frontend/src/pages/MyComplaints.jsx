import { Link } from "react-router-dom";
import ComplaintList from "../components/ComplaintList";
import { PageHeader } from "../components/ui";

function MyComplaints() {
    return (
        <>
            <PageHeader title="My complaints" subtitle="Everything you have reported, newest first.">
                <Link className="btn btn-primary" to="/student/new">Report a problem</Link>
            </PageHeader>
            <ComplaintList
                emptyTitle="You have not reported anything yet"
                emptyText="When something on campus needs fixing, report it and track it here."
                emptyAction={<Link className="btn btn-primary" to="/student/new">Report a problem</Link>}
            />
        </>
    );
}

export default MyComplaints;
