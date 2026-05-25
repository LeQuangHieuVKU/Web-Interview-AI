import fs from "fs";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { askAi } from "../services/openRouter.service.js";
import User from "../models/user_model.js";
import Interview from "../models/interview.model.js";
import { diff } from "util";
import console, { error, time } from "console";

const parseAiJson = (rawText) => {
  if (!rawText || typeof rawText !== "string") return null;

  const direct = rawText.trim();
  try {
    return JSON.parse(direct);
  } catch {
    // Try common markdown code-fence format first.
    const fenceMatch = direct.match(/```json\s*([\s\S]*?)\s*```/i);
    if (fenceMatch?.[1]) {
      try {
        return JSON.parse(fenceMatch[1]);
      } catch {
        // Continue to generic object extraction below.
      }
    }

    const objectMatch = direct.match(/\{[\s\S]*\}/);
    if (!objectMatch?.[0]) return null;

    try {
      return JSON.parse(objectMatch[0]);
    } catch {
      return null;
    }
  }
};

const fallbackQuestions = (role, experience, mode) => [
  `Can you briefly introduce your background and explain why you chose a ${mode.toLowerCase()} interview for ${role} opportunities?`,
  `What core skills from your ${experience} experience help you deliver reliable results in a ${role} position?`,
  `Describe a challenging project you handled, your approach, and the measurable impact of your contribution on the outcome.`,
  `How do you prioritize tasks and collaborate with teammates when deadlines are tight and requirements change unexpectedly?`,
  `If you joined as a ${role} tomorrow, what 30-60-90 day plan would you execute to create meaningful impact?`,
];

const normalizeQuestions = (aiResponse) => {
  if (!aiResponse || typeof aiResponse !== "string") return [];

  return aiResponse
    .split("\n")
    .map((q) => q.replace(/^\d+[.)-]?\s*/, "").trim())
    .filter((q) => q.length > 0)
    .slice(0, 5);
};

export const analyzeResume = async (req, res) => {
  let filePath;
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    filePath = req.file.path;

    const fileBuffer = await fs.promises.readFile(filePath);
    const uint8Array = new Uint8Array(fileBuffer);

    const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;

    let resumeText = "";

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const pageText = content.items.map((item) => item.str).join(" ");
      resumeText += pageText + "\n";
    }

    resumeText = resumeText.replace(/\s+/g, " ").trim();

    const messages = [
      {
        role: "system",
        content: `Extract structured information from the resume.

        Return ONLY valid JSON.

        Format:
        {
          "role": "string",
          "experience": "string",
          "projects": ["project1", "project2"],
          "skills": ["skill1", "skill2"]
        }

        Rules:
        - Do not include markdown or explanations.
        - If information is missing, return empty string or empty array.
        - Keep values concise.
        - Do not hallucinate information.`,
      },
      { role: "user", content: resumeText },
    ];

    let parsed = {};
    try {
      const aiResponse = await askAi(messages);
      parsed = parseAiJson(aiResponse) || {};
    } catch (aiError) {
      console.error("Resume AI parsing fallback:", aiError.message);
    }

    res.json({
      role: parsed.role || "",
      experience: parsed.experience || "",
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      resumeText,
    });
  } catch (error) {
    console.error("Error analyzing resume:", error);

    return res
      .status(500)
      .json({ message: "Failed to analyze resume", error: error.message });
  } finally {
    if (filePath && fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }
};

export const generateQuestions = async (req, res) => {
  try {
    let { role, experience, mode, resumeText, projects, skills } = req.body;

    role = role?.trim();
    experience = experience?.trim();
    mode = mode?.trim();

    if (!role || !experience || !mode) {
      return res
        .status(400)
        .json({ message: "Role, experience, and mode are required" });
    }

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.credits < 50) {
      return res
        .status(403)
        .json({ message: "Not enough credits. Minimum 50 required" });
    }

    const projectText =
      Array.isArray(projects) && projects.length ? projects.join(", ") : "None";

    const skillsText =
      Array.isArray(skills) && skills.length ? skills.join(", ") : "None";

    const safeResume = resumeText?.trim() || "None";

    const userPrompt = `
    Role: ${role}
    Experience: ${experience}
    Interview Mode: ${mode}
    Projects: ${projectText}
    Skills: ${skillsText}
    Resume: ${safeResume}`;

    if (!userPrompt.trim()) {
      return res.status(400).json({ message: "Promp content is empty" });
    }

    const messages = [
      {
        role: "system",
        content: `
      You are a professional interviewer speaking naturally to a real candidate.

      Generate exactly 5 interview questions.

      Rules:
      - One question per line.
      - No numbering.
      - No explanations.
      - No extra text before or after.
      - Each question must contain 15 to 25 words.
      - Use simple, conversational English.
      - Avoid generic textbook wording.
      - Questions should sound realistic and practical.

      Difficulty progression:
      1 → easy
      2 → easy
      3 → medium
      4 → medium
      5 → hard

      Additional requirements:
      - At least 2 questions must reference candidate projects, experience, or skills.
      - At least 1 question must be situational.
      - Avoid repeating sentence patterns.
      - Questions should feel like a real live interview.
      `,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ];

    let questionsArray = [];
    try {
      const aiResponse = await askAi(messages);
      questionsArray = normalizeQuestions(aiResponse);
    } catch (aiError) {
      console.error("Generate questions AI fallback:", aiError.message);
    }

    if (questionsArray.length === 0) {
      questionsArray = fallbackQuestions(role, experience, mode);
    }

    user.credits -= 50;
    await user.save();

    const interview = await Interview.create({
      userId: req.userId,
      role,
      experience,
      mode,
      resumeText: safeResume,
      questions: questionsArray.map((q, index) => ({
        question: q,
        difficulty: ["easy", "easy", "medium", "medium", "hard"][index],
        timeLimit: [60, 60, 90, 90, 120][index],
      })),
    });

    res.json({
      interviewId: interview._id,
      creditsLeft: user.credits,
      userName: user.name,
      questions: interview.questions,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create interview question",
      error: error.message,
    });
  }
};

export const submitAnswer = async (req, res) => {
  try {
    const { interviewId, questionIndex, answer, timeTaken } = req.body;
    const interview = await Interview.findById(interviewId);
    const question = interview.questions[questionIndex];

    if (!answer) {
      question.score = 0;
      question.feedback = "You did not submit an answer";
      question.answer = "";

      await interview.save();

      return res.json({
        feedback: question.feedback,
      });
    }

    if (timeTaken > question.timeLimit) {
      question.score = 0;
      question.feedback = `Time limit exceeded. Anwser not evaluated.`;
      question.answer = answer;

      await interview.save();
      return res.json({
        feedback: question.feedback,
      });
    }

    const messages = [
      {
        role: "system",
        content: `
        You are a strict but fair professional interviewer evaluating a real interview answer.

        Evaluate naturally and realistically.

        Score these categories from 0 to 10:

        1. Confidence
        - Does the answer sound confident and well-structured?

        2. Communication
        - Is the answer clear, understandable, and professional?

        3. Correctness
        - Is the answer technically accurate, relevant, and complete?

        Scoring Guidelines:
        - Weak, vague, or incorrect answer → 0 to 4
        - Partial understanding → 5 to 6
        - Good practical answer → 7 to 8
        - Strong, detailed, professional answer → 9 to 10

        Important Rules:
        - Do not give high scores without clear quality.
        - Be realistic and unbiased.
        - Short answers should not receive high correctness scores.
        - Consider relevance, clarity, detail, and professionalism.

        Calculate:
        finalScore = rounded average of confidence, communication, and correctness.

        Feedback Rules:
        - 10 to 15 words only.
        - Sound like real interviewer feedback.
        - Mention one strength or one improvement.
        - Avoid generic phrases like "Good job".

        Return ONLY valid JSON:

        {
          "confidence": number,
          "communication": number,
          "correctness": number,
          "finalScore": number,
          "feedback": "short professional feedback"
}
        `,
      },
      {
        role: "user",
        content: `
        Question: ${question.question}
        Answer: ${answer}
        `,
      },
    ];

    const aiResponse = await askAi(messages);

    const parsed = JSON.parse(aiResponse);

    question.answer = answer;
    question.confidence = parsed.confidence;
    question.communication = parsed.communication;
    question.correctness = parsed.correctness;
    question.score = parsed.finalScore;
    question.feedback = parsed.feedback;

    await interview.save();

    return res.status(200).json({
      feedback: parsed.feedback,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Failed to submit answer", error: error.message });
  }
};

export const finishInterview = async (req, res) => {
  try {
    const { interviewId } = req.body;
    const interview = await Interview.findById(interviewId);

    if (!interview) {
      return res.status(400).json({ message: "Fall to find Interview" });
    }

    const totalQuestions = interview.questions.length;

    let totalScore = 0;
    let totalConfidence = 0;
    let totalCommunication = 0;
    let totalCorrectness = 0;

    interview.questions.forEach((q) => {
      totalScore += q.score || 0;
      totalConfidence += q.confidence || 0;
      totalCommunication += q.communication || 0;
      totalCorrectness += q.correctness || 0;
    });

    const finalScore = totalQuestions ? totalScore / totalQuestions : 0;
    const avgConfidence = totalQuestions ? totalConfidence / totalQuestions : 0;
    const avgCommunication = totalQuestions
      ? totalCommunication / totalQuestions
      : 0;
    const avgCorrectness = totalQuestions
      ? totalCorrectness / totalQuestions
      : 0;

    interview.finalScore = finalScore;
    interview.status = "completed";

    await interview.save();

    return res.status(200).json({
      finalScore: Number(finalScore.toFixed(1)),
      confidence: Number(avgConfidence.toFixed(1)),
      communication: Number(avgCommunication.toFixed(1)),
      correctness: Number(avgCorrectness.toFixed(1)),
      questionsWiseScore: interview.questions.map((q) => ({
        question: q.question,
        score: q.score || 0,
        feedback: q.feedback || 0,
        confidence: q.confidence || 0,
        communication: q.communication || 0,
        correctness: q.correctness || 0,
      })),
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to finish interview", error: error.message });
  }
};

export const getMyInterviews = async (req, res) => {
  try {
    const interviews = await Interview.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .select("role experience mode finalScore status createdAt");

    return res.status(200).json({ interviews });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to get interviews", error: error.message });
  }
};

export const getInterviewReport = async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id);

    if (!interview) {
      return res.status(404).json({ message: "Interview not found" });
    }

    const totalQuestions = interview.questions.length;

    let totalScore = 0;
    let totalConfidence = 0;
    let totalCommunication = 0;
    let totalCorrectness = 0;

    interview.questions.forEach((q) => {
      totalScore += q.score || 0;
      totalConfidence += q.confidence || 0;
      totalCommunication += q.communication || 0;
      totalCorrectness += q.correctness || 0;
    });

    const calculatedFinalScore = totalQuestions
      ? totalScore / totalQuestions
      : 0;

    const avgConfidence = totalQuestions ? totalConfidence / totalQuestions : 0;
    const avgCommunication = totalQuestions
      ? totalCommunication / totalQuestions
      : 0;
    const avgCorrectness = totalQuestions
      ? totalCorrectness / totalQuestions
      : 0;

    return res.json({
      finalScore: Number(
        (interview.finalScore ?? calculatedFinalScore).toFixed(1),
      ),
      confidence: Number(avgConfidence.toFixed(1)),
      communication: Number(avgCommunication.toFixed(1)),
      correctness: Number(avgCorrectness.toFixed(1)),
      questionsWiseScore: interview.questions,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to get interview report",
      error: error.message,
    });
  }
};
