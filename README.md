# VidyaSetu 
**Bridging Academics and Industry Readiness**

VidyaSetu is an AI-powered college analytics and career acceleration platform. It bridges the gap between academic performance and industry readiness by providing real-time result tracking, personalized AI tutoring, and advanced career preparation tools like ATS resume analysis, automated cover letter generation, and custom career roadmaps.

---

## Key Features

### For Students (Learners & Job Seekers)
- **Real-Time Performance Dashboard**: Instantly track internal assessment (IAT) marks and overall academic standing.
- **Pathfinder AI (RAG Tutor)**: Upload college PDFs and interact with an AI tutor that strictly teaches based on the uploaded syllabus. Includes built-in **Voice-to-Text** accessibility.
- **Elite ATS Resume Builder**: Automatically score your resume against actual Job Descriptions to identify missing keywords and predict HR interview questions.
- **AI Cover Letter Generator**: Generate perfectly formatted, highly personalized cover letters instantly.
- **AI Career Roadmaps**: Generate 12-week Markdown learning paths strictly tailored to your dream role (e.g., Data Scientist, Full Stack Developer).

### For Institutions (Teachers & Admins)
- **Frictionless Data Entry**: Instantly import hundreds of student results via Excel sheets.
- **Real-time Analytics**: Visual dashboards showing batch performance and individual student progress.
- **Resource Hub**: Distribute PDFs, worksheets, and study materials directly to student dashboards.

---

## Tech Stack

- **Frontend**: React.js, Tailwind CSS, Vite, Recharts, Lucide Icons, Web Speech API.
- **Backend**: Node.js, Express.js.
- **Database & Auth**: Firebase Authentication, Firestore Database.
- **AI Integration**: Gemini 2.5 Flash / OpenRouter API (for ATS, Roadmaps, and Cover Letters), Retrieval-Augmented Generation (RAG) for Pathfinder AI.

---

## User Flow

1. **Teacher Uploads Data**: The teacher logs into the Admin/Teacher portal and uploads an Excel sheet containing the students' marks and emails.
2. **Student Onboarding**: The student logs in using the email provided in the college records.
3. **Dashboard Access**: 
   - The student instantly views their academic standing in the "My Results" tab.
   - They can access study materials uploaded by the teacher.
4. **AI Tutoring (Pathfinder)**: The student opens Pathfinder, uploads a class PDF, and asks the AI to summarize, quiz, or explain concepts (via text or voice).
5. **Career Acceleration**: 
   - The student builds a resume within the platform.
   - They copy/paste a Job Description to get an ATS score and improvement tips.
   - They generate an AI cover letter and a 12-week learning roadmap to secure the job.

---

## Installation & Local Setup

### Prerequisites
- Node.js (v18+)
- A Firebase Project (with Firestore and Auth enabled)
- An OpenRouter / Gemini API Key

### 1. Clone the Repository
\`\`\`bash
git clone https://github.com/deveshreddyp/VidyaSetu.git
cd VidyaSetu
\`\`\`

### 2. Backend Setup
\`\`\`bash
cd backend
npm install
\`\`\`
- Create a `.env` file in the `backend` directory and add your API keys:
  \`\`\`env
  PORT=5000
  OPENROUTER_API_KEY=your_api_key_here
  \`\`\`
- Place your Firebase Admin SDK credentials in `backend/src/config/serviceAccountKey.json`.
- Start the server:
  \`\`\`bash
  npx nodemon src/server.js
  \`\`\`

### 3. Frontend Setup
\`\`\`bash
cd ../frontend
npm install
\`\`\`
- Create a `.env` file in the `frontend` directory and add your Firebase client config:
  \`\`\`env
  VITE_FIREBASE_API_KEY=your_api_key
  VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
  VITE_FIREBASE_PROJECT_ID=your_project_id
  VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
  VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
  VITE_FIREBASE_APP_ID=your_app_id
  VITE_API_URL=http://localhost:5000
  \`\`\`
- Start the frontend:
  \`\`\`bash
  npm run dev
  \`\`\`

---

## User Guide

### How to use the Teacher Dashboard
1. Log in with a teacher account.
2. Navigate to the **Manage Students** section.
3. Click **Upload Excel** and select your formatted `.xlsx` file containing student emails and marks.
4. The system will automatically parse the data, calculate Pass/Fail status, and securely merge the results into the respective student accounts.

### How to use Pathfinder AI
1. Log in as a student and click the **Pathfinder AI** widget on your dashboard.
2. Click the **Upload PDF** button on the left sidebar to provide the context material.
3. Once processed, type your questions into the chat or use the **Mic Icon** to speak your questions out loud.
4. Use the quick action buttons to have the AI **Explain**, **Summarize**, or **Quiz** you on the material.

### How to use Career Tools
1. Navigate to the **Dashboard**.
2. Click **Generate Roadmap** and type in your desired role to receive a 12-week study plan.
3. Open the **Resume Builder**, fill out your details, and click **Analyze ATS**. Paste a target Job Description to see your score, missing keywords, and expected interview questions.
4. Click **Generate Cover Letter** to let the AI draft a personalized application letter based on your resume and the Job Description.

---

*Built with ❤️ for student success.* *
