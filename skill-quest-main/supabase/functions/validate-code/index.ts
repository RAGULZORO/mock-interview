import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, language, question, examples } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Validating code for question:", question?.substring(0, 50));
    console.log("Language:", language);

    const systemPrompt = `You are a code validator. Analyze the user's code solution and validate it against the given problem and test cases.

Your response MUST be a valid JSON object with this exact structure:
{
  "isCorrect": boolean,
  "testResults": [
    {
      "input": "string",
      "expectedOutput": "string",
      "actualOutput": "string",
      "passed": boolean
    }
  ],
  "feedback": "string with detailed feedback",
  "score": number between 0 and 100
}

Be thorough in your analysis. Check:
1. Logic correctness
2. Edge cases handling
3. Time/space complexity if relevant
4. Code quality and best practices

If the code has syntax errors or won't run, mark isCorrect as false and explain in feedback.`;

    const userPrompt = `Problem: ${question}

Test Cases:
${examples?.map((ex: any, i: number) => `Test ${i + 1}: Input: ${ex.input}, Expected Output: ${ex.output}`).join('\n') || 'No test cases provided'}

User's ${language} Code:
\`\`\`${language}
${code}
\`\`\`

Analyze this code and validate it against the test cases. Return ONLY valid JSON.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    console.log("AI response:", content?.substring(0, 200));

    // Parse the JSON response from AI
    let validationResult;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                       content.match(/```\s*([\s\S]*?)\s*```/) ||
                       [null, content];
      validationResult = JSON.parse(jsonMatch[1] || content);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      validationResult = {
        isCorrect: false,
        testResults: [],
        feedback: content || "Unable to validate code. Please try again.",
        score: 0
      };
    }

    return new Response(JSON.stringify(validationResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Validation error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      isCorrect: false,
      testResults: [],
      feedback: "An error occurred during validation.",
      score: 0
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
