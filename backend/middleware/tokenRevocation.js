// 🔐 SECURITY: in-process token revocation.
//
// authenticate() only verifies a JWT's signature/expiry — it never re-checks
// the DB, so a ban or password change didn't actually cut off an
// already-issued access token (it stayed valid up to its full 2h life), and
// a stolen refresh token survived a legitimate password reset. Re-checking
// the DB on every single authenticated request would add a query to the
// hottest path in the app just to cover a rare event, so instead: any code
// path that should invalidate a user's existing sessions (ban, password
// change/reset, admin-forced password reset) calls revokeUserTokens(), and
// authenticate() rejects any token whose `iat` predates that timestamp.
//
// In-memory only, keyed by userId — correct as long as this runs as a single
// PM2 process (confirmed: `pm2 list` shows `deapseak` in fork mode, one
// instance, not cluster). If this ever moves to multiple instances/cluster
// mode, this needs to move to a shared store (Redis) instead.

const revokedSince = new Map(); // userId (string) -> ms timestamp

function revokeUserTokens(userId) {
    revokedSince.set(String(userId), Date.now());
}

function isTokenRevoked(userId, tokenIatSeconds) {
    const revokedAt = revokedSince.get(String(userId));
    if (!revokedAt) return false;
    return tokenIatSeconds * 1000 < revokedAt;
}

module.exports = { revokeUserTokens, isTokenRevoked };
