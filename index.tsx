import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log("AuraAI: Initializing Boot Sequence...");

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("Critical Failure: Root mount point not found.");
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log("AuraAI: Neural Link Ready.");
} catch (error) {
  console.error("Runtime Error during initialization:", error);
}