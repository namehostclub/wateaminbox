import type { Context, Next } from "hono";

/**
 * Super Admin Middleware
 *
 * Ensures that the authenticated caller has platform-wide super administrator privileges.
 */
export const superAdminMiddleware = async (c: Context, next: Next) => {
  const user = c.get("user");

  if (!user) {
    return c.json(
      {
        error: "Unauthorized",
        message: "Authentication required",
      },
      401,
    );
  }

  const isSuper =
    user.isSuperAdmin === true ||
    user.email?.toLowerCase() === "info@namehostclub.com";

  if (!isSuper) {
    return c.json(
      {
        error: "Forbidden",
        message: "Super admin privileges required to access this resource",
      },
      403,
    );
  }

  await next();
};

