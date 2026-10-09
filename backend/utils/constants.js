// Single source of truth for enums shared by models, validation and the API.
const ROLES = ["student", "staff", "admin"];

const CATEGORIES = [
    "electrical",
    "water",
    "wifi",
    "hostel",
    "cleanliness",
    "library",
    "transport",
    "equipment",
    "other"
];

const PRIORITIES = ["low", "medium", "high", "critical"];

const STATUSES = ["submitted", "assigned", "in_progress", "resolved", "closed"];

// Which status changes each role may make through the status endpoint.
// (Assigning - submitted -> assigned - is done through the dedicated assign endpoint.)
const TRANSITIONS = {
    staff: {
        assigned: ["in_progress"],
        in_progress: ["resolved"],
        resolved: ["in_progress"] // re-open own work if the fix did not hold
    },
    student: {
        resolved: ["closed", "in_progress"] // confirm the fix, or reject it
    },
    admin: {
        assigned: ["in_progress", "resolved", "closed"],
        in_progress: ["resolved", "closed"],
        resolved: ["closed", "in_progress"],
        submitted: ["closed"] // e.g. spam / duplicate
    }
};

module.exports = { ROLES, CATEGORIES, PRIORITIES, STATUSES, TRANSITIONS };
