import type { Metadata } from "next";
import AgentClient from "./agent-client";

export const metadata: Metadata = {
  title: "Security Agent — DevWatch AI",
};

export default function SecurityAgentPage() {
  return <AgentClient />;
}
