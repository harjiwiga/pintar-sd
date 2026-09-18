import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    const role = session.user.role;
    if (role === "TEACHER") redirect("/guru");
    if (role === "PARENT") redirect("/ortu");
    if (role === "STUDENT") redirect("/siswa");
    redirect("/dashboard");
  }
  redirect("/login");
}
