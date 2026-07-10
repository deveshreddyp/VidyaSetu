const { getAIClient, isMockMode } = require('../services/geminiService');
const { db } = require('../config/firebase');
const pdf = require('pdf-parse');

// ─── IMPROVED CHUNKING: Sentence-aware splitting ───
function chunkText(text, chunkSize = 2000, overlap = 300) {
  const chunks = [];
  const sentences = text.replace(/\n{2,}/g, '\n').split(/(?<=[.!?])\s+/);
  let current = '';

  for (const sentence of sentences) {
    if ((current + ' ' + sentence).length > chunkSize && current.length > 0) {
      chunks.push(current.trim());
      // Keep last few sentences as overlap
      const overlapSentences = current.split(/(?<=[.!?])\s+/);
      const overlapText = overlapSentences.slice(-3).join(' ');
      current = overlapText.length < overlap ? overlapText + ' ' + sentence : sentence;
    } else {
      current += (current ? ' ' : '') + sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [text];
}

// ─── IMPROVED RETRIEVAL: TF-IDF-like scoring with bigrams & position boost ───
function getTopChunks(chunks, query, topK = 5) {
  // Build query terms (unigrams + bigrams)
  const queryLower = query.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const words = queryLower.split(/\s+/).filter(w => w.length > 2);
  const bigrams = [];
  for (let i = 0; i < words.length - 1; i++) {
    bigrams.push(words[i] + ' ' + words[i + 1]);
  }
  
  if (words.length === 0) return chunks.slice(0, topK);

  // IDF approximation: terms appearing in fewer chunks get higher weight
  const docFreq = {};
  for (const w of [...words, ...bigrams]) {
    docFreq[w] = 0;
    for (const chunk of chunks) {
      if (chunk.toLowerCase().includes(w)) docFreq[w]++;
    }
  }
  const N = chunks.length || 1;

  const scoredChunks = chunks.map((chunk, idx) => {
    let score = 0;
    const chunkLower = chunk.toLowerCase();

    // Unigram TF-IDF
    for (const w of words) {
      let count = 0;
      let searchIdx = 0;
      while ((searchIdx = chunkLower.indexOf(w, searchIdx)) !== -1) {
        count++;
        searchIdx += w.length;
      }
      const tf = count;
      const idf = Math.log(1 + N / (1 + (docFreq[w] || 1)));
      score += tf * idf;
    }

    // Bigram boost (2x weight for phrase matches)
    for (const bg of bigrams) {
      if (chunkLower.includes(bg)) {
        const idf = Math.log(1 + N / (1 + (docFreq[bg] || 1)));
        score += 2 * idf;
      }
    }

    // Position bias: earlier chunks slightly preferred (introductory material)
    score *= (1 + 0.1 / (idx + 1));

    return { chunk, score };
  });

  scoredChunks.sort((a, b) => b.score - a.score);
  return scoredChunks.slice(0, Math.max(topK, 1)).filter(sc => sc.score > 0).map(sc => sc.chunk);
}

// ─── SMART SUMMARIZER: Compress retrieved context to stay under token limits ───
function compressContext(topChunks, maxLength = 6000) {
  let result = '';
  for (const chunk of topChunks) {
    if ((result + '\n\n' + chunk).length > maxLength) {
      // Add as much of the final chunk as possible
      const remaining = maxLength - result.length - 10;
      if (remaining > 200) result += '\n\n' + chunk.substring(0, remaining) + '...';
      break;
    }
    result += (result ? '\n\n---\n\n' : '') + chunk;
  }
  return result || 'No relevant context found in the uploaded notes.';
}

const memoryStore = new Map();

exports.uploadPDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded.' });
    }

    // Parse the PDF buffer
    const data = await pdf(req.file.buffer);
    const text = data.text;

    const sessionId = req.body.sessionId || 'default-session';
    
    // Improved sentence-aware chunking
    const chunks = chunkText(text, 2000, 300);

    // Persist to in-memory store instead of Firestore to bypass Quota exceeded
    memoryStore.set(sessionId, {
      chunks: chunks,
      updatedAt: new Date().toISOString(),
      totalChunks: chunks.length,
      totalPages: data.numpages,
      fileName: req.file.originalname || 'unknown.pdf',
      preview: text.substring(0, 300) + '...'
    });

    res.status(200).json({ 
      message: 'PDF processed and indexed successfully', 
      pages: data.numpages,
      chunksGenerated: chunks.length,
      preview: text.substring(0, 300) + '...'
    });
  } catch (error) {
    console.error('PDF Upload Error:', error);
    res.status(500).json({ error: 'Failed to process PDF' });
  }
};

exports.chat = async (req, res) => {
  try {
    const { message, sessionId = 'default-session', history = [], mode = 'tutor' } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    // Retrieve context from memory
    const sessionData = memoryStore.get(sessionId);
    let allChunks = sessionData ? sessionData.chunks : [];

    // Improved RAG retrieval with TF-IDF scoring
    let relevantContext = 'No specific document context provided. The student has not uploaded any notes yet.';
    let retrievalInfo = { chunksAvailable: allChunks.length, chunksRetrieved: 0 };

    if (allChunks.length > 0) {
      const topChunks = getTopChunks(allChunks, message, 5);
      relevantContext = compressContext(topChunks);
      retrievalInfo.chunksRetrieved = topChunks.length;
    }

    // Adaptive system prompt based on mode
    let systemPrompt;
    
    if (mode === 'explain') {
      systemPrompt = `You are Pathfinder AI, a patient academic tutor for CMRIT students.
The student is asking you to EXPLAIN a concept from their notes.

YOUR INSTRUCTIONS:
1. Use ONLY the context notes below. If the answer is not in the notes, say so honestly.
2. Break down the explanation using clear Markdown indexing (use numbered lists 1., 2., 3., etc. and bullet points).
3. Use analogies and real-world examples to make it intuitive.
4. Keep your response under 4 paragraphs.
5. End with a simple check-in question: "Does this make sense?" or a quick quiz question.

CONTEXT NOTES (RAG Retrieved — ${retrievalInfo.chunksRetrieved} of ${retrievalInfo.chunksAvailable} chunks):
---
${relevantContext}
---`;
    } else if (mode === 'quiz-me') {
      systemPrompt = `You are Pathfinder AI, an academic tutor for CMRIT students.
The student wants you to QUIZ them on their uploaded notes.

YOUR INSTRUCTIONS:
1. Generate exactly 3 short questions based ONLY on the context notes below.
2. Use clear, numbered indexing (1., 2., 3.) for the questions. Mix question types: 1 MCQ, 1 fill-in-the-blank, 1 short answer.
3. After listing the questions, provide the answers in a separate "ANSWERS" section using corresponding indexing.
4. Keep it concise and focused.

CONTEXT NOTES (RAG Retrieved — ${retrievalInfo.chunksRetrieved} of ${retrievalInfo.chunksAvailable} chunks):
---
${relevantContext}
---`;
    } else if (mode === 'summarize') {
      systemPrompt = `You are Pathfinder AI, an academic tutor for CMRIT students.
The student wants a SUMMARY of their uploaded notes.

YOUR INSTRUCTIONS:
1. Summarize ONLY what is in the context notes below.
2. Structure your summary with clear Markdown indexing, using main numbered sections and nested bullet points.
3. Highlight important terms in **bold**.
4. Keep it under 300 words.
5. End with: "Key takeaways: [2-3 sentence summary]"

CONTEXT NOTES (RAG Retrieved — ${retrievalInfo.chunksRetrieved} of ${retrievalInfo.chunksAvailable} chunks):
---
${relevantContext}
---`;
    } else {
      // Default tutor mode
      systemPrompt = `You are Pathfinder AI, an institutional academic tutor for CMRIT.
Your goal is to help students learn by guiding them to answers, not giving direct answers.

IMPORTANT CONSTRAINTS:
1. RAG PIPELINE: You MUST prioritize the CONTEXT NOTES below. If the answer exists in the notes, cite it. If not, clearly state you're using general knowledge.
2. FORMATTING: Use clear Markdown indexing. Always structure your responses with numbered lists (1., 2., 3.) or bullet points to make it highly readable.
3. BE CONCISE: Keep responses under 3 short paragraphs.
4. SOCRATIC METHOD: Guide the student to discover the answer. Ask clarifying questions.
5. REMEDIATION: If the student is struggling, break the concept into the simplest possible steps using indexed points.
6. Always end your response with a thought-provoking follow-up question.
7. If a question is entirely unrelated to academics, politely redirect: "That's outside our syllabus scope. What topic from your notes can I help with?"

CONTEXT NOTES (RAG Retrieved — ${retrievalInfo.chunksRetrieved} of ${retrievalInfo.chunksAvailable} chunks):
---
${relevantContext}
---`;
    }

    // Try API call
    try {
      const ai = getAIClient();
      
      const formattedHistory = history.slice(-10).map(msg => ({
        role: msg.role === 'ai' ? 'assistant' : 'user',
        content: msg.content
      }));

      const completion = await ai.chat.completions.create({
        model: "google/gemini-2.5-flash",
        max_tokens: 1200,
        messages: [
          { role: "system", content: systemPrompt },
          ...formattedHistory,
          { role: "user", content: message }
        ]
      });

      const text = completion.choices[0].message.content;

      res.status(200).json({ 
        response: text,
        retrieval: retrievalInfo
      });
    } catch (apiError) {
      console.error("Gemini API Error:", apiError.message);
      if (isMockMode()) {
        return res.status(200).json({ 
          response: `[MOCK MODE — RAG Active]\n\n📚 I retrieved **${retrievalInfo.chunksRetrieved}** relevant chunks from your **${retrievalInfo.chunksAvailable}** total indexed chunks.\n\n**Based on your notes:**\nThe concept you're asking about relates to the key topics in your uploaded document. In a live environment, I would provide a detailed, grounded explanation here.\n\n**Quick check:** Can you tell me what you already understand about this topic?`,
          retrieval: retrievalInfo
        });
      }
      throw apiError;
    }

  } catch (error) {
    console.error('Chat Error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
};
