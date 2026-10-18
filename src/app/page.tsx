import { redirect } from "next/navigation";
import { getPageUser } from "@/server/page-auth";

export default async function Home() {
  const user = await getPageUser();
  if (!user) redirect("/anmelden");
  redirect(user.onboardingCompleted ? "/dashboard" : "/onboarding");
}
