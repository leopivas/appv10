import { Router, type IRouter } from "express";
import { requireAdminMiddleware } from "./auth";
import { getAllRoles, getRoleById, createRole, updateRole, deleteRole, makeRoleId, ALL_PERMISSIONS, type Role } from "../lib/roles-store";
import { getUserById, updateUser } from "../lib/users-store";

const router: IRouter = Router();

// GET /admin/roles
router.get("/admin/roles", requireAdminMiddleware, async (_req, res): Promise<void> => {
  const roles = await getAllRoles();
  res.json({ roles, permissions: ALL_PERMISSIONS });
});

// POST /admin/roles
router.post("/admin/roles", requireAdminMiddleware, async (req, res): Promise<void> => {
  const { name, description, color, permissions } = req.body as Partial<Role>;
  if (!name?.trim()) { res.status(400).json({ error: "name is required" }); return; }

  const now = new Date().toISOString();
  const role = await createRole({
    id: makeRoleId(),
    name: name.trim(),
    description: description?.trim() ?? "",
    color: color ?? "#6366f1",
    permissions: Array.isArray(permissions) ? permissions : [],
    createdAt: now,
    updatedAt: now,
  });
  res.status(201).json({ role });
});

// PATCH /admin/roles/:id
router.patch("/admin/roles/:id", requireAdminMiddleware, async (req, res): Promise<void> => {
  const { id } = req.params as { id: string };
  const { name, description, color, permissions } = req.body as Partial<Role>;

  const role = await getRoleById(id);
  if (!role) { res.status(404).json({ error: "Role not found" }); return; }

  const updates: Partial<Role> = { updatedAt: new Date().toISOString() };
  if (name?.trim()) updates.name = name.trim();
  if (description !== undefined) updates.description = description.trim();
  if (color) updates.color = color;
  if (Array.isArray(permissions)) updates.permissions = permissions;

  const updated = await updateRole(id, updates);
  res.json({ role: updated });
});

// DELETE /admin/roles/:id
router.delete("/admin/roles/:id", requireAdminMiddleware, async (req, res): Promise<void> => {
  const { id } = req.params as { id: string };
  const role = await getRoleById(id);
  if (!role) { res.status(404).json({ error: "Role not found" }); return; }

  await deleteRole(id);
  res.json({ ok: true });
});

// PATCH /admin/users/:id/role
router.patch("/admin/users/:id/role", requireAdminMiddleware, async (req, res): Promise<void> => {
  const { id } = req.params as { id: string };
  const { roleId } = req.body as { roleId?: string | null };

  const user = await getUserById(id);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  if (roleId && roleId !== "") {
    const role = await getRoleById(roleId);
    if (!role) { res.status(404).json({ error: "Role not found" }); return; }
  }

  const newRoleId = (roleId && roleId !== "") ? roleId : null;
  if (newRoleId) {
    await updateUser(id, { roleId: newRoleId });
  } else {
    // Explicitly set to null to clear — Drizzle ignores undefined, so we must use null
    await updateUser(id, { roleId: null });
  }
  res.json({ ok: true, roleId: newRoleId });
});

export default router;
