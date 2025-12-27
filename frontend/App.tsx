
import React, { useState, useCallback, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import { Document, SystemLog, SupportedLanguage, Message } from './types';
import { geminiService } from './services/geminiService';

const App: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | undefined>();
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexingProgress, setIndexingProgress] = useState(0);
  const [language, setLanguage] = useState<SupportedLanguage>('English');
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('chat_history');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('chat_history', JSON.stringify(messages));
  }, [messages]);

  const selectedDoc = documents.find(d => d.id === selectedDocId);

  const addLog = (message: string, type: SystemLog['type'] = 'info') => {
    setLogs(prev => [...prev, {
      id: Math.random().toString(),
      message,
      type,
      timestamp: Date.now()
    }]);
  };

  useEffect(() => {
    if (selectedDoc && (!selectedDoc.synthesis || !selectedDoc.synthesis.includes(`[${language}]`))) {
      const runSynthesis = async () => {
        addLog(`Synchronizing Context: ${language}`, 'info');
        try {
          const rawSynthesis = await geminiService.generateSynthesis(selectedDoc.content, language);
          const synthesis = `[${language}] ${rawSynthesis}`;
          setDocuments(prev => prev.map(d => d.id === selectedDoc.id ? { ...d, synthesis } : d));
          addLog(`Language Sync Complete`, 'success');
        } catch (err) {
          addLog(`Synthesis failed`, 'error');
        }
      };
      runSynthesis();
    }
  }, [language, selectedDocId, documents.length]);

  const handleDocumentIngestion = useCallback(async (file: File) => {
    setIsIndexing(true);
    setIndexingProgress(10);
    addLog(`Ingesting Knowledge: ${file.name}`, 'info');

    const progressInterval = setInterval(() => {
      setIndexingProgress(prev => Math.min(prev + 5, 95));
    }, 150);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result as string;
        const docId = `doc-${Date.now()}`;
        
        const newDoc: Document = {
          id: docId,
          name: file.name,
          size: file.size,
          type: file.type || 'text/plain',
          content: content,
          status: 'ready',
          timestamp: Date.now()
        };

        // Long-term Memory: Index document chunks
        const chunks = content.match(/.{1,1000}/g) || [];
        chunks.forEach((chunk, i) => {
          geminiService.commitToLongTermMemory(`${docId}-chunk-${i}`, chunk, { 
            name: file.name, 
            type: 'document' 
          });
        });

        setDocuments(prev => [newDoc, ...prev]);
        setSelectedDocId(docId);
        setIsIndexing(false);
        setIndexingProgress(100);
        clearInterval(progressInterval);
        addLog(`Memory Partition Updated: ${file.name}`, 'success');
      };
      reader.readAsText(file);
    } catch (error) {
      addLog(`Indexing Failure: ${file.name}`, 'error');
      setIsIndexing(false);
      clearInterval(progressInterval);
    }
  }, []);

  const handleDeleteDoc = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
    if (selectedDocId === id) setSelectedDocId(undefined);
    addLog(`Local Partition Purged`, 'warning');
  };

  return (
    <div className="flex h-screen bg-white text-gray-900 overflow-hidden font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <Sidebar 
        documents={documents} 
        onSelectDoc={(doc) => setSelectedDocId(doc.id)} 
        selectedDocId={selectedDocId}
        onDeleteDoc={handleDeleteDoc}
      />
      <main className="flex-1 flex flex-col min-w-0 h-full">
        <ChatInterface 
          selectedDoc={selectedDoc} 
          onLog={addLog} 
          logs={logs} 
          language={language}
          onLanguageChange={setLanguage}
          onDocumentIngested={handleDocumentIngestion}
          isIndexing={isIndexing}
          indexingProgress={indexingProgress}
          initialMessages={messages}
          onMessagesChange={setMessages}
        />
      </main>
    </div>
  );
};

export default App;
