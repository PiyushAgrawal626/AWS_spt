// frontend/src/App.jsx

import React, { useState } from 'react';
import axios from 'axios';
import './App.css'; // The new CSS file we created

function App() {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('No file chosen');
  const [appState, setAppState] = useState('upload'); // 'upload', 'loading', 'quiz', 'report'

  const [summary, setSummary] = useState('');
  const [questions, setQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});
  const [score, setScore] = useState(0);

  // Handle file selection
  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setFileName(e.target.files[0].name);
    }
  };

  // Handle file upload and API call
  const handleUpload = async () => {
    if (!file) {
      alert('Please select a PDF file first.');
      return;
    }
    const formData = new FormData();
    formData.append('pdf', file);
    setAppState('loading');

    try {
      const response = await axios.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSummary(response.data.summary);
      setQuestions(response.data.questions);
      setAppState('quiz');
    } catch (error) {
      console.error('Error uploading file:', error);
      const errorMessage = error.response?.data?.error || 'Failed to process PDF. Please try again.';
      alert(errorMessage);
      setAppState('upload');
    }
  };

  // Quiz logic (unchanged)
  const handleAnswerChange = (qIndex, option) => {
    setUserAnswers({ ...userAnswers, [qIndex]: option });
  };
  const handleSubmitQuiz = () => {
    let correctCount = 0;
    questions.forEach((q, index) => {
      if (userAnswers[index] === q.answer) correctCount++;
    });
    setScore(correctCount);
    setAppState('report');
  };
  const handleReset = () => {
    setFile(null);
    setFileName('No file chosen');
    setSummary('');
    setQuestions([]);
    setUserAnswers({});
    setScore(0);
    setAppState('upload');
  };

  // SVG Icon for the upload box
  const UploadIcon = () => (
    <svg className="upload-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );

  return (
    <div className="app-container">
      {appState === 'upload' && (
        <div className="upload-box">
          <UploadIcon />
          <h1>PDF Quizzer v2</h1>
          <p>Get a concise summary and a comprehension quiz from any PDF document.</p>
          <div className="file-input-wrapper">
            <input type="file" id="pdf-upload" accept=".pdf" onChange={handleFileChange} />
            <label htmlFor="pdf-upload" className="file-input-label">
              Choose File
            </label>
          </div>
          <button onClick={handleUpload} className="generate-button" disabled={!file}>
            Generate Quiz
          </button>
          <p id="file-name">{fileName}</p>
        </div>
      )}

      {appState === 'loading' && (
        <div className="loading">
          <h2>Processing your PDF...</h2>
          <p>This may take a moment. 🤖</p>
        </div>
      )}
      
      {/* Quiz and Report views will inherit new card styling */}
      {appState === 'quiz' && (
        <div className="quiz-container">
            {/* ... (quiz content unchanged) ... */}
        </div>
      )}
      {appState === 'report' && (
        <div className="report">
            {/* ... (report content unchanged) ... */}
        </div>
      )}
    </div>
  );
}

export default App;