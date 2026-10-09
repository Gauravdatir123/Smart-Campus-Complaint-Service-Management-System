// Mirrors backend/utils/constants.js - keep both in sync.
export const CATEGORIES = [
    { value: "electrical", label: "Electrical" },
    { value: "water", label: "Water & plumbing" },
    { value: "wifi", label: "Wi-Fi & network" },
    { value: "hostel", label: "Hostel" },
    { value: "cleanliness", label: "Cleanliness" },
    { value: "library", label: "Library" },
    { value: "transport", label: "Transport" },
    { value: "equipment", label: "Equipment" },
    { value: "other", label: "Other" }
];

export const PRIORITIES = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
    { value: "critical", label: "Critical" }
];

export const STATUSES = [
    { value: "submitted", label: "Submitted" },
    { value: "assigned", label: "Assigned" },
    { value: "in_progress", label: "In progress" },
    { value: "resolved", label: "Resolved" },
    { value: "closed", label: "Closed" }
];

// Which status changes each role can make (same rules the API enforces).
export const TRANSITIONS = {
    staff: {
        assigned: ["in_progress"],
        in_progress: ["resolved"],
        resolved: ["in_progress"]
    },
    student: {
        resolved: ["closed", "in_progress"]
    },
    admin: {
        assigned: ["in_progress", "resolved", "closed"],
        in_progress: ["resolved", "closed"],
        resolved: ["closed", "in_progress"],
        submitted: ["closed"]
    }
};

export const ROLE_HOME = { student: "/student", staff: "/staff", admin: "/admin" };

export const labelOf = (list, value) => list.find((i) => i.value === value)?.label || value;
