import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const _dirname = path.dirname(_filename);

const db = new Database(path.join(__dirname, "rbac.sqlite"));

// ── Schema ──────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS roles (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT    NOT NULL UNIQUE          -- e.g. admin, operator, viewer
  );

  CREATE TABLE IF NOT EXISTS users (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    username     TEXT    NOT NULL UNIQUE,
    password     TEXT    NOT NULL,        -- bcrypt hash
    role_id      INTEGER NOT NULL REFERENCES roles(id),
    created_at   TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS role_permissions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    role_id    INTEGER NOT NULL REFERENCES roles(id),
    permission TEXT    NOT NULL,          -- e.g. "apollo:query", "stream:read", "sdd:write"
    UNIQUE(role_id, permission)
  );
`);

// ── Seed default roles & permissions ────────────────────────────────────────
const seedRoles = () => {
  const roles = ["admin", "operator", "viewer"];
  const insertRole = db.prepare(
    "INSERT OR IGNORE INTO roles (name) VALUES (?)"
  );
  roles.forEach((r) => insertRole.run(r));

  // Permissions per role
  const perms = {
    admin:    ["apollo:query", "stream:read", "sdd:write", "sdd:read", "user:manage"],
    operator: ["apollo:query", "stream:read", "sdd:write", "sdd:read"],
    viewer:   ["stream:read", "sdd:read"],
  };

  const insertPerm = db.prepare(
    "INSERT OR IGNORE INTO role_permissions (role_id, permission) VALUES (?, ?)"
  );

  for (const [roleName, permissions] of Object.entries(perms)) {
    const role = db.prepare("SELECT id FROM roles WHERE name = ?").get(roleName);
    if (role) {
      permissions.forEach((p) => insertPerm.run(role.id, p));
    }
  }
};

// ── Seed a default admin user (only if no users exist) ──────────────────────
const seedAdmin = () => {
  const count = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
  if (count === 0) {
    const adminRole = db.prepare("SELECT id FROM roles WHERE name = 'admin'").get();
    const hash = bcrypt.hashSync("Admin@123", 10);
    db.prepare(
      "INSERT INTO users (username, password, role_id) VALUES (?, ?, ?)"
    ).run("admin", hash, adminRole.id);
    console.log("✅ Default admin user created  →  admin / Admin@123");
  }
};

seedRoles();
seedAdmin();

// ── Helper queries ───────────────────────────────────────────────────────────
export const findUserByUsername = (username) =>
  db
    .prepare(
      `SELECT u.*, r.name AS role
       FROM users u JOIN roles r ON u.role_id = r.id
       WHERE u.username = ?`
    )
    .get(username);

export const getUserPermissions = (roleId) =>
  db
    .prepare("SELECT permission FROM role_permissions WHERE role_id = ?")
    .all(roleId)
    .map((r) => r.permission);

export const createUser = (username, plainPassword, roleName) => {
  const role = db.prepare("SELECT id FROM roles WHERE name = ?").get(roleName);
  if (!role) throw new Error(Role '${roleName}' not found);
  const hash = bcrypt.hashSync(plainPassword, 10);
  return db
    .prepare("INSERT INTO users (username, password, role_id) VALUES (?, ?, ?)")
    .run(username, hash, role.id);
};

export const listUsers = () =>
  db
    .prepare(
      `SELECT u.id, u.username, r.name AS role, u.created_at
       FROM users u JOIN roles r ON u.role_id = r.id`
    )
    .all();

export const deleteUser = (id) =>
  db.prepare("DELETE FROM users WHERE id = ?").run(id);

export const listRoles = () => db.prepare("SELECT * FROM roles").all();

export default db;