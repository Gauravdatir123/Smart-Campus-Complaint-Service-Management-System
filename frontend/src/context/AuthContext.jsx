import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authApi, setUnauthorizedHandler, tokenStore } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(Boolean(tokenStore.get())); // true while we validate a saved token

    const logout = useCallback(() => {
        tokenStore.clear();
        setUser(null);
    }, []);

    // On first load: if a token is saved, ask the API who it belongs to
    useEffect(() => {
        setUnauthorizedHandler(logout);
        if (!tokenStore.get()) return;
        authApi
            .me()
            .then((res) => setUser(res.user))
            .catch(() => tokenStore.clear())
            .finally(() => setLoading(false));
    }, [logout]);

    const login = useCallback(async (email, password) => {
        const res = await authApi.login({ email, password });
        tokenStore.set(res.token);
        setUser(res.user);
        return res.user;
    }, []);

    const register = useCallback(async (name, email, password) => {
        const res = await authApi.register({ name, email, password });
        tokenStore.set(res.token);
        setUser(res.user);
        return res.user;
    }, []);

    const value = useMemo(
        () => ({ user, loading, login, register, logout, setUser }),
        [user, loading, login, register, logout]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
    return ctx;
};
