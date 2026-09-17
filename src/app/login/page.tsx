import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata = {
  title: "Log in or create account",
  robots: { index: false, follow: false },
};
export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  return <AuthForm />;
}
