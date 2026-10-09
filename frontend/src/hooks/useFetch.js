import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "../utils/format";

// Runs an async loader and tracks { data, loading, error }. Call reload() to refetch.
// Re-runs automatically when `deps` change; stale responses are ignored.
export default function useFetch(loader, deps = []) {
    const [state, setState] = useState({ data: null, loading: true, error: "" });
    const run = useRef(0);
    const loaderRef = useRef(loader);
    loaderRef.current = loader;

    const load = useCallback(async () => {
        const id = ++run.current;
        setState((s) => ({ ...s, loading: true, error: "" }));
        try {
            const data = await loaderRef.current();
            if (id === run.current) setState({ data, loading: false, error: "" });
        } catch (err) {
            if (id === run.current) setState({ data: null, loading: false, error: errorMessage(err) });
        }
    }, []);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { load(); }, deps);

    return { ...state, reload: load };
}
