import React, { useState } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [appState, setAppState] = useState('upload');
  const [summary, setSummary] = useState('');
  const [questions, setQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});
  const [score, setScore] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [masteryLevel, setMasteryLevel] = useState('');
  const [weakTopics, setWeakTopics] = useState([]);
  const [strongTopics, setStrongTopics] = useState([]);
  const [feedback, setFeedback] = useState('');


  // Download summary as PDF
  const handleDownloadSummary = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const usableWidth = pageWidth - margin * 2;
    doc.setFontSize(18);
    doc.text('Document Summary', pageWidth / 2, margin, { align: 'center' });
    doc.setFontSize(12);
    const lines = doc.splitTextToSize(summary, usableWidth);
    doc.text(lines, margin, margin + 15);
    doc.save('summary.pdf');
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a PDF file first.');
      return;
    }
    const formData = new FormData();
    formData.append('pdf', file);
    setAppState('loading');
    try {
      const response = await axios.post('http://localhost:5000/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSummary(response.data.summary);
      setQuestions(response.data.questions);
      setAppState('quiz');
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to process PDF. Please try again.');
      setAppState('upload');
    }
  };

  const handleAnswerChange = (questionIndex, selectedOption) => {
    setUserAnswers({
      ...userAnswers,
      [questionIndex]: selectedOption,
    });
  };

  // Calculate performance analytics
const calculatePerformance = (correctCount, totalQuestions) => {
  const acc = ((correctCount / totalQuestions) * 100).toFixed(2);
  setAccuracy(acc);

  let mastery = '';
  if (acc < 50) mastery = 'Basic';
  else if (acc < 80) mastery = 'Advanced';
  else mastery = 'Master';
  setMasteryLevel(mastery);

  const weakQs = questions
    .map((q, i) => (userAnswers[i] !== q.answer ? q.question : null))
    .filter(Boolean);
  const strongQs = questions
    .map((q, i) => (userAnswers[i] === q.answer ? q.question : null))
    .filter(Boolean);

  setWeakTopics(weakQs);
  setStrongTopics(strongQs);
};


const handleSubmitQuiz = async () => {
  let correctCount = 0;
  questions.forEach((q, index) => {
    if (userAnswers[index] === q.answer) correctCount++;
  });
  setScore(correctCount);
  calculatePerformance(correctCount, questions.length);

  // NEW: send answers to backend for AI analysis
  try {
    const response = await axios.post('http://localhost:5000/analyze', {
      questions: questions,
      userAnswers: userAnswers,
    });

    if (response.data) {
      setStrongTopics(response.data.strong_areas || []);
      setWeakTopics(response.data.weak_areas || []);
      setFeedback(response.data.feedback || '');
    }
  } catch (error) {
    console.error('Error analyzing performance:', error);
    alert('Failed to analyze performance feedback.');
  }

  setAppState('report');
};


  const handleReset = () => {
    setFile(null);
    setSummary('');
    setQuestions([]);
    setUserAnswers({});
    setScore(0);
    setAccuracy(0);
    setMasteryLevel('');
    setAreaData([]);
    setWeakTopics([]);
    setStrongTopics([]);
    setAppState('upload');
  };

  const getBarColor = () => {
    if (accuracy < 50) return '#E57373';
    if (accuracy < 80) return '#FFD54F';
    return '#81C784';
  };

  return (
    <div className="app-container">
      <h1>PDF Summarizer & Quizzer</h1>

      {appState === 'upload' && (
        <div className="file-upload">
          <p>Upload a PDF document to get a summary and a 10-question quiz.</p>
          <input type="file" accept=".pdf" onChange={handleFileChange} />
          <button onClick={handleUpload} disabled={!file}>
            Generate Quiz
          </button>
        </div>
      )}
      {appState === 'loading' && (
        <div className="loading">
          <h2>Processing your PDF...</h2>
          <p>This may take a moment. 🤖</p>
        </div>
      )}

      {appState === 'quiz' && (
        <div className="quiz-container">
          <div className="summary-header">
            <h2>Summary</h2>
            <button onClick={handleDownloadSummary} className="download-btn">
              Download PDF
            </button>
          </div>
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

      {appState === 'report' && (
        <div className="report">
          <div className="summary-header">
            <h2>Summary</h2>
            <button onClick={handleDownloadSummary} className="download-btn">
              Download PDF
            </button>
          </div>
          <div className="summary">
            <p>{summary}</p>
          </div>

          <h2>Your Performance Report</h2>

          {/* Side-by-side layout for accuracy and mastery */}
          <div className="performance-grid">
            {/* Circular Accuracy */}
            <div className="accuracy-circle">
              <svg viewBox="0 0 36 36" className="circular-chart">
                <path
                  className="circle-bg"
                  d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="circle"
                  strokeDasharray={`${accuracy}, 100`}
                  d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <text x="18" y="20.35" className="percentage">{accuracy}%</text>
              </svg>
              <p>Accuracy</p>
            </div>

            {/* Mastery Badge */}
            <div className={`mastery-level-badge ${masteryLevel.toLowerCase()}`}>
              <div className="badge-glow"></div>
              <h3>{masteryLevel}</h3>
              <p>
                {masteryLevel === 'Basic'
                  ? 'Needs Improvement — Keep Practicing!'
                  : masteryLevel === 'Advanced'
                  ? 'Great Job — You’re Almost a Master!'
                  : 'Outstanding — You’ve Mastered the Topic!'}
              </p>
            </div>
          </div>

         

          {/* Strong and Weak Topics side-by-side */}
          <div className="topics-grid">
            <div className="strong-topics">
              <h3>Strong Topics</h3>
              {strongTopics.length > 0 ? (
                <ul>{strongTopics.map((t, i) => <li key={i}>{t}</li>)}</ul>
              ) : (
                <p>No strong topics identified.</p>
              )}
            </div>

            <div className="weak-topics">
              <h3>Weak Topics</h3>
              {weakTopics.length > 0 ? (
                <ul>{weakTopics.map((t, i) => <li key={i}>{t}</li>)}</ul>
              ) : (
                <p>No weak topics identified.</p>
              )}
            </div>
          </div>
          <div className="feedback-section">
            <h3>Personalized Feedback</h3>
            <p>{feedback ? feedback : "No feedback available."}</p>
          </div>


          <div className="report-details">
            <h4>Review Your Answers:</h4>
            {questions.map((q, index) => (
              <div key={index} className="question">
                <strong>{index + 1}. {q.question}</strong>
                <p className={userAnswers[index] === q.answer ? 'correct' : 'incorrect'}>
                  Your answer: {userAnswers[index] || 'No answer'}
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
