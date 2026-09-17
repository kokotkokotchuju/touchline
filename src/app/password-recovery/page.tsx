import { PasswordRecoveryForm } from "@/components/auth/password-recovery-form";

export const metadata = {
  title: "Password recovery",
  robots: { index: false, follow: false },
};

export default async function PasswordRecoveryPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  return <PasswordRecoveryForm token={params.token} />;
}
