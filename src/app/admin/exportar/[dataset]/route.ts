import { exportAnalytics } from "@/lib/analytics-csv";
export async function GET(request: Request, { params }: { params: Promise<{ dataset: string }> }) {
  return exportAnalytics(request, (await params).dataset);
}
