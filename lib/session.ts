export function requireUserId(session: { user?: { id?: string; role?: string } } | null): string | null {
  if (!session?.user?.id || session.user.role === "STUDENT") return null;
  return session.user.id;
}

export function requireStudentProfileId(
  session: { user?: { studentProfileId?: string; role?: string } } | null
): string | null {
  if (session?.user?.role !== "STUDENT") return null;
  return session.user.studentProfileId ?? null;
}

export function sessionRole(session: { user?: { role?: string } } | null): string | undefined {
  return session?.user?.role;
}
