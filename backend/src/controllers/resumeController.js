const { getAIClient, isMockMode } = require('../services/geminiService');

exports.generateBulletPoints = async (req, res) => {
  try {
    const { role, company, description } = req.body;

    if (!role || !description) {
      return res.status(400).json({ error: 'Role and description are required.' });
    }

    const systemPrompt = `You are CareerSetu AI, an elite ATS resume builder and expert career coach for CMRIT college.
CRITICAL CONTENT INSTRUCTIONS:
1. You MUST format bullet points using the CMRIT Placement Cell rules: Start with a strong Action Verb -> Describe the Task/Action -> End with a quantifiable Metric/Impact.
2. Example: "Developed a **React.js** dashboard reducing load times by **40%** and serving **1,000+** users."
3. NO generic summaries. Include measurable impact, tools used, and outcomes.
4. Projects MUST have descriptions, problem statements, achievements, and outcomes. 
5. Tie Tools & Technologies directly to actual implementation impact. Avoid vague role descriptions like "Frontend".
6. Highlight important project keywords and technologies in **bold** (e.g., **Python**, **AWS**, **REST APIs**).
7. Eliminate vague, repetitive verbs like "Created", "Developed", "Utilised" without explanation.
8. Output MUST be highly concise, strictly formatted, and directly actionable.
IMPORTANT: Be extremely concise to save tokens. Provide ONLY the requested JSON array output without conversational filler.
Return ONLY a JSON array of strings. No markdown wrappers.`;

    try {
      const ai = getAIClient();
      const completion = await ai.chat.completions.create({
        model: "google/gemini-2.5-flash",
        max_tokens: 1000,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Role: ${role}${company ? `, Company/Context: ${company}` : ''}. Description: ${description}` }
        ]
      });
      let text = completion.choices[0].message.content;
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const bullets = JSON.parse(text);
      res.status(200).json({ bullets });
    } catch (apiError) {
      console.error("Gemini API Error (Bullets):", apiError.message);
      if (isMockMode()) {
        return res.status(200).json({
          bullets: [
            `Led the ${role} initiative, delivering key features on time and under budget.`,
            `Collaborated cross-functionally to implement solutions that improved user engagement by 25%.`,
            `Designed and deployed scalable architecture, reducing system downtime by 30%.`
          ]
        });
      }
      throw apiError;
    }
  } catch (error) {
    console.error('Bullet Point Error:', error);
    res.status(500).json({ error: 'Failed to generate bullet points.' });
  }
};

exports.suggestSkills = async (req, res) => {
  try {
    const { field, currentSkills = [] } = req.body;

    if (!field) {
      return res.status(400).json({ error: 'Field/domain is required.' });
    }

    const systemPrompt = `
You are a career advisor. Given a student's field of study or target job domain and their current skills,
suggest 8-10 additional, relevant, and trending skills they should add to their resume.
Separate them into "technical" and "soft" skills.
Return ONLY valid JSON with this structure: { "technical": ["skill1", ...], "soft": ["skill1", ...] }
No markdown wrappers.
`;

    try {
      const ai = getAIClient();
      const completion = await ai.chat.completions.create({
        model: "google/gemini-2.5-flash",
        max_tokens: 1000,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Field: ${field}. Current skills: ${currentSkills.join(', ') || 'None listed'}.` }
        ]
      });
      let text = completion.choices[0].message.content;
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const skills = JSON.parse(text);
      res.status(200).json(skills);
    } catch (apiError) {
      console.error("Gemini API Error (Skills):", apiError.message);
      if (isMockMode()) {
        return res.status(200).json({
          technical: ['Python', 'React.js', 'SQL', 'Git', 'Docker', 'AWS'],
          soft: ['Communication', 'Leadership', 'Problem Solving', 'Teamwork']
        });
      }
      throw apiError;
    }
  } catch (error) {
    console.error('Skills Suggestion Error:', error);
    res.status(500).json({ error: 'Failed to suggest skills.' });
  }
};

exports.analyzeATS = async (req, res) => {
  try {
    const { resumeData, jdText } = req.body;

    if (!resumeData || !jdText) {
      return res.status(400).json({ error: 'Both resumeData and jdText are required.' });
    }

    const systemPrompt = `
You are an expert ATS (Applicant Tracking System) Analyzer and Technical HR Recruiter.
Analyze the provided candidate resume data against the provided Job Description (JD).
Return a valid JSON object with the following structure:
{
  "score": number, // ATS Match Score out of 100
  "missingKeywords": ["keyword1", "keyword2"], // Important keywords from JD missing in resume
  "hrQuestions": ["Q1", "Q2", "Q3"], // Expected Behavioral/HR interview questions
  "technicalQuestions": ["Q1", "Q2", "Q3"] // Expected Technical interview questions based on the JD
}
Return ONLY the JSON. No markdown formatting (\`\`\`json).
`;

    try {
      const ai = getAIClient();
      const completion = await ai.chat.completions.create({
        model: "google/gemini-2.5-flash",
        max_tokens: 1500,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Job Description:\n${jdText}\n\nResume Data:\n${JSON.stringify(resumeData)}` }
        ]
      });
      let text = completion.choices[0].message.content;
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const analysis = JSON.parse(text);
      res.status(200).json(analysis);
    } catch (apiError) {
      console.error("Gemini API Error (Analyze ATS):", apiError.message);
      if (isMockMode()) {
        return res.status(200).json({
          score: 85,
          missingKeywords: ["Docker", "Agile Methodologies", "GraphQL"],
          hrQuestions: ["Tell me about a time you worked on a tight deadline.", "Why do you want to work for our company?"],
          technicalQuestions: ["How do you manage state in a React application?", "Explain the difference between SQL and NoSQL."]
        });
      }
      throw apiError;
    }
  } catch (error) {
    console.error('ATS Analysis Error:', error);
    res.status(500).json({ error: 'Failed to analyze resume for ATS.' });
  }
};

exports.generateCoverLetter = async (req, res) => {
  try {
    const { resumeData, jdText } = req.body;

    if (!resumeData || !jdText) {
      return res.status(400).json({ error: 'Both resumeData and jdText are required.' });
    }

    const systemPrompt = `
You are an expert Career Coach and Copywriter. 
Write a highly professional, tailored cover letter for the candidate using their Resume Data and the provided Job Description.
The cover letter MUST:
1. Be approximately 3-4 paragraphs.
2. Directly address how the candidate's specific skills and projects solve the needs in the job description.
3. Keep the tone enthusiastic, confident, and highly professional.
4. DO NOT use placeholders like [Company Name] if it can be inferred from the JD. If you can't infer it, use "Hiring Manager".
Return ONLY the cover letter text. No markdown blocks, just the text.
`;

    try {
      const ai = getAIClient();
      const completion = await ai.chat.completions.create({
        model: "google/gemini-2.5-flash",
        max_tokens: 1500,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Job Description:\n${jdText}\n\nResume Data:\n${JSON.stringify(resumeData)}` }
        ]
      });
      let text = completion.choices[0].message.content.trim();
      res.status(200).json({ coverLetter: text });
    } catch (apiError) {
      console.error("Gemini API Error (Cover Letter):", apiError.message);
      if (isMockMode()) {
        return res.status(200).json({
          coverLetter: "Dear Hiring Manager,\n\nI am writing to express my strong interest in the open position. With my background in software engineering, particularly in React and Node.js, I am confident in my ability to contribute effectively to your team. My recent projects align perfectly with the requirements mentioned in your job description.\n\nThank you for considering my application."
        });
      }
      throw apiError;
    }
  } catch (error) {
    console.error('Cover Letter Error:', error);
    res.status(500).json({ error: 'Failed to generate cover letter.' });
  }
};
