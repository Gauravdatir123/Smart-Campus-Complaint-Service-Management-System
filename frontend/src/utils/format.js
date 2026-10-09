export const ticketId = (id = "") => `#${String(id).slice(-6).toUpperCase()}`;

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("en-IN", {
    day: "numeric", month: "short", hour: "numeric", minute: "2-digit"
});

export const formatDate = (d) => (d ? dateFmt.format(new Date(d)) : "-");
export const formatDateTime = (d) => (d ? dateTimeFmt.format(new Date(d)) : "-");

export const timeAgo = (d) => {
    const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (s < 60) return "just now";
    const m = Math.floor(s / 60);
    if (m < 60) return `${m} min ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} hr ago`;
    const days = Math.floor(h / 24);
    if (days < 30) return `${days} day${days > 1 ? "s" : ""} ago`;
    return formatDate(d);
};

export const formatHours = (h) => {
    if (h === null || h === undefined) return "-";
    if (h < 1) return `${Math.round(h * 60)} min`;
    if (h < 48) return `${h} hr`;
    return `${Math.round((h / 24) * 10) / 10} days`;
};

// Pull a readable message out of an axios error
export const errorMessage = (err, fallback = "Something went wrong. Please try again.") => {
    const data = err?.response?.data;
    if (data?.errors && typeof data.errors === "object") {
        const first = Object.values(data.errors)[0];
        if (first) return String(first);
    }
    return data?.message || (err?.code === "ERR_NETWORK" ? "Cannot reach the server. Is the backend running?" : fallback);
};

export const fieldErrors = (err) => err?.response?.data?.errors || {};
