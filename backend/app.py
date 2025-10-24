import os
import pdfplumber
import google.generativeai as genai
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

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

for m in genai.list_models():
    print(m.name)

# This is the prompt for the AI
# We ask it to return a specific JSON format
def get_quiz_prompt(text):
    return f"""
    Based on the following text, generate 10 multiple-choice questions to test comprehension.
    Format this as a valid JSON array where each object has:
    1. "question": The (string) question.
    2. "options": An (array of 4 strings) for the options.
    3. "answer": The (string) correct answer, which must be one of the 4 options.

    Here is the text:
    ---
    {text}
    ---
    """

# Helper function to call the Gemini API
def get_ai_response(prompt):
    try:
        # Get the model
        model = genai.GenerativeModel('gemini-pro-latest')
        
        # Call generate_content on the model
        response = model.generate_content(prompt)
        
        # Sometimes the AI wraps the JSON in backticks, let's remove them.
        return response.text.strip("```json").strip("`")
    except Exception as e:
        print(f"Error generating content: {e}")
        return None

# Define the main API endpoint
@app.route('/upload', methods=['POST'])
def upload_file():
    # 1. Check if a file was sent
    if 'pdf' not in request.files:
        return jsonify({"error": "No PDF file provided"}), 400

    file = request.files['pdf']

    # 2. Extract text from the PDF
    try:
        with pdfplumber.open(file) as pdf:
            full_text = ""
            for page in pdf.pages:
                full_text += page.extract_text() + "\n"
    except Exception as e:
        return jsonify({"error": f"Failed to process PDF: {str(e)}"}), 500

    # 3. Generate the summary
    summary_prompt = f"Provide a concise summary of the following text: \n{full_text}"
    summary = get_ai_response(summary_prompt)

    # 4. Generate the quiz questions
    quiz_prompt = get_quiz_prompt(full_text)
    quiz_json_string = get_ai_response(quiz_prompt)

    if not summary or not quiz_json_string:
        return jsonify({"error": "Failed to get response from AI"}), 500

    # 5. Parse the JSON string from the AI into a real JSON object
    try:
        questions = json.loads(quiz_json_string)
    except json.JSONDecodeError:
        print("Failed to parse quiz JSON from AI. Response was:")
        print(quiz_json_string)
        return jsonify({"error": "Failed to parse quiz JSON from AI"}), 500

    # 6. Send everything back to the frontend
    return jsonify({
        "summary": summary,
        "questions": questions
    })

# Run the app
if __name__ == '__main__':
    app.run(debug=True)