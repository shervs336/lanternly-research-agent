import { ResearchApp } from "@/components/research-app";

export default function Home() {
  const liveEnabled = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY && process.env.TAVILY_API_KEY);
  return <ResearchApp liveEnabled={liveEnabled} />;
}
