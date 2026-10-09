const ApiError = require("./ApiError");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

// Accept only real strings (this also blocks NoSQL-injection payloads such as { "$gt": "" }).
const str = (value) => (typeof value === "string" ? value.trim() : "");

const isEmail = (value) => EMAIL_RE.test(str(value));
const isObjectId = (value) => typeof value === "string" && OBJECT_ID_RE.test(value);

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Collects field errors and throws a single 400 with all of them.
class Validator {
    constructor() { this.errors = {}; }

    check(condition, field, message) {
        if (!condition && !this.errors[field]) this.errors[field] = message;
        return this;
    }

    done() {
        if (Object.keys(this.errors).length) {
            throw ApiError.badRequest("Validation failed", this.errors);
        }
    }
}

module.exports = { str, isEmail, isObjectId, escapeRegex, Validator };
