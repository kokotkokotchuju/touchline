import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "./auth";

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
