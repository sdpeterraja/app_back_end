import express from "express";
import bcrypt from "bcryptjs";
import {
  findUserByUsername,
  createUser,
  listUsers,
  deleteUser,
  listRoles,
} from "./db.js";
import { signToken, authenticate, requireRole } from "./authMiddleware.js";

const router = express.Router();

// ── POST /api/auth/login ─────────────────────────────────────────────────────
// Body: { username, password }
router.post("/login", (req, res) => {
  const { username, password } = req.body;
console.log(req.body)
  if (!username || !password) {
    return res.status(400).json({ error: "username and password are required" });
  }

  const user = findUserByUsername(username);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signToken({
    id:       user.id,
    username: user.username,
    role:     user.role,
    roleId:   user.role_id,
  });

  return res.json({
    token,
    user: { id: user.id, username: user.username, role: user.role },
  });
});

// ── GET /api/auth/me  (requires valid JWT) ────────────────────────────────────
router.get("/me", authenticate, (req, res) => {
  res.json({ user: req.user });
});

// ── Admin: list all users ─────────────────────────────────────────────────────
router.get("/users", authenticate, requireRole("admin"), (_req, res) => {
  res.json({ users: listUsers() });
});

// ── Admin: create a user ──────────────────────────────────────────────────────
// Body: { username, password, role }   role ∈ { admin, operator, viewer }
router.post("/users", authenticate, requireRole("admin"), (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ error: "username, password and role are required" });
  }
  try {
    createUser(username, password, role);
    res.status(201).json({ message: User '${username}' created with role '${role}' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Admin: delete a user ──────────────────────────────────────────────────────
router.delete("/users/:id", authenticate, requireRole("admin"), (req, res) => {
  deleteUser(req.params.id);
  res.json({ message: "User deleted" });
});

// ── List available roles ──────────────────────────────────────────────────────
router.get("/roles", authenticate, requireRole("admin"), (_req, res) => {
  res.json({ roles: listRoles() });
});

export default router;