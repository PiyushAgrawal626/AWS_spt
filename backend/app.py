# import os
# import pdfplumber
# import google.generativeai as genai
# import json
# from flask import Flask, request, jsonify
# from flask_cors import CORS
# from dotenv import load_dotenv

# # Load environment variables (your API key)
# load_dotenv()

# # Initialize Flask app
# app = Flask(__name__)
# CORS(app)  # Enable Cross-Origin Resource Sharing

# # Configure the Gemini API
# try:
#     genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
# except Exception as e:
#     print(f"Error initializing Gemini client: {e}")

# for m in genai.list_models():
#     print(m.name)

# # This is the prompt for the AI
# # We ask it to return a specific JSON format
# def get_quiz_prompt(text):
#     return f"""
#     Based on the following text, generate 10 multiple-choice questions to test comprehension.
#     Format this as a valid JSON array where each object has:
#     1. "question": The (string) question.
#     2. "options": An (array of 4 strings) for the options.
#     3. "answer": The (string) correct answer, which must be one of the 4 options.

#     Here is the text:
#     ---
#     {text}
#     ---
#     """

# # Helper function to call the Gemini API
# def get_ai_response(prompt):
#     try:
#         # Get the model
#         model = genai.GenerativeModel('gemini-pro-latest')
        
#         # Call generate_content on the model
#         response = model.generate_content(prompt)
        
#         # Sometimes the AI wraps the JSON in backticks, let's remove them.
#         return response.text.strip("```json").strip("`")
#     except Exception as e:
#         print(f"Error generating content: {e}")
#         return None

# # Define the main API endpoint
# @app.route('/upload', methods=['POST'])
# def upload_file():
#     # 1. Check if a file was sent
#     if 'pdf' not in request.files:
#         return jsonify({"error": "No PDF file provided"}), 400

#     file = request.files['pdf']

#     # 2. Extract text from the PDF
#     try:
#         with pdfplumber.open(file) as pdf:
#             full_text = ""
#             for page in pdf.pages:
#                 full_text += page.extract_text() + "\n"
#     except Exception as e:
#         return jsonify({"error": f"Failed to process PDF: {str(e)}"}), 500

#     # 3. Generate the summary
#     summary_prompt = f"Provide a concise summary of the following text: \n{full_text}"
#     summary = get_ai_response(summary_prompt)

#     # 4. Generate the quiz questions
#     quiz_prompt = get_quiz_prompt(full_text)
#     quiz_json_string = get_ai_response(quiz_prompt)

#     if not summary or not quiz_json_string:
#         return jsonify({"error": "Failed to get response from AI"}), 500

#     # 5. Parse the JSON string from the AI into a real JSON object
#     try:
#         questions = json.loads(quiz_json_string)
#     except json.JSONDecodeError:
#         print("Failed to parse quiz JSON from AI. Response was:")
#         print(quiz_json_string)
#         return jsonify({"error": "Failed to parse quiz JSON from AI"}), 500

#     # 6. Send everything back to the frontend
#     return jsonify({
#         "summary": summary,
#         "questions": questions
#     })

# # Run the app
# if __name__ == '__main__':
#     app.run(debug=True)
# backend/app.py

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

# NEW: A single prompt to get both summary and quiz
def get_summary_and_quiz_prompt(text):
    return f"""
    Based on the following text, provide two things:
    1. A concise summary of the text.
    2. A set of 10 multiple-choice questions to test comprehension.

    Format the entire output as a single, valid JSON object with two keys: "summary" and "questions".
    - The value for "summary" should be a single string.
    - The value for "questions" should be a JSON array where each object has "question", "options" (an array of 4 strings), and "answer".

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

# Run the app
if __name__ == '__main__':
    app.run(debug=True)
