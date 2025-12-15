import React, { useState, useRef } from 'react';
import './App.css';

// SVGs for icons
const GeminiIcon = () => ( <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M4.5 12C4.5 16.1421 7.85786 19.5 12 19.5C16.1421 19.5 19.5 16.1421 19.5 12C19.5 7.85786 16.1421 4.5 12 4.5C9.42935 4.5 7.18325 5.75336 5.88281 7.5" stroke="url(#paint0_linear_1_2)" strokeWidth="1.5" strokeLinecap="round"/> <defs> <linearGradient id="paint0_linear_1_2" x1="12" y1="4.5" x2="12" y2="19.5" gradientUnits="userSpaceOnUse"> <stop stopColor="#8E47FF"/> <stop offset="1" stopColor="#4785FF"/> </linearGradient> </defs> </svg> );
const UserIcon = () => ( <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"> <path d="M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12ZM12 14C8.68629 14 6 16.6863 6 20H18C18 16.6863 15.3137 14 12 14Z" /> </svg> );

function App() {
  const [files, setFiles] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [conversation, setConversation] = useState(null);

  const fileInputRef = useRef(null);

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files);
    if (selectedFiles.length > 0) {
      setFiles(selectedFiles);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (files.length === 0 || !prompt) {
      setError('Please attach PDF(s) and enter a prompt.');
      return;
    }

    setIsLoading(true);
    setError('');
    setResponse('');
    setConversation({
      userPrompt: prompt,
      fileNames: files.map(f => f.name)
    });

    const formData = new FormData();
    files.forEach(file => {
      formData.append('pdfs', file);
    });
    formData.append('prompt', prompt);

    try {
      const res = await fetch('http://127.0.0.1:5000/api/process-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        const chunk = decoder.decode(value, { stream: true });
        setResponse((prev) => prev + chunk);
      }

    } catch (err) {
      console.error("Fetch Error:", err);
      setError(err.message);
      setConversation(null);
    } finally {
      setIsLoading(false);
    }
  };
  
  const WelcomeScreen = () => (
    <div className="welcome-screen">
      <div className="welcome-title">
        <span className="gradient-text">Hello</span>
        <p>How can I help you with your documents today?</p>
      </div>
    </div>
  );

  const Loader = () => (
    <div className="loader-container">
        <GeminiIcon />
        <div className="loader-bar"></div>
    </div>
  );

  const ResultDisplay = () => (
    <div className="result-display">
      {conversation && (
        <div className="chat-entry user">
          <div className="chat-icon"><UserIcon /></div>
          <div className="chat-content">
            <p>
              <strong>You asked about "{conversation.fileNames.join(', ')}":</strong>
            </p>
            <p>{conversation.userPrompt}</p>
          </div>
        </div>
      )}
      {response && (
        <div className="chat-entry gemini">
          <div className="chat-icon"><GeminiIcon /></div>
          <div className="chat-content">
            <pre>{response}{isLoading && <span className="cursor"></span>}</pre>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="app-container">
      <div className="main-content">
        {!isLoading && !conversation && <WelcomeScreen />}
        {isLoading && !response && <Loader />}
        {error && <div className="error-message">{error}</div>}
        {conversation && <ResultDisplay />}
      </div>

      <div className="input-area">
        <form onSubmit={handleSubmit} className="input-form">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            ref={fileInputRef}
            style={{ display: 'none' }}
            multiple
          />
          <button
            type="button"
            className="icon-button"
            onClick={() => fileInputRef.current.click()}
            title="Attach PDFs"
          >
            📎
          </button>
          <div className="file-name-chip">
            {files.length > 0 ? `${files.length} file(s) selected` : 'No files selected'}
          </div>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask a question about your PDFs..."
            className="prompt-input"
            disabled={isLoading}
          />
          <button type="submit" className="icon-button send-button" disabled={isLoading || !prompt || files.length === 0}>
            ▲
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;