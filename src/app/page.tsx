import { redirect } from "next/navigation";

// The Dashboard was removed; Career Insights is the home screen now.
export default function Home() {
  redirect("/career-insights");
}
