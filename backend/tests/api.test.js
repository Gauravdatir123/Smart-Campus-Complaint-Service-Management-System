// End-to-end API tests. Run with:  npm test
// Needs a reachable MongoDB: set TEST_MONGO_URI (defaults to a local "smart_campus_test" database).
// Cloudinary is stubbed so no real account or network access is needed.
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret";
process.env.CLIENT_URL = "http://localhost:5173";

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

// ---- stub Cloudinary BEFORE the app (and its controllers) are loaded ----
const cloud = require("../utils/cloudinaryUpload");
const uploaded = [];
const deleted = [];
cloud.uploadImage = async (_buffer, folder) => {
    const publicId = `${folder}/img_${uploaded.length + 1}`;
    uploaded.push(publicId);
    return { url: `https://res.cloudinary.test/${publicId}.png`, publicId };
};
cloud.deleteImage = async (publicId) => { if (publicId) deleted.push(publicId); };

const app = require("../app");
const User = require("../models/User");
const Department = require("../models/Department");

let server;
let base;

const api = async (method, path, { token, body, form } = {}) => {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    let payload;
    if (form) {
        payload = form;
    } else if (body !== undefined) {
        headers["Content-Type"] = "application/json";
        payload = JSON.stringify(body);
    }
    const res = await fetch(base + path, { method, headers, body: payload });
    let json = null;
    try { json = await res.json(); } catch { /* non-JSON body */ }
    return { status: res.status, body: json };
};

const png = () => new Blob([Buffer.from("89504e470d0a1a0a", "hex")], { type: "image/png" });
const complaintForm = (fields, file = png()) => {
    const f = new FormData();
    Object.entries(fields).forEach(([k, v]) => f.append(k, v));
    if (file) f.append("image", file, "evidence.png");
    return f;
};

const ctx = {}; // shared state across the ordered tests

before(async () => {
    await mongoose.connect(process.env.TEST_MONGO_URI || "mongodb://127.0.0.1:27017/smart_campus_test");
    await mongoose.connection.dropDatabase();
    await Promise.all([User.init(), Department.init(), require("../models/Feedback").init()]);
    await new Promise((resolve) => { server = app.listen(0, resolve); });
    base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
});

// ---------------------------------------------------------------------------
test("health check and unknown routes", async () => {
    const root = await fetch(base + "/");
    assert.equal(root.status, 200);
    const missing = await api("GET", "/api/nope");
    assert.equal(missing.status, 404);
    assert.equal(missing.body.success, false);
});

test("register: validation, role is forced to student, duplicates rejected", async () => {
    const bad = await api("POST", "/api/auth/register", { body: { name: "A", email: "nope", password: "123" } });
    assert.equal(bad.status, 400);
    assert.ok(bad.body.errors.name && bad.body.errors.email && bad.body.errors.password);

    const ok = await api("POST", "/api/auth/register", {
        body: { name: "Asha Student", email: "Asha@Campus.test", password: "secret123", role: "admin" }
    });
    assert.equal(ok.status, 201);
    assert.equal(ok.body.user.role, "student", "client must not be able to self-assign admin");
    assert.equal(ok.body.user.email, "asha@campus.test");
    assert.equal(ok.body.user.password, undefined, "password hash must never be returned");
    assert.ok(ok.body.token);
    ctx.asha = ok.body;

    const dup = await api("POST", "/api/auth/register", {
        body: { name: "Asha Again", email: "asha@campus.test", password: "secret123" }
    });
    assert.equal(dup.status, 409);

    const second = await api("POST", "/api/auth/register", {
        body: { name: "Ravi Student", email: "ravi@campus.test", password: "secret123" }
    });
    ctx.ravi = second.body;
});

test("login: success, wrong password, NoSQL-injection payload", async () => {
    const ok = await api("POST", "/api/auth/login", { body: { email: "asha@campus.test", password: "secret123" } });
    assert.equal(ok.status, 200);
    assert.ok(ok.body.token);

    const wrong = await api("POST", "/api/auth/login", { body: { email: "asha@campus.test", password: "wrongpass" } });
    assert.equal(wrong.status, 401);

    const inject = await api("POST", "/api/auth/login", { body: { email: { $gt: "" }, password: { $gt: "" } } });
    assert.equal(inject.status, 400);
});

test("protected routes need a valid token", async () => {
    assert.equal((await api("GET", "/api/complaints")).status, 401);
    assert.equal((await api("GET", "/api/complaints", { token: "garbage" })).status, 401);
    const me = await api("GET", "/api/auth/me", { token: ctx.asha.token });
    assert.equal(me.status, 200);
    assert.equal(me.body.user.email, "asha@campus.test");
});

test("admin setup: departments and staff accounts", async () => {
    await User.create({ name: "Admin", email: "admin@campus.test", password: "secret123", role: "admin" });
    const login = await api("POST", "/api/auth/login", { body: { email: "admin@campus.test", password: "secret123" } });
    ctx.admin = login.body;

    // students / staff cannot create departments
    assert.equal((await api("POST", "/api/departments", { token: ctx.asha.token, body: { name: "Nope" } })).status, 403);

    const elec = await api("POST", "/api/departments", { token: ctx.admin.token, body: { name: "Electrical", description: "Power & lights" } });
    assert.equal(elec.status, 201);
    ctx.elec = elec.body.data;
    const it = await api("POST", "/api/departments", { token: ctx.admin.token, body: { name: "IT & Network" } });
    ctx.it = it.body.data;
    assert.equal((await api("POST", "/api/departments", { token: ctx.admin.token, body: { name: "Electrical" } })).status, 409);

    // staff need a department
    const noDept = await api("POST", "/api/admin/users", {
        token: ctx.admin.token, body: { name: "Sam", email: "sam@campus.test", password: "secret123", role: "staff" }
    });
    assert.equal(noDept.status, 400);

    const mk = async (name, email, department) => {
        const r = await api("POST", "/api/admin/users", {
            token: ctx.admin.token, body: { name, email, password: "secret123", role: "staff", department }
        });
        assert.equal(r.status, 201, JSON.stringify(r.body));
        const l = await api("POST", "/api/auth/login", { body: { email, password: "secret123" } });
        return { ...l.body, id: r.body.data._id };
    };
    ctx.elecStaff = await mk("Eli Electrician", "eli@campus.test", ctx.elec._id);
    ctx.itStaff = await mk("Ira IT", "ira@campus.test", ctx.it._id);
});

test("create complaint: validation, role check, Cloudinary upload stored as url + publicId", async () => {
    const badCat = await api("POST", "/api/complaints", {
        token: ctx.asha.token,
        form: complaintForm({ title: "Fan broken", description: "The fan in room 12 is broken", category: "magic" }, null)
    });
    assert.equal(badCat.status, 400);
    assert.ok(badCat.body.errors.category);

    const staffTry = await api("POST", "/api/complaints", {
        token: ctx.elecStaff.token,
        form: complaintForm({ title: "Fan broken", description: "The fan in room 12 is broken", category: "electrical" }, null)
    });
    assert.equal(staffTry.status, 403);

    const ok = await api("POST", "/api/complaints", {
        token: ctx.asha.token,
        form: complaintForm({ title: "Ceiling fan not working", description: "The fan in room 12 stopped working yesterday", category: "electrical", priority: "high" })
    });
    assert.equal(ok.status, 201, JSON.stringify(ok.body));
    assert.equal(ok.body.data.status, "submitted");
    assert.match(ok.body.data.imageUrl, /^https:\/\/res\.cloudinary\.test\//);
    assert.ok(ok.body.data.imagePublicId);
    assert.equal(ok.body.data.statusHistory.length, 1);
    ctx.c1 = ok.body.data;

    // admin was notified about the new complaint
    const n = await api("GET", "/api/notifications", { token: ctx.admin.token });
    assert.equal(n.body.unread, 1);
    assert.match(n.body.data[0].message, /New high priority complaint/);
});

test("uploads: wrong type and oversized files are rejected", async () => {
    const txt = new Blob(["hello"], { type: "text/plain" });
    const wrongType = await api("POST", "/api/complaints", {
        token: ctx.asha.token,
        form: complaintForm({ title: "Wifi is down", description: "No wifi in the library today", category: "wifi" }, txt)
    });
    assert.equal(wrongType.status, 400);
    assert.match(wrongType.body.message, /JPG, PNG or WEBP/);

    const big = new Blob([Buffer.alloc(5 * 1024 * 1024 + 10)], { type: "image/png" });
    const tooBig = await api("POST", "/api/complaints", {
        token: ctx.asha.token,
        form: complaintForm({ title: "Wifi is down", description: "No wifi in the library today", category: "wifi" }, big)
    });
    assert.equal(tooBig.status, 400);
    assert.match(tooBig.body.message, /too large/);
});

test("visibility: students see only their own complaints", async () => {
    const mine = await api("GET", "/api/complaints", { token: ctx.asha.token });
    assert.equal(mine.body.pagination.total, 1);

    const ravis = await api("GET", "/api/complaints", { token: ctx.ravi.token });
    assert.equal(ravis.body.pagination.total, 0);

    const peek = await api("GET", `/api/complaints/${ctx.c1._id}`, { token: ctx.ravi.token });
    assert.equal(peek.status, 403);

    // staff see nothing until a complaint is assigned to their department
    const staffList = await api("GET", "/api/complaints", { token: ctx.elecStaff.token });
    assert.equal(staffList.body.pagination.total, 0);

    assert.equal((await api("GET", "/api/complaints/not-an-id", { token: ctx.asha.token })).status, 400);
});

test("assign: validates department/staff match, then notifies student and staff", async () => {
    const asStudent = await api("PUT", `/api/admin/complaints/${ctx.c1._id}/assign`, {
        token: ctx.asha.token, body: { department: ctx.elec._id }
    });
    assert.equal(asStudent.status, 403);

    const mismatch = await api("PUT", `/api/admin/complaints/${ctx.c1._id}/assign`, {
        token: ctx.admin.token, body: { department: ctx.elec._id, assignedTo: ctx.itStaff.id }
    });
    assert.equal(mismatch.status, 400);

    const ok = await api("PUT", `/api/admin/complaints/${ctx.c1._id}/assign`, {
        token: ctx.admin.token, body: { department: ctx.elec._id, assignedTo: ctx.elecStaff.id, priority: "critical" }
    });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    assert.equal(ok.body.data.status, "assigned");
    assert.equal(ok.body.data.priority, "critical");
    assert.ok(ok.body.data.assignedAt);
    assert.equal(ok.body.data.department.name, "Electrical");

    const studentNotes = await api("GET", "/api/notifications", { token: ctx.asha.token });
    assert.ok(studentNotes.body.data.some((n) => /assigned to Electrical/.test(n.message)));
    const staffNotes = await api("GET", "/api/notifications", { token: ctx.elecStaff.token });
    assert.equal(staffNotes.body.unread, 1);
});

test("staff scope: assigned staff sees it, other department's staff cannot touch it", async () => {
    const mine = await api("GET", "/api/complaints", { token: ctx.elecStaff.token });
    assert.equal(mine.body.pagination.total, 1);

    const other = await api("GET", "/api/complaints", { token: ctx.itStaff.token });
    assert.equal(other.body.pagination.total, 0);
    const forbidden = await api("PUT", `/api/complaints/${ctx.c1._id}/status`, {
        token: ctx.itStaff.token, body: { status: "in_progress" }
    });
    assert.equal(forbidden.status, 403);
});

test("status workflow: enforces allowed transitions and required comment", async () => {
    const skip = await api("PUT", `/api/complaints/${ctx.c1._id}/status`, {
        token: ctx.elecStaff.token, body: { status: "resolved", comment: "skipping a step" }
    });
    assert.equal(skip.status, 400, "assigned -> resolved is not allowed for staff");

    const studentTry = await api("PUT", `/api/complaints/${ctx.c1._id}/status`, {
        token: ctx.asha.token, body: { status: "in_progress" }
    });
    assert.equal(studentTry.status, 400);

    const start = await api("PUT", `/api/complaints/${ctx.c1._id}/status`, {
        token: ctx.elecStaff.token, body: { status: "in_progress" }
    });
    assert.equal(start.status, 200);
    assert.equal(start.body.data.status, "in_progress");

    const noComment = await api("PUT", `/api/complaints/${ctx.c1._id}/status`, {
        token: ctx.elecStaff.token, body: { status: "resolved" }
    });
    assert.equal(noComment.status, 400);
    assert.ok(noComment.body.errors.comment);

    // proof image attached while resolving
    const form = new FormData();
    form.append("status", "resolved");
    form.append("comment", "Replaced the capacitor and tested the fan");
    form.append("image", png(), "proof.png");
    const done = await api("PUT", `/api/complaints/${ctx.c1._id}/status`, { token: ctx.elecStaff.token, form });
    assert.equal(done.status, 200, JSON.stringify(done.body));
    assert.equal(done.body.data.status, "resolved");
    assert.ok(done.body.data.resolvedAt);
    assert.match(done.body.data.resolutionImageUrl, /resolutions/);
    assert.equal(done.body.data.resolutionComment, "Replaced the capacitor and tested the fan");

    const studentNotes = await api("GET", "/api/notifications", { token: ctx.asha.token });
    assert.ok(studentNotes.body.data.some((n) => /is now resolved/.test(n.message)));
});

test("details: timeline has every step, in order, with who did it", async () => {
    const r = await api("GET", `/api/complaints/${ctx.c1._id}`, { token: ctx.asha.token });
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data.statusHistory.map((h) => h.status), ["submitted", "assigned", "in_progress", "resolved"]);
    assert.equal(r.body.data.statusHistory[1].changedBy.role, "admin");
    assert.equal(r.body.feedback, null);
});

test("feedback: only the owner, only after resolution, only once, rating 1-5", async () => {
    const early = await api("POST", "/api/complaints", {
        token: ctx.asha.token,
        form: complaintForm({ title: "Leaking tap in block B", description: "The tap on floor 2 has been leaking for days", category: "water" }, null)
    });
    ctx.c2 = early.body.data;
    const tooEarly = await api("POST", "/api/feedback", { token: ctx.asha.token, body: { complaintId: ctx.c2._id, rating: 4 } });
    assert.equal(tooEarly.status, 400);

    const stranger = await api("POST", "/api/feedback", { token: ctx.ravi.token, body: { complaintId: ctx.c1._id, rating: 5 } });
    assert.equal(stranger.status, 403);

    const badRating = await api("POST", "/api/feedback", { token: ctx.asha.token, body: { complaintId: ctx.c1._id, rating: 7 } });
    assert.equal(badRating.status, 400);

    const ok = await api("POST", "/api/feedback", { token: ctx.asha.token, body: { complaintId: ctx.c1._id, rating: 5, comment: "Fixed quickly!" } });
    assert.equal(ok.status, 201, JSON.stringify(ok.body));

    const dup = await api("POST", "/api/feedback", { token: ctx.asha.token, body: { complaintId: ctx.c1._id, rating: 3 } });
    assert.equal(dup.status, 409);

    const read = await api("GET", `/api/feedback/${ctx.c1._id}`, { token: ctx.elecStaff.token });
    assert.equal(read.body.data.rating, 5);
    assert.equal((await api("GET", `/api/feedback/${ctx.c1._id}`, { token: ctx.ravi.token })).status, 403);
});

test("student confirms the fix -> closed; closed is final", async () => {
    const notOwner = await api("PUT", `/api/complaints/${ctx.c1._id}/status`, { token: ctx.ravi.token, body: { status: "closed" } });
    assert.equal(notOwner.status, 403);

    const close = await api("PUT", `/api/complaints/${ctx.c1._id}/status`, { token: ctx.asha.token, body: { status: "closed" } });
    assert.equal(close.status, 200);
    assert.ok(close.body.data.closedAt);

    const again = await api("PUT", `/api/complaints/${ctx.c1._id}/status`, { token: ctx.admin.token, body: { status: "in_progress" } });
    assert.equal(again.status, 400);
});

test("student can reject a fix (re-open) with a reason", async () => {
    await api("PUT", `/api/admin/complaints/${ctx.c2._id}/assign`, { token: ctx.admin.token, body: { department: ctx.it._id } });
    // any staff of the department may accept a complaint nobody owns yet - the acceptor becomes the owner
    const accept = await api("PUT", `/api/complaints/${ctx.c2._id}/status`, { token: ctx.itStaff.token, body: { status: "in_progress" } });
    assert.equal(accept.status, 200);
    assert.equal(accept.body.data.assignedTo.name, "Ira IT");
    await api("PUT", `/api/complaints/${ctx.c2._id}/status`, { token: ctx.itStaff.token, body: { status: "resolved", comment: "Tightened the washer" } });

    const noReason = await api("PUT", `/api/complaints/${ctx.c2._id}/status`, { token: ctx.asha.token, body: { status: "in_progress" } });
    assert.equal(noReason.status, 400);

    const reopen = await api("PUT", `/api/complaints/${ctx.c2._id}/status`, {
        token: ctx.asha.token, body: { status: "in_progress", comment: "Still dripping this morning" }
    });
    assert.equal(reopen.status, 200);
    assert.equal(reopen.body.data.resolvedAt, undefined, "resolvedAt is cleared when work is re-opened");
    const staffNotes = await api("GET", "/api/notifications", { token: ctx.itStaff.token });
    assert.ok(staffNotes.body.data.some((n) => /not fixed yet/.test(n.message)));

    // finish it again so the dashboard has a second resolved complaint
    await api("PUT", `/api/complaints/${ctx.c2._id}/status`, { token: ctx.itStaff.token, body: { status: "resolved", comment: "Replaced the whole tap" } });
});

test("edit & delete rules for students and admins", async () => {
    const f = await api("POST", "/api/complaints", {
        token: ctx.asha.token,
        form: complaintForm({ title: "Projector flickers", description: "Projector in room 301 flickers constantly", category: "equipment" })
    });
    const c3 = f.body.data;

    const edit = await api("PUT", `/api/complaints/${c3._id}`, { token: ctx.asha.token, body: { title: "Projector flickers in 301", priority: "low" } });
    assert.equal(edit.status, 200);
    assert.equal(edit.body.data.title, "Projector flickers in 301");

    // replacing the image removes the previous one from Cloudinary
    const before = deleted.length;
    const form = new FormData();
    form.append("title", "Projector flickers in room 301");
    form.append("image", png(), "new.png");
    const replaced = await api("PUT", `/api/complaints/${c3._id}`, { token: ctx.asha.token, form });
    assert.equal(replaced.status, 200, JSON.stringify(replaced.body));
    assert.equal(deleted.length, before + 1);
    assert.notEqual(replaced.body.data.imagePublicId, c3.imagePublicId);

    const otherEdit = await api("PUT", `/api/complaints/${c3._id}`, { token: ctx.ravi.token, body: { title: "Hacked title!" } });
    assert.equal(otherEdit.status, 403);
    const staffEdit = await api("PUT", `/api/complaints/${c3._id}`, { token: ctx.elecStaff.token, body: { priority: "low" } });
    assert.equal(staffEdit.status, 403);

    const adminPriority = await api("PUT", `/api/complaints/${c3._id}`, { token: ctx.admin.token, body: { priority: "high", title: "ignored by admin" } });
    assert.equal(adminPriority.body.data.priority, "high");
    assert.equal(adminPriority.body.data.title, "Projector flickers in room 301", "admins cannot rewrite the student's text");

    // assigned complaints are locked for students
    await api("PUT", `/api/admin/complaints/${c3._id}/assign`, { token: ctx.admin.token, body: { department: ctx.elec._id } });
    assert.equal((await api("PUT", `/api/complaints/${c3._id}`, { token: ctx.asha.token, body: { title: "Too late now" } })).status, 400);
    assert.equal((await api("DELETE", `/api/complaints/${c3._id}`, { token: ctx.asha.token })).status, 400);

    // admin may delete anything; images are cleaned up
    const del = await api("DELETE", `/api/complaints/${c3._id}`, { token: ctx.admin.token });
    assert.equal(del.status, 200);
    assert.ok(deleted.includes(replaced.body.data.imagePublicId));
    assert.equal((await api("GET", `/api/complaints/${c3._id}`, { token: ctx.admin.token })).status, 404);

    // a student may delete their own untouched complaint
    const f2 = await api("POST", "/api/complaints", {
        token: ctx.ravi.token,
        form: complaintForm({ title: "Duplicate report", description: "I reported this twice by mistake", category: "other" }, null)
    });
    assert.equal((await api("DELETE", `/api/complaints/${f2.body.data._id}`, { token: ctx.ravi.token })).status, 200);
});

test("search, filters and pagination (regex characters are escaped)", async () => {
    for (let i = 1; i <= 4; i++) {
        await api("POST", "/api/complaints", {
            token: ctx.ravi.token,
            form: complaintForm({
                title: `Library AC issue ${i}`, description: "The air conditioning in the library is too cold (again)",
                category: "library", priority: i % 2 ? "low" : "critical"
            }, null)
        });
    }
    const search = await api("GET", "/api/complaints?search=library", { token: ctx.admin.token });
    assert.equal(search.body.pagination.total, 4);

    const special = await api("GET", "/api/complaints?search=" + encodeURIComponent("(again)"), { token: ctx.admin.token });
    assert.equal(special.status, 200);
    assert.equal(special.body.pagination.total, 4);
    const evil = await api("GET", "/api/complaints?search=" + encodeURIComponent("(((.*"), { token: ctx.admin.token });
    assert.equal(evil.status, 200);

    const crit = await api("GET", "/api/complaints?priority=critical&category=library", { token: ctx.admin.token });
    assert.equal(crit.body.pagination.total, 2);

    const byStatus = await api("GET", "/api/complaints?status=resolved", { token: ctx.admin.token });
    assert.equal(byStatus.body.pagination.total, 1);

    const byDept = await api("GET", `/api/complaints?department=${ctx.elec._id}`, { token: ctx.admin.token });
    assert.equal(byDept.body.pagination.total, 1);

    const page = await api("GET", "/api/complaints?limit=2&page=2", { token: ctx.admin.token });
    assert.equal(page.body.data.length, 2);
    assert.equal(page.body.pagination.pages, 3);

    assert.equal((await api("GET", "/api/complaints?status=bogus", { token: ctx.admin.token })).status, 400);
    // Express 5 does not parse "a[$eq]=b" into an object, so operator injection through the
    // query string is impossible: the parameter is ignored and the result is the unfiltered list.
    const injected = await api("GET", "/api/complaints?status[$eq]=resolved", { token: ctx.admin.token });
    assert.equal(injected.status, 200);
    assert.equal(injected.body.pagination.total, 6, "operator must not act as a filter");
});

test("student / staff stats", async () => {
    const s = await api("GET", "/api/complaints/stats", { token: ctx.asha.token });
    assert.equal(s.body.data.total, 2);
    assert.equal(s.body.data.byStatus.closed, 1);
    assert.equal(s.body.data.byStatus.resolved, 1);
});

test("admin dashboard: totals, rates, breakdowns and trend", async () => {
    const forbidden = await api("GET", "/api/admin/dashboard", { token: ctx.asha.token });
    assert.equal(forbidden.status, 403);

    const r = await api("GET", "/api/admin/dashboard", { token: ctx.admin.token });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const d = r.body.data;
    assert.equal(d.totals.total, 6); // 2 (asha) + 4 (ravi)
    assert.equal(d.totals.resolved, 2);
    assert.equal(d.totals.pending, 4);
    assert.equal(d.resolutionRate, 33.3);
    assert.equal(typeof d.avgResolutionHours, "number");
    assert.equal(d.avgRating, 5);
    assert.equal(d.monthlyTrend.length, 6);
    assert.equal(d.monthlyTrend.at(-1).count, 6);
    assert.ok(d.byCategory.find((c) => c.name === "library" && c.count === 4));
    assert.ok(d.byDepartment.find((c) => c.name === "Electrical"));
    assert.equal(d.users.student, 2);
    assert.equal(d.users.staff, 2);
});

test("user management: roles, deactivate, self-protection, delete rules", async () => {
    const list = await api("GET", "/api/admin/users?role=staff", { token: ctx.admin.token });
    assert.equal(list.body.data.length, 2);
    assert.equal((await api("GET", "/api/admin/users", { token: ctx.asha.token })).status, 403);

    const adminId = (await User.findOne({ email: "admin@campus.test" }))._id;
    assert.equal((await api("PUT", `/api/admin/users/${adminId}`, { token: ctx.admin.token, body: { role: "student" } })).status, 400);
    assert.equal((await api("PUT", `/api/admin/users/${adminId}`, { token: ctx.admin.token, body: { isActive: false } })).status, 400);
    assert.equal((await api("DELETE", `/api/admin/users/${adminId}`, { token: ctx.admin.token })).status, 400);

    // move staff to another department
    const moved = await api("PUT", `/api/admin/users/${ctx.itStaff.id}`, { token: ctx.admin.token, body: { department: ctx.elec._id } });
    assert.equal(moved.body.data.department.name, "Electrical");

    // deactivated users are locked out immediately, even with a valid token
    const off = await api("PUT", `/api/admin/users/${ctx.itStaff.id}`, { token: ctx.admin.token, body: { isActive: false } });
    assert.equal(off.status, 200);
    assert.equal((await api("GET", "/api/auth/me", { token: ctx.itStaff.token })).status, 403);
    assert.equal((await api("POST", "/api/auth/login", { body: { email: "ira@campus.test", password: "secret123" } })).status, 403);

    // students with complaints cannot be deleted; staff without can
    assert.equal((await api("DELETE", `/api/admin/users/${ctx.asha.user._id}`, { token: ctx.admin.token })).status, 409);
    assert.equal((await api("DELETE", `/api/admin/users/${ctx.itStaff.id}`, { token: ctx.admin.token })).status, 200);
});

test("departments: cannot delete one that is still in use; unused ones can go", async () => {
    assert.equal((await api("DELETE", `/api/departments/${ctx.elec._id}`, { token: ctx.admin.token })).status, 409);
    const tmp = await api("POST", "/api/departments", { token: ctx.admin.token, body: { name: "Temporary" } });
    assert.equal((await api("DELETE", `/api/departments/${tmp.body.data._id}`, { token: ctx.admin.token })).status, 200);

    const list = await api("GET", "/api/departments", { token: ctx.admin.token });
    const elec = list.body.data.find((d) => d.name === "Electrical");
    assert.ok(Array.isArray(elec.staff), "admin sees each department's staff");
});

test("profile: change name and password", async () => {
    const wrong = await api("PUT", "/api/auth/me", { token: ctx.ravi.token, body: { newPassword: "brandnew1", currentPassword: "nope" } });
    assert.equal(wrong.status, 400);
    const ok = await api("PUT", "/api/auth/me", { token: ctx.ravi.token, body: { name: "Ravi K", newPassword: "brandnew1", currentPassword: "secret123" } });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.user.name, "Ravi K");
    assert.equal((await api("POST", "/api/auth/login", { body: { email: "ravi@campus.test", password: "brandnew1" } })).status, 200);
});

test("notifications: mark one / all as read, cannot touch someone else's", async () => {
    const list = await api("GET", "/api/notifications", { token: ctx.asha.token });
    assert.ok(list.body.unread > 0);
    const first = list.body.data[0];
    assert.equal((await api("PUT", `/api/notifications/${first._id}/read`, { token: ctx.ravi.token })).status, 404);
    assert.equal((await api("PUT", `/api/notifications/${first._id}/read`, { token: ctx.asha.token })).status, 200);
    await api("PUT", "/api/notifications/read-all", { token: ctx.asha.token });
    assert.equal((await api("GET", "/api/notifications", { token: ctx.asha.token })).body.unread, 0);
});

test("CORS: unknown origins are refused", async () => {
    const res = await fetch(base + "/api/health", { headers: { Origin: "https://evil.example" } });
    assert.equal(res.status, 403);
    const ok = await fetch(base + "/api/health", { headers: { Origin: "http://localhost:5173" } });
    assert.equal(ok.status, 200);
});
