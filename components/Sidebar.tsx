import React, { useState } from 'react';
import { Document, Workspace } from '../types';

interface SidebarProps {
  documents: Document[];
  onSelectDoc: (doc: Document) => void;
  selectedDocId?: string;
  onDeleteDoc: (id: string) => void;
  activeWorkspace: Workspace;
  onWorkspaceChange: (ws: Workspace) => void;
}

const WORKSPACES: Workspace[] = [
  { id: 'ws-personal', name: 'Personal Partition', type: 'personal', memberCount: 1 },
  { id: 'ws-team-alpha', name: 'Team Alpha Node', type: 'team', memberCount: 12 },
  { id: 'ws-project-omega', name: 'Project Omega', type: 'team', memberCount: 5 }
];

const Sidebar: React.FC<SidebarProps> = ({ 
  documents, onSelectDoc, selectedDocId, onDeleteDoc, activeWorkspace, onWorkspaceChange 
}) => {
  const [showWSMenu, setShowWSMenu] = useState(false);

  return (
    <div className="w-64 bg-black flex flex-col h-full text-gray-200 transition-all duration-300 ease-in-out border-r border-zinc-900">
      {/* Workspace Switcher */}
      <div className="p-4 border-b border-zinc-900 relative bg-black">
        <button 
          onClick={() => setShowWSMenu(!showWSMenu)}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-900/40 hover:bg-zinc-900 transition-all group border border-zinc-800/50"
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${activeWorkspace.type === 'team' ? 'bg-indigo-600 shadow-lg shadow-indigo-500/20' : 'bg-zinc-800'}`}>
              <i className={`fas ${activeWorkspace.type === 'team' ? 'fa-users' : 'fa-user'} text-[10px] text-white`}></i>
            </div>
            <div className="text-left overflow-hidden">
              <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest leading-none mb-1">Workspace</p>
              <p className="text-xs font-bold truncate text-white">{activeWorkspace.name}</p>
            </div>
          </div>
          <i className="fas fa-chevron-down text-[10px] text-zinc-600 group-hover:text-zinc-400 transition-colors"></i>
        </button>

        {showWSMenu && (
          <div className="absolute top-full left-4 right-4 mt-2 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
            {WORKSPACES.map(ws => (
              <button
                key={ws.id}
                onClick={() => { onWorkspaceChange(ws); setShowWSMenu(false); }}
                className="w-full flex items-center justify-between p-3 hover:bg-zinc-900 transition-colors text-left border-b border-zinc-900 last:border-0"
              >
                <div>
                  <p className="text-xs font-bold text-white">{ws.name}</p>
                  <p className="text-[9px] text-zinc-500 uppercase font-black">{ws.type} • {ws.memberCount} members</p>
                </div>
                {activeWorkspace.id === ws.id && <i className="fas fa-check text-indigo-400 text-[10px]"></i>}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-4"></div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1 bg-black">
        {documents.length === 0 ? (
          <div className="px-3 py-10 text-center">
            {/* Minimalist empty state */}
          </div>
        ) : (
          documents.map((doc) => (
            <div
              key={doc.id}
              onClick={() => onSelectDoc(doc)}
              className={`group relative flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all ${
                selectedDocId === doc.id
                  ? 'bg-zinc-800 text-white shadow-lg'
                  : 'hover:bg-zinc-900/50 text-zinc-500 hover:text-zinc-200'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                selectedDocId === doc.id ? 'bg-white/10' : 'bg-zinc-900'
              }`}>
                <i className={`fas ${doc.type.includes('pdf') ? 'fa-file-pdf' : 'fa-file-alt'} text-[10px]`}></i>
              </div>
              <div className="flex-1 min-w-0">
                <span className="block truncate text-xs font-semibold tracking-tight">{doc.name}</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[8px] uppercase font-black tracking-tighter ${selectedDocId === doc.id ? 'text-zinc-300' : 'text-zinc-700'}`}>
                    {doc.visibility === 'shared' ? 'Shared' : 'Private'}
                  </span>
                  <div className="w-1 h-1 rounded-full bg-zinc-800"></div>
                  <span className={`text-[8px] uppercase font-black tracking-tighter ${selectedDocId === doc.id ? 'text-zinc-300' : 'text-zinc-700'}`}>
                    {doc.ownerId === 'me' ? 'Operator' : 'Beta'}
                  </span>
                </div>
              </div>
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

      {/* User / Settings Section */}
      <div className="p-3 border-t border-zinc-900 bg-black">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-zinc-900 transition-all group cursor-pointer border border-transparent hover:border-zinc-800">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-indigo-500/20 ring-2 ring-black">
              A
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-black rounded-full shadow-sm"></div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold truncate text-zinc-100">Operator Alpha</p>
            <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest truncate">AuraAI Authority</p>
          </div>
          <i className="fas fa-cog text-xs text-zinc-700 group-hover:text-zinc-400 transition-colors"></i>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;