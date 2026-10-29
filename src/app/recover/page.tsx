import { redirect } from "next/navigation";

// Old "log back in" links: entering your name on the join screen now logs you in.
export default async function RecoverPage({
  searchParams,
}: {
  searchParams: Promise<{ scan?: string }>;
}) {
  const { scan } = await searchParams;
  redirect(scan ? `/?scan=${encodeURIComponent(scan)}` : "/");
}
