// Shared client-side admin gate.
//
// IMPORTANT: This is UI-level gating only. It keeps the admin email address out
// of the public source (by comparing a SHA-256 hash instead of shipping the
// plaintext email), and hides admin-only UI from everyone else. It is NOT a
// security boundary — anyone can read this file. Real authorization for admin
// actions (schedule edits, vote/check-in invalidation, bans) must be enforced
// by Firestore security rules, ideally keyed off a custom auth claim.
//
// To rotate the admin account, replace the hash below with the SHA-256 of the
// new lowercased email:  printf '%s' 'new@email.com' | shasum -a 256
const ADMIN_EMAIL_HASH = "0af228e6b4e6d643320bfabf0b1ca6eaa94effe0658b46c3cc9f94dd7fedadee";

async function sha256Hex(str) {
    const data = new TextEncoder().encode(str);
    const buffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

// Resolves true only for the admin account. Returns false for signed-out users,
// non-admins, or if hashing is unavailable (e.g. an insecure context).
export async function isAdminUser(user) {
    if (!user || !user.email) return false;
    try {
        const hash = await sha256Hex(user.email.trim().toLowerCase());
        return hash === ADMIN_EMAIL_HASH;
    } catch (err) {
        console.warn("Admin check unavailable:", err);
        return false;
    }
}
