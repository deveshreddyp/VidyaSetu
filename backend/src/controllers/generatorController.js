const { getAIClient, isMockMode } = require('../services/geminiService');

exports.generateWorksheet = async (req, res) => {
  try {
    const { subject, grade, chapter, difficulty, contextText } = req.body;

    if (!subject || !grade || !chapter) {
      return res.status(400).json({ error: 'Subject, Grade, and Chapter are required.' });
    }

    const contextInstruction = contextText 
      ? `\nCRITICAL CONTEXT: You MUST base ALL your questions strictly on the following reference material. Do not include outside facts not present in this context.\n\n"""\n${contextText}\n"""\n`
      : '';

    const systemPrompt = `You are a strict and highly intelligent educational assistant. 
Generate content strictly following the user's requested JSON or Markdown format.
IMPORTANT: You MUST be extremely concise to save tokens. Do not add filler text.
BE EXTREMELY CONCISE.
Topic: ${subject}, Grade ${grade}, Chapter: ${chapter}.
The user requested a base difficulty of: ${difficulty || 'Medium'}.${contextInstruction}

Your task is to generate THREE distinct worksheets covering this topic:
1. "Easy" - Focusing on basic concepts and foundational knowledge.
2. "Medium" - Applying concepts with standard problem-solving.
3. "Hard" - Advanced critical thinking and complex problems.

Format the output strictly as a JSON object with this structure:
{
  "easy": "# Worksheet: ${chapter} (Easy)\\n\\n...",
  "medium": "# Worksheet: ${chapter} (Medium)\\n\\n...",
  "hard": "# Worksheet: ${chapter} (Hard)\\n\\n..."
}

Ensure the content inside the strings is formatted in Markdown. Include a mix of multiple choice, short answer, and word problems.
Do NOT include any markdown code block wrappers (like \`\`\`json) in the final output, just pure JSON string.
`;

    try {
      const ai = getAIClient();
      const completion = await ai.chat.completions.create({
        model: "google/gemini-2.5-flash",
        max_tokens: 1000,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate the 3 worksheets for Grade ${grade} ${subject} on ${chapter}.` }
        ]
      });
      let text = completion.choices[0].message.content;
      
      // Clean up potential markdown JSON wrappers
      text = text.replace(/```json\n/g, '').replace(/```\n?/g, '');
      
      const parsedWorksheets = JSON.parse(text);
      res.status(200).json(parsedWorksheets);
    } catch (apiError) {
      console.error("Gemini API Error in Generator:", apiError.message);
      if (isMockMode()) {
        // Return Mock Data
        return res.status(200).json({
          easy: `# Worksheet: ${chapter} (Easy)\n\n**Name:** ________________\n**Date:** ________________\n\n### Part 1: Basics\n1. What is the main idea of ${chapter}?\n2. Define the key term associated with ${subject}.\n\n### Part 2: True or False\n3. ${chapter} is typically learned in Grade ${grade}. (T/F)`,
          medium: `# Worksheet: ${chapter} (Medium)\n\n**Name:** ________________\n**Date:** ________________\n\n### Part 1: Application\n1. Explain how ${chapter} applies to a real-world scenario.\n2. Solve a standard problem related to ${subject}.\n\n### Part 2: Short Answer\n3. Compare and contrast two concepts from this chapter.`,
          hard: `# Worksheet: ${chapter} (Hard)\n\n**Name:** ________________\n**Date:** ________________\n\n### Part 1: Critical Thinking\n1. Analyze the long-term impact of ${chapter} on ${subject}.\n2. Create your own complex word problem based on this topic and solve it.\n\n### Part 2: Essay\n3. Write a short paragraph synthesizing the main themes of ${chapter}.`
        });
      }
      throw apiError;
    }

  } catch (error) {
    console.error('Worksheet Generator Error:', error);
    res.status(500).json({ error: 'Failed to generate worksheets.' });
  }
};

exports.generateQuiz = async (req, res) => {
  try {
    const { subject, topic, numQuestions = 5, contextText } = req.body;

    if (!subject || !topic) {
      return res.status(400).json({ error: 'Subject and Topic are required.' });
    }

    const contextInstruction = contextText 
      ? `\nCRITICAL CONTEXT: You MUST base ALL your questions and answers strictly on the following reference material. Do not test knowledge outside of this provided context.\n\n"""\n${contextText}\n"""\n`
      : '';

    const systemPrompt = `
You are an expert quiz creator. Generate a multiple-choice quiz (MCQ).
Subject: ${subject}
Topic: ${topic}
Number of questions: ${numQuestions}${contextInstruction}

Return ONLY a valid JSON array. Each element must have this exact structure:
{
  "id": 1,
  "question": "What is ...?",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctIndex": 0,
  "explanation": "Brief explanation of the correct answer."
}

Rules:
- correctIndex is the 0-based index of the correct option.
- Each question must have exactly 4 options.
- Make questions progressively harder.
- Do NOT wrap the output in markdown code fences. Return raw JSON only.
`;

    try {
      const ai = getAIClient();
      const completion = await ai.chat.completions.create({
        model: "google/gemini-2.5-flash",
        max_tokens: 1000,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate ${numQuestions} MCQ questions on ${topic} for ${subject}.` }
        ]
      });
      let text = completion.choices[0].message.content;

      // Strip potential markdown wrappers
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      const questions = JSON.parse(text);
      res.status(200).json({ questions });
    } catch (apiError) {
      console.error("Gemini API Error in Quiz Generator:", apiError.message);
      if (isMockMode()) {
        // Return mock quiz data
        const mockQuestions = Array.from({ length: Math.min(numQuestions, 5) }, (_, i) => ({
          id: i + 1,
          question: `Sample question ${i + 1} about ${topic} in ${subject}?`,
          options: [
            `Correct answer for Q${i + 1}`,
            `Wrong option A for Q${i + 1}`,
            `Wrong option B for Q${i + 1}`,
            `Wrong option C for Q${i + 1}`
          ],
          correctIndex: 0,
          explanation: `This is the explanation for question ${i + 1} about ${topic}.`
        }));
        return res.status(200).json({ questions: mockQuestions });
      }
      throw apiError;
    }

  } catch (error) {
    console.error('Quiz Generator Error:', error);
    res.status(500).json({ error: 'Failed to generate quiz.' });
  }
};

const pdfParse = require('pdf-parse');

exports.parsePdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded.' });
    }
    const data = await pdfParse(req.file.buffer);
    res.status(200).json({ text: data.text });
  } catch (error) {
    console.error('PDF Parsing Error:', error);
    res.status(500).json({ error: 'Failed to process PDF.' });
  }
};

exports.generateRoadmap = async (req, res) => {
  try {
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ error: 'Role is required.' });
    }

    const systemPrompt = `
You are an expert Career Advisor.
Generate a structured 12-week (3-month) learning roadmap for a student aiming to become a: ${role}.
Format the output purely as a Markdown string with NO markdown code block wrappers.
Include:
- Week 1-4: Foundations
- Week 5-8: Core Skills & Projects
- Week 9-12: Advanced Concepts & Interview Prep
Make it engaging, actionable, and modern.
CRITICAL FORMATTING INSTRUCTION: Use clear Markdown indexing. Every major section MUST use numbered lists (1., 2., 3.) and every sub-point MUST use bullet points (- or *) for high readability.
`;

    try {
      const ai = getAIClient();
      const completion = await ai.chat.completions.create({
        model: "google/gemini-2.5-flash",
        max_tokens: 1500,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Please generate the roadmap for ${role}.` }
        ]
      });
      let text = completion.choices[0].message.content.trim();
      res.status(200).json({ roadmap: text });
    } catch (apiError) {
      console.error("Gemini API Error (Roadmap):", apiError.message);
      if (isMockMode()) {
        return res.status(200).json({
          roadmap: `# Career Roadmap: ${role}\n\n## Month 1: Foundations\n- Week 1: Learn basic syntax and ecosystem.\n- Week 2: Build 2 small projects.\n- Week 3: Understand networking and APIs.\n- Week 4: Version control and Git.\n\n## Month 2: Core Skills\n- Focus on intermediate concepts and frameworks.\n\n## Month 3: Interview Prep\n- Leetcode, mock interviews, and final portfolio.`
        });
      }
      throw apiError;
    }
  } catch (error) {
    console.error('Roadmap Error:', error);
    res.status(500).json({ error: 'Failed to generate roadmap.' });
  }
};

exports.generateMasteryNotes = async (req, res) => {
  try {
    const { contextText } = req.body;
    if (!contextText) return res.status(400).json({ error: 'Context text is required' });

    const systemPrompt = `You are an expert tutor. The student has uploaded their class notes or textbook material.
Your task is to transform this raw material into highly effective "Mastery Notes".
Format the output in clean, readable Markdown with:
1. **Key Concepts**: A high-level summary of the main ideas.
2. **Detailed Breakdown**: Bulleted, easily digestible points of the core material.
3. **Quick Review Questions**: 3-5 short questions to test their understanding.
4. **Memory Hooks / Mnemonics**: (If applicable) Tricks to help them remember.

Keep the tone encouraging, concise, and highly educational.`;

    const ai = getAIClient();
    const completion = await ai.chat.completions.create({
      model: "google/gemini-2.5-flash",
      max_tokens: 1500,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Here is the material:\n\n${contextText}` }
      ]
    });
    
    res.status(200).json({ notes: completion.choices[0].message.content });
  } catch (error) {
    console.error('Mastery Notes Error:', error);
    res.status(500).json({ error: 'Failed to generate mastery notes.' });
  }
};
