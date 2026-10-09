import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const nextId = useRef(1);

    const remove = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

    const push = useCallback((message, type = "success") => {
        const id = nextId.current++;
        setToasts((t) => [...t, { id, message, type }]);
        setTimeout(() => remove(id), 4500);
    }, [remove]);

    const api = useMemo(() => ({
        success: (m) => push(m, "success"),
        error: (m) => push(m, "error")
    }), [push]);

    return (
        <ToastContext.Provider value={api}>
            {children}
            <div className="toasts" role="status" aria-live="polite">
                {toasts.map((t) => (
                    <div key={t.id} className={`toast toast-${t.type}`}>
                        <span>{t.message}</span>
                        <button className="toast-close" onClick={() => remove(t.id)} aria-label="Dismiss">×</button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
    return ctx;
};
