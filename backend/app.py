
import os
import pdfplumber
import google.generativeai as genai
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import warnings
warnings.filterwarnings("ignore", message="Cannot set gray non-stroke color")

# Load environment variables (your API key)
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable Cross-Origin Resource Sharing

# Configure the Gemini API
try:
    genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
except Exception as e:
    print(f"Error initializing Gemini client: {e}")

# NEW: A single prompt to get both summary and quiz
def get_summary_and_quiz_prompt(text):
    return f"""
    You are an expert educator and content analyst. Based on the following text, provide two things:

    1. A **detailed, well-structured summary** of the text that captures:
       - All key concepts, arguments, and important facts.
       - Examples or explanations when relevant.
       - Logical flow of ideas across the sections.
       - Avoid repetition, but maintain rich detail.
       The summary should be about 3–5 paragraphs long (not just a short paragraph).

    2. A set of **10 high-quality multiple-choice questions (MCQs)** to test comprehension.
       - Each question should focus on a different concept or fact from the text.
       - Each question must include 4 options labeled "a", "b", "c", "d".
       - Provide the correct answer explicitly.

    Format the entire output as a **single valid JSON object** with two keys: "summary" and "questions".

    - The value for "summary" should be a single string.
    - The value for "questions" should be an array of objects, where each object has:
        {{
          "question": "string",
          "options": ["a) ...", "b) ...", "c) ...", "d) ..."],
          "answer": "string"  # the exact correct option text
        }}

    Here is the text:
    ---
    {text}
    ---
    """

# Helper function to call the Gemini API (unchanged)
def get_ai_response(prompt):
    try:
        model = genai.GenerativeModel('gemini-pro-latest')
        response = model.generate_content(prompt)
        # Clean the response to ensure it's valid JSON
        return response.text.strip("```json").strip("`")
    except Exception as e:
        # This will now print the rate limit error to your console
        print(f"Error generating content: {e}")
        return None

# Define the main API endpoint
@app.route('/upload', methods=['POST'])
def upload_file():
    if 'pdf' not in request.files:
        return jsonify({"error": "No PDF file provided"}), 400

    file = request.files['pdf']

    # Extract text from the PDF
    try:
        with pdfplumber.open(file) as pdf:
            full_text = "".join(page.extract_text() + "\n" for page in pdf.pages)
    except Exception as e:
        return jsonify({"error": f"Failed to process PDF: {str(e)}"}), 500

    # NEW: Generate the combined prompt and make a single API call
    combined_prompt = get_summary_and_quiz_prompt(full_text)
    ai_response_str = get_ai_response(combined_prompt)

    if not ai_response_str:
        return jsonify({"error": "Failed to get response from AI due to an API error (check backend logs)"}), 500

    # Parse the single JSON response
    try:
        data = json.loads(ai_response_str)
        # Ensure the response has the expected keys
        if 'summary' not in data or 'questions' not in data:
            raise ValueError("AI response is missing 'summary' or 'questions' key.")
            
    except (json.JSONDecodeError, ValueError) as e:
        print(f"Failed to parse JSON from AI. Error: {e}")
        print("AI Response was:")
        print(ai_response_str)
        return jsonify({"error": "Failed to parse structured JSON from AI"}), 500

    # Send the extracted data back to the frontend
    return jsonify({
        "summary": data['summary'],
        "questions": data['questions']
    })
@app.route('/analyze', methods=['POST'])
def analyze_performance():
    data = request.get_json()

    if not data or 'questions' not in data or 'userAnswers' not in data:
        return jsonify({"error": "Missing data"}), 400

    questions = data['questions']
    user_answers = data['userAnswers']

    # Build prompt for Gemini
    prompt = f"""
    You are an expert tutor analyzing a student's quiz performance.

    The quiz had these questions (with correct answers) and the student's responses:

    {json.dumps([
        {
            "question": q["question"],
            "options": q["options"],
            "correct_answer": q["answer"],
            "student_answer": user_answers.get(str(i), "No answer")
        } for i, q in enumerate(questions)
    ], indent=2)}

    Based on this:
    1. Identify the student's strong areas (topics where answers are correct).
    2. Identify weak areas (topics where answers are wrong or missing).
    3. Provide personalized feedback and suggestions for improvement.

    Format your response strictly as JSON with these keys:
    {{
      "strong_areas": ["topic1", "topic2", ...],
      "weak_areas": ["topic3", "topic4", ...],
      "feedback": "Your feedback message here"
    }}
    """

    ai_response = get_ai_response(prompt)
    if not ai_response:
        return jsonify({"error": "Failed to get feedback from AI"}), 500

    try:
        analysis = json.loads(ai_response)
    except json.JSONDecodeError:
        print("Failed to parse analysis JSON from AI:", ai_response)
        return jsonify({"error": "Invalid JSON returned by AI"}), 500

    return jsonify(analysis)

# Run the app
if __name__ == '__main__':
    app.run(debug=True)
