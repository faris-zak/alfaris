// Browser auth refresh needs JavaScript-readable cookies; HttpOnly requires
// a different, server-only authentication architecture.
export const cookieOptions = {
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
