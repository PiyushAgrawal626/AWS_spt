// frontend/src/App.jsx

import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [appState, setAppState] = useState('upload'); // 'upload', 'loading', 'quiz', 'report'

  const [summary, setSummary] = useState('');
  const [questions, setQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});
  const [score, setScore] = useState(0);

  // 1. Handle file selection
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  // 2. Handle file upload and API call
  const handleUpload = async () => {
    if (!file) {
      alert('Please select a PDF file first.');
      return;
    }

    const formData = new FormData();
    formData.append('pdf', file);

    setAppState('loading');

    try {
      // ✅ CHANGE THIS LINE: Use a relative path instead of a hardcoded URL.
      const response = await axios.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Set the data from the backend
      setSummary(response.data.summary);
      setQuestions(response.data.questions);
      setAppState('quiz'); // Move to the quiz view

    } catch (error) {
      console.error('Error uploading file:', error);
      // Display the specific error from the backend if it exists
      const errorMessage = error.response?.data?.error || 'Failed to process PDF. Please try again.';
      alert(errorMessage);
      setAppState('upload');
    }
  };

  // 3. Store user's answer for a question
  const handleAnswerChange = (questionIndex, selectedOption) => {
    setUserAnswers({
      ...userAnswers,
      [questionIndex]: selectedOption,
    });
  };

  // 4. Grade the quiz
  const handleSubmitQuiz = () => {
    let correctCount = 0;
    questions.forEach((q, index) => {
      if (userAnswers[index] === q.answer) {
        correctCount++;
      }
    });
    setScore(correctCount);
    setAppState('report'); // Move to the report view
  };

  // 5. Reset and go back to the start
  const handleReset = () => {
    setFile(null);
    setSummary('');
    setQuestions([]);
    setUserAnswers({});
    setScore(0);
    setAppState('upload');
  };

  // == RENDER THE CORRECT VIEW ==
  
  return (
    <div className="app-container">
      <h1>PDF Quizzer v2</h1>

      {/* VIEW 1: UPLOAD PAGE */}
      {appState === 'upload' && (
        <div className="file-upload">
          <p>Upload a PDF document to get a summary and a 10-question quiz.</p>
          <input type="file" accept=".pdf" onChange={handleFileChange} />
          <button onClick={handleUpload} disabled={!file}>
            Generate Quiz
          </button>
        </div>
      )}

      {/* VIEW 2: LOADING SPINNER */}
      {appState === 'loading' && (
        <div className="loading">
          <h2>Processing your PDF...</h2>
          <p>This may take a moment. 🤖</p>
        </div>
      )}

      {/* VIEW 3: QUIZ PAGE */}
      {appState === 'quiz' && (
        <div className="quiz-container">
          <h2>Summary</h2>
          <div className="summary">
            <p>{summary}</p>
          </div>

          <h2>Quiz</h2>
          <form className="quiz-form">
            {questions.map((q, qIndex) => (
              <div key={qIndex} className="question">
                <strong>{qIndex + 1}. {q.question}</strong>
                <div className="options">
                  {q.options.map((option, oIndex) => (
                    <label key={oIndex}>
                      <input
                        type="radio"
                        name={`question-${qIndex}`}
                        value={option}
                        onChange={() => handleAnswerChange(qIndex, option)}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </form>
          <button onClick={handleSubmitQuiz}>Submit Quiz</button>
        </div>
      )}

      {/* VIEW 4: REPORT PAGE */}
      {appState === 'report' && (
        <div className="report">
          <h2>Your Performance Report</h2>
          <h3>
            Your Score: {score} / {questions.length}
          </h3>

          <div className="report-details">
            <h4>Review Your Answers:</h4>
            {questions.map((q, index) => (
              <div key={index} className="question">
                <strong>{index + 1}. {q.question}</strong>
                <p className={userAnswers[index] === q.answer ? 'correct' : 'incorrect'}>
                  Your answer: {userAnswers[index] || "No answer"}
                </p>
                {userAnswers[index] !== q.answer && (
                  <p className="correct">Correct answer: {q.answer}</p>
                )}
              </div>
            ))}
          </div>

          <button onClick={handleReset} style={{ marginTop: '20px' }}>
            Try Another PDF
          </button>
        </div>
      )}
    </div>
  );
}

export default App;