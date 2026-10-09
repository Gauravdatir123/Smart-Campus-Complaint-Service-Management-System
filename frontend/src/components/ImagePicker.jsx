import { useEffect, useRef, useState } from "react";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

// Chooses one image, validates it client-side (the server validates again) and shows a preview.
// `existingUrl` is an already-uploaded image that can be kept or removed.
export default function ImagePicker({ file, onChange, existingUrl = "", onRemoveExisting, label = "Photo" }) {
    const inputRef = useRef(null);
    const [error, setError] = useState("");
    const [preview, setPreview] = useState("");

    useEffect(() => {
        if (!file) { setPreview(""); return undefined; }
        const url = URL.createObjectURL(file);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    const pick = (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        if (!TYPES.includes(f.type)) { setError("Use a JPG, PNG or WEBP image."); e.target.value = ""; return; }
        if (f.size > MAX_BYTES) { setError("The image must be smaller than 5 MB."); e.target.value = ""; return; }
        setError("");
        onChange(f);
    };

    const clear = () => {
        onChange(null);
        if (inputRef.current) inputRef.current.value = "";
    };

    const shown = preview || existingUrl;

    return (
        <div className="field">
            <span className="field-label">{label}</span>
            {shown ? (
                <div className="image-preview">
                    <img src={shown} alt="Selected evidence" />
                    <div className="image-preview-actions">
                        <button type="button" className="btn btn-ghost" onClick={() => inputRef.current?.click()}>Replace</button>
                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => { if (preview) clear(); else onRemoveExisting?.(); }}
                        >
                            Remove
                        </button>
                    </div>
                </div>
            ) : (
                <button type="button" className="dropzone" onClick={() => inputRef.current?.click()}>
                    <strong>Add a photo</strong>
                    <span className="muted">JPG, PNG or WEBP, up to 5 MB</span>
                </button>
            )}
            <input ref={inputRef} type="file" accept={TYPES.join(",")} onChange={pick} hidden />
            {error && <span className="field-error">{error}</span>}
        </div>
    );
}
