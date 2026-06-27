const fs = require("fs").promises;
const path = require("path");

const VAULT_DIR = "/home/dscalez/vault/DSA_Dashboard/maquifit-seo";
const STATE_FILE = path.join(VAULT_DIR, "workflow_state.json");
const SETTINGS_FILE = path.join(VAULT_DIR, "settings.json");
const STATUS_FILE = path.join(VAULT_DIR, "status.json");

const HERMES_URL = process.env.HERMES_AGENT_URL || "http://127.0.0.1:8642";
const HERMES_KEY = process.env.HERMES_AGENT_API_KEY;
const MODEL_NAME = process.env.HERMES_AGENT_MODEL_NAME || "hermes-agent";

async function updateStatus(step, progress, status = "running", error = null) {
  const payload = {
    status,
    step,
    progress,
    error,
    lastRun: new Date().toISOString()
  };
  await fs.mkdir(VAULT_DIR, { recursive: true });
  await fs.writeFile(STATUS_FILE, JSON.stringify(payload, null, 2), "utf-8");
  console.log(`[Status Update] Step: ${step} (${progress}%) - Status: ${status}`);
}

function calculateSimulatedScore(title, description, keyword, slug) {
  let score = 30; // Base score

  const t = (title || "").toLowerCase().trim();
  const d = (description || "").toLowerCase().trim();
  const k = (keyword || "").toLowerCase().trim();
  const s = (slug || "").toLowerCase().trim();

  if (!k) {
    if (t.length >= 40 && t.length <= 60) score += 15;
    if (d.length >= 110 && d.length <= 160) score += 15;
    return Math.min(score, 60);
  }

  const keywords = k.split(",").map(x => x.trim()).filter(Boolean);
  if (keywords.length > 0) {
    const primaryK = keywords[0];
    if (t.includes(primaryK)) {
      score += 20;
      if (t.startsWith(primaryK) || t.indexOf(primaryK) < t.length / 2) {
        score += 10;
      }
    }
    if (d.includes(primaryK)) {
      score += 20;
    }
    const cleanSlug = s.replace(/-/g, " ");
    if (cleanSlug.includes(primaryK) || primaryK.split(" ").some(word => cleanSlug.includes(word))) {
      score += 10;
    }
  }

  const titleLen = t.length;
  if (titleLen >= 45 && titleLen <= 60) {
    score += 15;
  } else if (titleLen >= 30 && titleLen < 45) {
    score += 8;
  } else if (titleLen > 60) {
    score += 5;
  }

  const descLen = d.length;
  if (descLen >= 120 && descLen <= 160) {
    score += 15;
  } else if (descLen >= 80 && descLen < 120) {
    score += 8;
  } else if (descLen > 160) {
    score += 5;
  }

  return Math.min(score, 100);
}

async function optimizeItem(item) {
  if (!HERMES_KEY) {
    throw new Error("HERMES_AGENT_API_KEY environment variable is missing.");
  }

  const systemPrompt = `You are an expert SEO copywriter and strategist. Optimize the metadata for the website MaquiFit (an e-commerce brand for activewear, fitness gear, and lifestyle).
For the provided page/product/post, select the most appropriate trending focus keyword.
Then, write a highly optimized SEO Title (maximum 60 characters) and a compelling Meta Description (maximum 160 characters) in the page's language.
You must output ONLY a JSON object containing the keys "seo_title", "meta_description", and "focus_keyword" without any markdown wrapping or conversational text. Example:
{
  "seo_title": "Example Title | MaquiFit",
  "meta_description": "Compelling description about our products...",
  "focus_keyword": "example focus keyword"
}`;

  const userPrompt = `Optimize this item:
Title: ${item.title}
Slug: ${item.slug}
Language: ${item.language}
Content Type: ${item.content_type}
Current Title: ${item.current?.rank_math_title || ""}
Current Description: ${item.current?.rank_math_description || ""}
Current Keyword: ${item.current?.rank_math_focus_keyword || ""}`;

  const response = await fetch(`${HERMES_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${HERMES_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL_NAME,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Hermes API error: ${response.status} - ${errorText}`);
  }

  const resData = await response.json();
  let content = resData.choices?.[0]?.message?.content || "";

  // Clean code blocks if present
  const codeBlockRegex = /```(?:json)?\n([\s\S]*?)```/;
  const match = content.match(codeBlockRegex);
  if (match && match[1]) {
    content = match[1];
  }
  content = content.trim();

  try {
    const parsed = JSON.parse(content);
    return {
      seo_title: (parsed.seo_title || "").trim(),
      meta_description: (parsed.meta_description || "").trim(),
      focus_keyword: (parsed.focus_keyword || "").trim(),
    };
  } catch (err) {
    console.error("Failed to parse Hermes response content:", content, err);
    throw new Error("Hermes did not return a valid JSON object.");
  }
}

async function main() {
  try {
    console.log("Starting Hermes Agent SEO optimization...");
    await updateStatus("Hermes Agent: Reading workflow state...", 55);

    // Read settings
    let settings = { categories: ["product", "page", "post"] };
    try {
      const settingsContent = await fs.readFile(SETTINGS_FILE, "utf-8");
      settings = JSON.parse(settingsContent);
    } catch {
      console.log("Settings file not found, running with defaults.");
    }

    // Read workflow state
    let state;
    try {
      const stateContent = await fs.readFile(STATE_FILE, "utf-8");
      state = JSON.parse(stateContent);
    } catch (err) {
      throw new Error(`Could not load workflow_state.json: ${err.message}`);
    }

    const recs = state.recommendations || [];
    const enabledTypes = new Set(settings.categories || []);

    // Parse target post IDs from command line arguments
    let targetPostIds = null;
    const postIdsIdx = process.argv.indexOf("--post-ids");
    if (postIdsIdx !== -1 && process.argv[postIdsIdx + 1]) {
      targetPostIds = new Set(
        process.argv[postIdsIdx + 1].split(",").map(id => parseInt(id.trim(), 10))
      );
      console.log(`Filtering optimization to specific post IDs: ${process.argv[postIdsIdx + 1]}`);
    }

    const targetRecs = recs.filter(r => {
      const typeMatches = enabledTypes.has(r.content_type);
      const idMatches = !targetPostIds || targetPostIds.has(r.post_id);
      return typeMatches && idMatches;
    });
    console.log(`Found ${targetRecs.length} items to optimize out of ${recs.length} total recommendations.`);

    let completed = 0;
    for (const rec of recs) {
      if (!enabledTypes.has(rec.content_type) || (targetPostIds && !targetPostIds.has(rec.post_id))) {
        continue;
      }

      const progress = Math.min(60 + Math.floor((completed / targetRecs.length) * 35), 95);
      await updateStatus(`Hermes Agent: Optimizing "${rec.title}" (${rec.language}) ...`, progress);

      try {
        const optimized = await optimizeItem(rec);
        
        // Update proposed fields
        rec.proposed.rank_math_title = optimized.seo_title;
        rec.proposed.rank_math_description = optimized.meta_description;
        rec.proposed.rank_math_focus_keyword = optimized.focus_keyword;
        rec.proposed.score = calculateSimulatedScore(optimized.seo_title, optimized.meta_description, optimized.focus_keyword, rec.slug);
        rec.proposed.yoast_title = optimized.seo_title;
        rec.proposed.yoast_description = optimized.meta_description;
        rec.approved = true;

        // Recalculate changed fields
        rec.changed_fields = [];
        if (rec.proposed.rank_math_title !== rec.current.rank_math_title) {
          rec.changed_fields.push("rank_math_title");
        }
        if (rec.proposed.rank_math_description !== rec.current.rank_math_description) {
          rec.changed_fields.push("rank_math_description");
        }
        if (rec.proposed.rank_math_focus_keyword !== rec.current.rank_math_focus_keyword) {
          rec.changed_fields.push("rank_math_focus_keyword");
        }

        // Add a note
        if (!rec.notes.includes("agent-optimized")) {
          rec.notes.push("agent-optimized");
        }
        
        console.log(`Optimized ${rec.title}: Title="${optimized.seo_title}"`);
      } catch (err) {
        console.error(`Error optimizing item ${rec.post_id}:`, err.message);
        // Continue with other items, keep previous proposed values
      }

      completed++;
    }

    // Save updated state
    state.generated_at = new Date().toISOString();
    state.counts.changed = state.recommendations.filter(r => r.changed_fields && r.changed_fields.length > 0).length;
    await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");

    await updateStatus("SEO optimization completed successfully", 100, "idle");
    console.log("Hermes Agent SEO optimization completed.");
    process.exit(0);
  } catch (error) {
    console.error("Optimization failed:", error);
    await updateStatus("Failed during optimization", 100, "failed", error.message);
    process.exit(1);
  }
}

main();
