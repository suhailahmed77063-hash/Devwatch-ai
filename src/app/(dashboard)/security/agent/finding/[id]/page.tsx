import type { Metadata } from "next";
import DetailClient from "./detail-client";

export const metadata: Metadata = {
  title: "Finding — Security Agent",
};

export default function FindingDetailPage() {
  return <DetailClient />;
}
