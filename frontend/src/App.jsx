// frontend/src/App.jsx

import React, { useState } from 'react';
import axios from 'axios';
import './App.css'; // The new CSS file

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

  // Store user's answer for a question
  const handleAnswerChange = (questionIndex, selectedOption) => {
    setUserAnswers({
      ...userAnswers,
      [questionIndex]: selectedOption,
    });
  };

  // Grade the quiz
  const handleSubmitQuiz = () => {
    let correctCount = 0;
    questions.forEach((q, index) => {
      if (userAnswers[index] === q.answer) {
        correctCount++;
      }
    });
    setScore(correctCount);
    setAppState('report');
  };

  // Reset and go back to the start
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

      {/* ✅ CORRECTED VIEW 3: QUIZ PAGE */}
      {appState === 'quiz' && (
        <div className="quiz-container">
          <h2>Summary</h2>
          <div className="summary" style={{ marginBottom: '30px', padding: '15px', border: '1px solid #eee', borderRadius: '8px' }}>
            <p>{summary}</p>
          </div>
          <h2>Quiz</h2>
          <form className="quiz-form">
            {questions.map((q, qIndex) => (
              <div key={qIndex} className="question" style={{ marginBottom: '20px' }}>
                <strong>{qIndex + 1}. {q.question}</strong>
                <div className="options" style={{ display: 'flex', flexDirection: 'column', marginTop: '10px' }}>
                  {q.options.map((option, oIndex) => (
                    <label key={oIndex} style={{ margin: '5px 0' }}>
                      <input
                        type="radio"
                        name={`question-${qIndex}`}
                        value={option}
                        onChange={() => handleAnswerChange(qIndex, option)}
                        style={{ marginRight: '10px' }}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </form>
          <button onClick={handleSubmitQuiz} className="generate-button">Submit Quiz</button>
        </div>
      )}

      {/* ✅ CORRECTED VIEW 4: REPORT PAGE */}
      {appState === 'report' && (
        <div className="report">
          <h2>Your Performance Report</h2>
          <h3>Your Score: {score} / {questions.length}</h3>
          <div className="report-details">
            <h4>Review Your Answers:</h4>
            {questions.map((q, index) => (
              <div key={index} className="question" style={{ marginBottom: '20px', padding: '10px', borderRadius: '8px', border: '1px solid #eee' }}>
                <strong>{index + 1}. {q.question}</strong>
                <p className={userAnswers[index] === q.answer ? 'correct' : 'incorrect'} style={{ color: userAnswers[index] === q.answer ? 'green' : 'red' }}>
                  Your answer: {userAnswers[index] || "No answer"}
                </p>
                {userAnswers[index] !== q.answer && (
                  <p className="correct" style={{ color: 'green' }}>Correct answer: {q.answer}</p>
                )}
              </div>
            ))}
          </div>
          <button onClick={handleReset} className="generate-button" style={{ marginTop: '20px' }}>
            Try Another PDF
          </button>
        </div>
      )}
    </div>
  );
}

export default App;