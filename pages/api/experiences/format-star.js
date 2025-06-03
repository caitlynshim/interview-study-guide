import { openai } from '../../../lib/openai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { question, content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Content is required' });
    }

    const prompt = `You are helping structure an interview experience into STAR format (Situation, Task, Action, Result). 

Please reformat the following experience into a clear, well-structured narrative using STAR format. Keep it in narrative format (not bullet points) and preserve ALL details from the original content. Do not remove any specifics, numbers, outcomes, or context.

Original Question: ${question || 'Interview question'}

Original Experience:
${content}

Please structure this as:

**Situation:** [Describe the context and background in narrative form]

**Task:** [Explain what needed to be accomplished in narrative form]  

**Action:** [Detail the specific steps and actions taken in narrative form]

**Result:** [Describe the outcomes, impact, and lessons learned in narrative form]

Keep the tone professional but conversational, as if telling the story in an interview. Preserve all technical details, metrics, timelines, and specific examples from the original content.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert interview coach helping candidates structure their experiences using the STAR method. Always preserve all details and keep responses in clear narrative format.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const formattedContent = completion.choices[0]?.message?.content;

    if (!formattedContent) {
      throw new Error('No formatted content received from OpenAI');
    }

    res.status(200).json({ 
      formattedContent: formattedContent.trim(),
      originalContent: content 
    });

  } catch (error) {
    console.error('[API /api/experiences/format-star] Error:', error);
    res.status(500).json({ 
      message: 'Failed to format experience in STAR format', 
      error: error.message 
    });
  }
} 