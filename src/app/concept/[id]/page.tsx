import fs from "fs";
import path from "path";
import Link from "next/link";

export default async function ConceptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const filePath = path.join(process.cwd(), "gemini", "designs", id);
  let content = "Concept not found.";

  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch {
    // Ignore missing concept files and keep the fallback copy.
  }

  return (
    <div className="min-h-screen bg-black p-12 font-mono text-green-500">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="mb-8 inline-block text-white hover:underline">
          {"<-"} Back to Home
        </Link>
        <pre className="whitespace-pre-wrap">{content}</pre>
      </div>
    </div>
  );
}
