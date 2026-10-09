import { useState } from "react";
import { departmentApi } from "../services/api";
import useFetch from "../hooks/useFetch";
import AssignForm from "../components/AssignForm";
import ComplaintList from "../components/ComplaintList";
import { Modal, PageHeader } from "../components/ui";

function ManageComplaints() {
    const { data } = useFetch(() => departmentApi.list(), []);
    const departments = data?.data || [];
    const [assigning, setAssigning] = useState(null); // complaint being assigned
    const [refreshKey, setRefreshKey] = useState(0);

    return (
        <>
            <PageHeader title="Complaints" subtitle="Every complaint on campus. Search, filter and assign work." />

            <ComplaintList
                showStudent
                departments={departments}
                refreshKey={refreshKey}
                renderAction={(c) =>
                    ["submitted", "assigned", "in_progress"].includes(c.status) ? (
                        <button className="btn btn-ghost btn-sm" onClick={() => setAssigning(c)}>
                            {c.department ? "Reassign" : "Assign"}
                        </button>
                    ) : null
                }
            />

            {assigning && (
                <Modal title={`Assign: ${assigning.title}`} onClose={() => setAssigning(null)}>
                    <AssignForm
                        complaint={assigning}
                        departments={departments}
                        onDone={() => { setAssigning(null); setRefreshKey((k) => k + 1); }}
                    />
                </Modal>
            )}
        </>
    );
}

export default ManageComplaints;
