import jwt from "jsonwebtoken";
import { getUserPermissions } from "./db.js";

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production-use-env";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "8h";

// ── Token helpers ────────────────────────────────────────────────────────────
export const signToken = (payload) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });

export const verifyToken = (token) => jwt.verify(token, JWT_SECRET);

// ── Middleware: require a valid JWT ──────────────────────────────────────────
export const authenticate = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }

  const token = authHeader.slice(7);
  try {
    req.user = verifyToken(token);   // { id, username, role, roleId, iat, exp }
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

// ── Middleware: require one of the given permissions ─────────────────────────
//   Usage:  router.post("/apollo", authenticate, requirePermission("apollo:query"), handler)
export const requirePermission = (...perms) => (req, res, next) => {
  const userPerms = getUserPermissions(req.user.roleId);
  const allowed = perms.some((p) => userPerms.includes(p));
  if (!allowed) {
    return res.status(403).json({
      error: "Forbidden",
      required: perms,
      yourRole: req.user.role,
    });
  }
  next();
};

// ── Middleware: restrict to specific roles ───────────────────────────────────
//   Usage:  router.get("/users", authenticate, requireRole("admin"), handler)
export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      error: "Forbidden",
      required: roles,
      yourRole: req.user.role,
    });
  }
  next();
};