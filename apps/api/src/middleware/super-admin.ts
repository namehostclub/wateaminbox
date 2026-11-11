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
    user.email?.toLowerCase().trim() === "info@namehostclub.com" &&
    user.isSuperAdmin === true;

  if (!isSuper) {
    return c.json(
      {
        error: "Forbidden",
        message:
          "Access restricted: Only info@namehostclub.com super admin is authorized.",
      },
      403,
    );
  }

  await next();
};

