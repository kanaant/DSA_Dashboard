import { type NextRequest, NextResponse } from "next/server";
import { isApiRequestAuthenticated } from "@/lib/api-auth";
import { safeResolvePath, readFileContent, writeFile, updateVaultMeta } from "@/lib/vault-data";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!(await isApiRequestAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.HERMES_AGENT_URL;
  const apiKey = process.env.HERMES_AGENT_API_KEY;
  const modelName = process.env.HERMES_AGENT_MODEL_NAME || "hermes-agent";

  if (!url || !apiKey) {
    return NextResponse.json(
      { error: "Hermes Agent URL or API Key is not configured." },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { action, filePath, projectId } = body;

    if (!action || !filePath || !projectId) {
      return NextResponse.json(
        { error: "Missing required parameters: action, filePath, projectId." },
        { status: 400 }
      );
    }

    // Resolve and read file
    const fileData = await readFileContent(filePath);
    const fileName = path.basename(filePath);
    const fileExt = path.extname(filePath);

    let systemPrompt = "";
    let userPrompt = "";
    let outRelativePath = "";

    if (action === "summarize") {
      systemPrompt = "You are the autonomous Hermes AI agent. Your task is to analyze the provided document and generate a premium, professional Markdown summary dashboard brief. Focus on highlighting key systems, threats, objectives, and structures. Format with rich Markdown tables, bullet points, and high-impact headers. Keep it concise but detailed.";
      userPrompt = `Please summarize the following document.\n\nFile Name: ${fileName}\n\nContent:\n${fileData.content}`;
      outRelativePath = filePath.replace(fileExt, "_summary.md");
    } else if (action === "refactor") {
      systemPrompt = "You are the autonomous Hermes AI agent. Your task is to refactor and optimize the provided source code. Improve performance, readability, type safety, and security. Maintain the original logic while applying best practices. Output ONLY the complete refactored code without conversational text or Markdown formatting wrapping.";
      userPrompt = `Please refactor this source code.\n\nFile Name: ${fileName}\n\nCode:\n${fileData.content}`;
      
      const dotIndex = fileName.lastIndexOf(".");
      const base = dotIndex !== -1 ? fileName.substring(0, dotIndex) : fileName;
      const ext = dotIndex !== -1 ? fileName.substring(dotIndex) : "";
      outRelativePath = filePath.replace(fileName, `${base}_optimized${ext}`);
    } else if (action === "diagram") {
      systemPrompt = "You are the autonomous Hermes AI agent. Your task is to convert the textual logic or system flow of the provided document into a clean, complete, and functional Mermaid.js flowchart (starting with graph TD or TB). Output ONLY the Mermaid diagram code itself. Do not include markdown code block fences (```mermaid) or any conversational text around it.";
      userPrompt = `Please generate a Mermaid flowchart representing the architecture or sequence logic within the following document.\n\nFile Name: ${fileName}\n\nContent:\n${fileData.content}`;
      outRelativePath = filePath.replace(fileExt, "_flowchart.mmd");
    } else {
      return NextResponse.json({ error: "Invalid action type." }, { status: 400 });
    }

    // Call Hermes API
    const response = await fetch(`${url}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Hermes server error: ${response.status} - ${errorText}`);
    }

    const resData = await response.json();
    let generatedContent = resData.choices?.[0]?.message?.content || "";

    // Clean up code block fences in case the model ignored prompt directives
    if (action === "refactor" || action === "diagram") {
      const codeBlockRegex = /```(?:[a-zA-Z0-9]*\n)?([\s\S]*?)```/;
      const match = generatedContent.match(codeBlockRegex);
      if (match && match[1]) {
        generatedContent = match[1].trim();
      } else {
        generatedContent = generatedContent.trim();
      }
    }

    // Add metadata header for summarizes or diagrams
    if (action === "summarize") {
      generatedContent = `> [!NOTE]\n> **AI Generated summary brief** for file: \`${fileName}\`\n> Timestamp: ${new Date().toLocaleString()}\n\n${generatedContent}`;
    }

    // Write file to vault
    await writeFile(outRelativePath, generatedContent, true);

    return NextResponse.json({
      success: true,
      outputPath: outRelativePath,
      message: `Successfully processed ${action} on ${fileName}`
    });

  } catch (error: any) {
    console.error("Hermes agentic action failed:", error);
    return NextResponse.json(
      { error: error.message || "Failed to trigger Hermes agent." },
      { status: 500 }
    );
  }
}
