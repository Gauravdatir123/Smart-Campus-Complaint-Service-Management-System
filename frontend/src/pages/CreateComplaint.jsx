import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { complaintApi } from "../services/api";
import { useToast } from "../context/ToastContext";
import useFetch from "../hooks/useFetch";
import ImagePicker from "../components/ImagePicker";
import { ErrorState, Field, Loader, PageHeader } from "../components/ui";
import { CATEGORIES, PRIORITIES } from "../utils/constants";
import { errorMessage, fieldErrors } from "../utils/format";

const BLANK = { title: "", category: "", priority: "medium", description: "" };

// One form for both "report a problem" (/student/new) and "edit" (/student/complaints/:id/edit)
function CreateComplaint() {
    const { id } = useParams();
    const editing = Boolean(id);
    const navigate = useNavigate();
    const toast = useToast();

    const [form, setForm] = useState(BLANK);
    const [file, setFile] = useState(null);
    const [existingUrl, setExistingUrl] = useState("");
    const [removeImage, setRemoveImage] = useState(false);
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);

    const { data, loading, error, reload } = useFetch(
        () => (editing ? complaintApi.get(id) : Promise.resolve(null)),
        [id]
    );

    // Fill the form once the complaint to edit has loaded
    useEffect(() => {
        const c = data?.data;
        if (!c) return;
        setForm({ title: c.title, category: c.category, priority: c.priority, description: c.description });
        setExistingUrl(c.imageUrl || "");
    }, [data]);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setBusy(true);
        setErrors({});
        try {
            const fields = { ...form, ...(removeImage ? { removeImage: "true" } : {}) };
            const res = editing
                ? await complaintApi.update(id, fields, file)
                : await complaintApi.create(fields, file);
            toast.success(editing ? "Changes saved" : "Complaint submitted. We will notify you as it moves along.");
            navigate(`/complaints/${res.data._id}`);
        } catch (err) {
            setErrors(fieldErrors(err));
            toast.error(errorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    if (editing && loading && !data) return <Loader />;
    if (editing && error) return <ErrorState message={error} onRetry={reload} />;
    if (editing && data?.data && data.data.status !== "submitted") {
        return (
            <div className="state">
                <h3>This complaint can no longer be edited</h3>
                <p>It has already been assigned, so the details are locked.</p>
                <Link className="btn btn-primary" to={`/complaints/${id}`}>Back to the complaint</Link>
            </div>
        );
    }

    return (
        <>
            <PageHeader
                title={editing ? "Edit complaint" : "Report a problem"}
                subtitle={editing ? "You can change the details until the complaint is assigned." : "Tell us what is wrong and where. A clear description gets it fixed faster."}
            />
            <form className="form card form-wide" onSubmit={handleSubmit} noValidate>
                <Field label="Short title" error={errors.title} hint="For example: Ceiling fan not working in room 12">
                    <input className="input" name="title" value={form.title} onChange={handleChange} maxLength={120} required />
                </Field>

                <div className="form-row">
                    <Field label="Category" error={errors.category}>
                        <select className="input" name="category" value={form.category} onChange={handleChange} required>
                            <option value="" disabled>Choose a category</option>
                            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                    </Field>
                    <Field label="How urgent is it?" error={errors.priority}>
                        <select className="input" name="priority" value={form.priority} onChange={handleChange}>
                            {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </select>
                    </Field>
                </div>

                <Field label="What happened?" error={errors.description} hint="Include the building, floor or room, and when it started.">
                    <textarea className="input" name="description" rows={5} value={form.description}
                        onChange={handleChange} maxLength={2000} required />
                </Field>

                <ImagePicker
                    label="Photo (optional)"
                    file={file}
                    onChange={(f) => { setFile(f); if (f) setRemoveImage(false); }}
                    existingUrl={removeImage ? "" : existingUrl}
                    onRemoveExisting={() => { setRemoveImage(true); setExistingUrl(""); }}
                />

                <div className="form-actions">
                    <Link className="btn btn-ghost" to={editing ? `/complaints/${id}` : "/student"}>Cancel</Link>
                    <button className="btn btn-primary" type="submit" disabled={busy}>
                        {busy ? "Saving..." : editing ? "Save changes" : "Submit complaint"}
                    </button>
                </div>
            </form>
        </>
    );
}

export default CreateComplaint;
