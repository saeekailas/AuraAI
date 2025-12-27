
import React from 'react';
import { Document } from '../types';

interface SidebarProps {
  documents: Document[];
  onSelectDoc: (doc: Document) => void;
  selectedDocId?: string;
  onDeleteDoc: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ documents, onSelectDoc, selectedDocId, onDeleteDoc }) => {
  return (
    <div className="w-64 bg-gray-900 flex flex-col h-full text-gray-200 transition-all duration-300 ease-in-out border-r border-gray-800">
      <div className="p-6">
        <h1 className="text-sm font-black uppercase tracking-[0.3em] text-white">Neural Index</h1>
        <p className="text-[10px] text-gray-500 font-bold mt-1 uppercase">Multimodal Content Engine</p>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        <div className="px-3 pb-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
          Recent Documents
        </div>
        {documents.length === 0 ? (
          <div className="px-3 py-10 text-center">
            <i className="fas fa-folder-open text-gray-700 text-2xl mb-3 block"></i>
            <p className="text-[10px] text-gray-500 italic uppercase font-bold tracking-widest">
              Attach a PDF or TXT in chat to index it
            </p>
          </div>
        ) : (
          documents.map((doc) => (
            <div
              key={doc.id}
              onClick={() => onSelectDoc(doc)}
              className={`group relative flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all ${
                selectedDocId === doc.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20'
                  : 'hover:bg-gray-800/50 text-gray-400 hover:text-gray-200'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                selectedDocId === doc.id ? 'bg-white/20' : 'bg-gray-800'
              }`}>
                <i className={`fas ${doc.type.includes('pdf') ? 'fa-file-pdf' : 'fa-file-alt'} text-[10px]`}></i>
              </div>
              <span className="flex-1 truncate text-xs font-semibold tracking-tight">{doc.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteDoc(doc.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
              >
                <i className="fas fa-trash-alt text-[10px]"></i>
              </button>
            </div>
          ))
        )}
      </div>

      <div className="p-3 border-t border-gray-800">
        <div className="flex items-center gap-3 px-3 py-3 rounded-md hover:bg-gray-800 cursor-pointer transition-colors group">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-lg">
            A
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate">Operator Alpha</p>
            <p className="text-[10px] text-gray-500 truncate">Pro Account</p>
          </div>
          <i className="fas fa-ellipsis-h text-xs text-gray-600 group-hover:text-gray-400"></i>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
