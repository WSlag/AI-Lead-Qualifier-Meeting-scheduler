# AI Specification — DeepSeek

> **LLM:** DeepSeek. This project does **not** use Gemini.

## Purpose

DeepSeek qualifies an incoming lead and returns structured data for downstream automation and scheduling.

## Input

The model receives:

- Name
- Email
- Company
- Message

## Request Shape (n8n HTTP Request node)

```
POST https://api.deepseek.com/chat/completions
Authorization: Bearer <DEEPSEEK_API_KEY>
Content-Type: application/json

{
  "model": "deepseek-chat",
  "response_format": { "type": "json_object" },
  "messages": [
    {
      "role": "system",
      "content": "You are a sales lead qualification assistant. Analyze the supplied lead information and return ONLY valid JSON — do not wrap the response in markdown code blocks. Score the lead from 0 to 100 based on apparent business need, relevance, buying intent, and clarity of the request. Priority: HIGH (80-100), MEDIUM (50-79), LOW (0-49). Do not invent facts not present in the lead. Response must be JSON with keys: score, priority, intent, summary, recommendedAction."
    },
    {
      "role": "user",
      "content": "Lead: name=<name>, email=<email>, company=<company>, message=<message>"
    }
  ]
}
```

Because the DeepSeek API is OpenAI-compatible, an alternative is an OpenAI node with base URL `https://api.deepseek.com`. The `response_format: json_object` requires the word "json" to appear in the prompt — it does.

## System Instruction (must contain "json")

> You are a sales lead qualification assistant. Analyze the supplied lead information and return ONLY valid JSON — do not wrap the response in markdown code blocks. Score the lead from 0 to 100 based on apparent business need, relevance, buying intent, and clarity of the request. Priority: HIGH (80-100), MEDIUM (50-79), LOW (0-49). Do not invent facts that are not present in the lead.

## Expected JSON

```json
{
  "score": 85,
  "priority": "HIGH",
  "intent": "AI Automation",
  "summary": "Potential customer interested in automating sales operations.",
  "recommendedAction": "Book a discovery call"
}
```

## Output Rules

- `score` must be an integer from 0 to 100.
- `priority` must be LOW, MEDIUM, or HIGH.
- `intent` must be concise.
- `summary` must be one or two sentences.
- `recommendedAction` must be a practical next step.
- No Markdown fences.
- No commentary outside the JSON.

## Parsing and Normalization (n8n Code node)

The workflow **does not trust** the raw model output blindly. After the HTTP call:

1. Read `choices[0].message.content`.
2. Strip markdown code fences (```` ```json ```` / ```` ``` ````) if present, then `JSON.parse` it.
3. Recompute `priority` from `score` when the model returns an invalid/missing priority:

```
score >= 80 → HIGH
score >= 50 → MEDIUM
else        → LOW
```

4. Reject if `score` is outside 0–100. Never write malformed output to Firestore.

## Safety / Quality

- Distinguish what the lead explicitly states from what is inferred.
- If information is insufficient, use a lower confidence score rather than inventing details.
- The n8n validation node runs **before** the model call: missing name/email/message never reaches DeepSeek.