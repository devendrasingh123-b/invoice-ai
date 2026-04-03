const Groq = require('groq-sdk');
require('dotenv').config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const SYSTEM_PROMPT = `You are an expert invoice data extraction AI.
Extract structured data from raw text of invoices.

RULES:
1. Return ONLY valid JSON — no explanation, no markdown, no backticks.
2. Missing fields should be null.
3. Normalize vendor names (e.g., "AMAZON.COM" → "Amazon").
4. Dates must be YYYY-MM-DD format.
5. All amounts must be numbers (not strings).

Return exactly this JSON structure:
{
  "vendor": "string or null",
  "invoice_number": "string or null",
  "invoice_date": "YYYY-MM-DD or null",
  "due_date": "YYYY-MM-DD or null",
  "currency": "USD/INR/EUR or null",
  "subtotal": number or null,
  "tax_amount": number or null,
  "discount_amount": number or null,
  "total_amount": number or null,
  "payment_terms": "string or null",
  "billing_address": "string or null",
  "line_items": [
    {
      "description": "string",
      "quantity": number,
      "unit_price": number,
      "total": number
    }
  ],
  "notes": "string or null"
}`;

function calculateConfidence(data) {
  const critical = ['vendor', 'invoice_number', 'invoice_date', 'total_amount', 'currency'];
  const secondary = ['subtotal', 'tax_amount', 'due_date', 'line_items', 'billing_address'];

  const criticalScore = critical.filter(f =>
    data[f] !== null && data[f] !== undefined
  ).length / critical.length;

  const secondaryScore = secondary.filter(f =>
    data[f] !== null && data[f] !== undefined &&
    (Array.isArray(data[f]) ? data[f].length > 0 : true)
  ).length / secondary.length;

  return Math.round((criticalScore * 0.7 + secondaryScore * 0.3) * 100) / 100;
}

async function parseInvoice(rawText, template = null, retry = 0) {
  const maxRetries = 2;

  try {
    let prompt = `Extract invoice data from this text and return ONLY JSON:\n\n${rawText}`;

    if (template) {
      prompt += `\n\nHINT: Similar invoice seen before. Previous vendor: ${template.vendor}, Currency: ${template.currency}.`;
    }

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature: 0,
      max_tokens: 1500,
      response_format: { type: 'json_object' }
    });

    const responseText = response.choices[0].message.content;

    // Clean response
    const cleaned = responseText
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const data = JSON.parse(cleaned);
    const confidence = calculateConfidence(data);
    data.confidence = confidence;

    console.log('✅ Invoice parsed! Confidence:', confidence);
    return { data, confidence };

  } catch (err) {
    console.log('LLM Error:', err.message);
    if (retry < maxRetries) {
      console.log(`Retrying... attempt ${retry + 1}`);
      return await parseInvoice(rawText, template, retry + 1);
    }
    return {
      data: {
        vendor: null,
        invoice_number: null,
        total_amount: null,
        currency: null,
        confidence: 0
      },
      confidence: 0
    };
  }
}

module.exports = { parseInvoice };