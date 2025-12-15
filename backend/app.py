import os
import fitz  # PyMuPDF
import google.generativeai as genai
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configure the Gemini API
try:
    genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
except Exception as e:
    print(f"Error configuring Gemini API: {e}")

# Initialize the Gemini Model
model = genai.GenerativeModel('gemini-2.5-flash')

def extract_text_from_pdf(pdf_file):
    """Extracts text from a single PDF file stream."""
    try:
        pdf_document = fitz.open(stream=pdf_file.read(), filetype="pdf")
        text = ""
        for page in pdf_document:
            text += page.get_text()
        pdf_document.close()
        return text
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
        return None

@app.route('/api/process-pdf', methods=['POST'])
def process_pdf():
    # 1. Check for files and prompt
    if 'pdfs' not in request.files:
        return jsonify({"error": "No PDF files provided"}), 400
    if 'prompt' not in request.form:
        return jsonify({"error": "No prompt provided"}), 400

    pdf_files = request.files.getlist('pdfs')
    user_prompt = request.form['prompt']

    if not pdf_files or pdf_files[0].filename == '':
        return jsonify({"error": "No selected files"}), 400

    # 2. Extract text from all PDFs and combine them
    all_pdf_text = ""
    for pdf_file in pdf_files:
        filename = pdf_file.filename
        all_pdf_text += f"--- START OF DOCUMENT: {filename} ---\n\n"
        text = extract_text_from_pdf(pdf_file)
        if text:
            all_pdf_text += text + "\n\n"
        all_pdf_text += f"--- END OF DOCUMENT: {filename} ---\n\n"

    # 3. Create a combined prompt for the LLM
    combined_prompt = f"""
    Based on the following text extracted from one or more PDFs, please answer the user's question.
    Analyze the content from all documents provided.

    **User's Question:** {user_prompt}

    ---
    **Combined PDF Content:**
    {all_pdf_text}
    ---

    **Answer:**
    """

    # 4. Generate content with streaming
    def stream_response_generator():
        try:
            response_stream = model.generate_content(combined_prompt, stream=True)
            for chunk in response_stream:
                if chunk.text:
                    yield chunk.text
        except Exception as e:
            print(f"Error during Gemini API stream: {e}")
            yield "Error: Could not get response from the model."

    # Return a streaming response
    return Response(stream_response_generator(), mimetype='text/plain')

if __name__ == '__main__':
    app.run(debug=True, port=5000)