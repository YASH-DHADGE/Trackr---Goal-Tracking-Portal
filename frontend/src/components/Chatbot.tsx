import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Bot, Sparkles, Trash2, ChevronDown, RefreshCw } from 'lucide-react';
import apiClient from '../api/client';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: Date;
}

const suggestionChips = [
  { text: 'Show my goals', icon: '📊' },
  { text: 'What is my progress?', icon: '📈' },
  { text: 'Check-in status', icon: '📋' },
  { text: 'What are the rules?', icon: '⚙️' }
];

// Helper to parse bold (**text**) and inline code (`code`) in text lines
const parseBoldAndInlineCode = (inputText: string): React.ReactNode[] => {
  if (!inputText) return [];
  
  // Tokenize bold and inline code
  const regex = /(`[^`]+`|\*\*[^\*]+\*\*)/g;
  const splitParts = inputText.split(regex);

  return splitParts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      const code = part.slice(1, -1);
      return (
        <code key={i} className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-bold border border-slate-300/40 dark:border-slate-700/40">
          {code}
        </code>
      );
    } else if (part.startsWith('**') && part.endsWith('**')) {
      const boldText = part.slice(2, -2);
      return (
        <strong key={i} className="font-extrabold text-slate-950 dark:text-white">
          {boldText}
        </strong>
      );
    }
    return part;
  });
};

// Custom React Markdown formatter to avoid external bundle dependency issues
const MarkdownText: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;
  const lines = text.split('\n');

  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {lines.map((line, index) => {
        const trimmed = line.trim();

        // 1. Headers (### Header)
        if (trimmed.startsWith('###')) {
          const headerText = trimmed.replace(/^###\s+/, '');
          return (
            <h4 key={index} className="text-sm font-bold text-slate-900 dark:text-white mt-3 mb-1 first:mt-0 tracking-tight">
              {parseBoldAndInlineCode(headerText)}
            </h4>
          );
        }
        
        // 2. Headers (## Header)
        if (trimmed.startsWith('##')) {
          const headerText = trimmed.replace(/^##\s+/, '');
          return (
            <h3 key={index} className="text-base font-extrabold text-slate-950 dark:text-white mt-4 mb-2 first:mt-0 tracking-tight">
              {parseBoldAndInlineCode(headerText)}
            </h3>
          );
        }

        // 3. Bullet points (* or -)
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          const bulletText = trimmed.replace(/^[\*\-]\s+/, '');
          return (
            <div key={index} className="flex items-start gap-2 pl-1 my-1">
              <span className="text-emerald-500 font-bold shrink-0 select-none">•</span>
              <span className="flex-1 text-slate-700 dark:text-slate-300">
                {parseBoldAndInlineCode(bulletText)}
              </span>
            </div>
          );
        }

        // 4. Numbered list
        const matchNumbered = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (matchNumbered) {
          const num = matchNumbered[1];
          const restText = matchNumbered[2];
          return (
            <div key={index} className="flex items-start gap-2 pl-1 my-1">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0 select-none">{num}.</span>
              <span className="flex-1 text-slate-700 dark:text-slate-300">
                {parseBoldAndInlineCode(restText)}
              </span>
            </div>
          );
        }

        // 5. Blockquote
        if (trimmed.startsWith('>')) {
          const quoteText = trimmed.replace(/^>\s*/, '');
          return (
            <blockquote key={index} className="pl-3 border-l-4 border-slate-300 dark:border-slate-700 my-2 italic text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/30 py-1 pr-2 rounded-r-lg">
              {parseBoldAndInlineCode(quoteText)}
            </blockquote>
          );
        }

        // Empty lines
        if (trimmed === '') {
          return <div key={index} className="h-1.5" />;
        }

        // Normal paragraph lines
        return (
          <p key={index} className="text-slate-700 dark:text-slate-300">
            {parseBoldAndInlineCode(line)}
          </p>
        );
      })}
    </div>
  );
};

export const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasNewMessageAlert, setHasNewMessageAlert] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Get active user full name from localStorage to personalize
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userFullName = storedUser.full_name || 'there';

  // Initialize welcoming message
  useEffect(() => {
    const welcomeMsg: Message = {
      id: 'welcome-message',
      sender: 'ai',
      text: `### Welcome, **${userFullName}**! 👋\n\nI am **Trackr AI**, your personal portal assistant. Ask me anything! I can look up your live targets and guide you through company rules.\n\nTry clicking one of the suggestions below to start!`,
      timestamp: new Date()
    };
    setMessages([welcomeMsg]);
  }, [userFullName]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Math.random().toString(36).substring(7),
      sender: 'user',
      text: text.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await apiClient.post('/chatbot/chat', { message: text });
      
      const aiReply: Message = {
        id: Math.random().toString(36).substring(7),
        sender: 'ai',
        text: response.data.response || "I couldn't process that response. Please try again.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiReply]);
      
      // Flash the icon if chatbot window is minimized
      if (!isOpen) {
        setHasNewMessageAlert(true);
      }
    } catch (error: any) {
      console.error('Chatbot API error:', error);
      
      const errorMsg: Message = {
        id: Math.random().toString(36).substring(7),
        sender: 'ai',
        text: `❌ **Error communicating with portal services**:\n\n*Unable to connect to Chatbot endpoint at this time. Please make sure the backend server is running and try again.*`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    if (window.confirm('Clear all conversation messages?')) {
      const welcomeMsg: Message = {
        id: 'welcome-message',
        sender: 'ai',
        text: `### Welcoming you back, **${userFullName}**! 👋\n\nHow can I help you check your goals, reporting metrics, or cycle windows today?`,
        timestamp: new Date()
      };
      setMessages([welcomeMsg]);
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setHasNewMessageAlert(false);
    }
  };

  return (
    <>
      {/* 1. Floating Launcher Button */}
      <div className="fixed bottom-6 right-6 z-[80] flex flex-col items-end">
        {hasNewMessageAlert && !isOpen && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 z-50">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border border-white"></span>
          </span>
        )}
        
        <button
          onClick={toggleChat}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 border-2 active:scale-95 group focus:outline-none ${
            isOpen 
              ? 'bg-slate-800 dark:bg-slate-900 border-slate-700 hover:bg-slate-700 text-white' 
              : 'bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-400 hover:from-emerald-400 hover:to-emerald-500 text-white hover:shadow-emerald-500/25 hover:-translate-y-1'
          }`}
          title={isOpen ? "Minimize Assistant" : "Ask Trackr AI"}
        >
          {isOpen ? (
            <ChevronDown className="w-6 h-6 transition-transform duration-300 group-hover:translate-y-0.5" />
          ) : (
            <MessageSquare className="w-6 h-6 animate-pulse group-hover:scale-105" />
          )}
        </button>
      </div>

      {/* 2. Glassmorphism Chat Window */}
      <div 
        className={`fixed bottom-24 right-6 w-[420px] max-w-[calc(100vw-2rem)] h-[620px] max-h-[calc(100vh-8rem)] rounded-3xl overflow-hidden flex flex-col z-[90] shadow-2xl border transition-all duration-500 transform origin-bottom-right ${
          isOpen 
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' 
            : 'opacity-0 scale-75 translate-y-12 pointer-events-none'
        } border-slate-200/90 dark:border-slate-800/95 bg-white/95 dark:bg-slate-950/90 backdrop-blur-xl`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-950/80 dark:to-teal-950/80 px-5 py-4 flex justify-between items-center text-white border-b border-emerald-500/20 dark:border-emerald-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 dark:bg-white/5 border border-white/20 flex items-center justify-center text-white shrink-0 relative overflow-hidden group shadow-inner">
              <Bot className="w-5.5 h-5.5 text-white" />
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm leading-none font-display">Trackr AI</h3>
                <Sparkles className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[10px] text-emerald-100/90 font-medium uppercase tracking-wider leading-none">Online & Active</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleClearChat}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              title="Clear Conversation History"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={toggleChat}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              title="Minimize"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chat Messages Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 select-text">
          {messages.map((msg) => {
            const isAI = msg.sender === 'ai';
            return (
              <div
                key={msg.id}
                className={`flex w-full ${isAI ? 'justify-start' : 'justify-end'} animate-fade-in`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm border ${
                    isAI
                      ? 'bg-slate-100/80 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 rounded-tl-none border-slate-200/50 dark:border-slate-800/50'
                      : 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-tr-none border-emerald-600 shadow-emerald-500/5'
                  }`}
                >
                  {isAI ? (
                    <MarkdownText text={msg.text} />
                  ) : (
                    <p className="text-sm break-words whitespace-pre-wrap">{msg.text}</p>
                  )}
                  
                  <span
                    className={`block text-[9px] mt-1.5 text-right select-none font-semibold ${
                      isAI ? 'text-slate-400 dark:text-slate-500' : 'text-emerald-100/60'
                    }`}
                  >
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}
          
          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex w-full justify-start animate-fade-in">
              <div className="bg-slate-100 dark:bg-slate-900/50 rounded-2xl rounded-tl-none px-4 py-3 border border-slate-200/50 dark:border-slate-800/50 max-w-[80px]">
                <div className="flex gap-1 items-center justify-center h-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-bounce duration-300"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-bounce duration-300 delay-100"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-bounce duration-300 delay-200"></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Dynamic Suggestion Chips */}
        {!isLoading && (
          <div className="px-5 py-2 border-t border-slate-200/50 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-900/20 overflow-x-auto whitespace-nowrap no-scrollbar flex gap-2">
            {suggestionChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(chip.text)}
                className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-300/80 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 rounded-full px-3 py-1.5 hover:border-emerald-500 dark:hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 shadow-sm active:scale-95 transition-all duration-200"
              >
                <span>{chip.icon}</span>
                <span>{chip.text}</span>
              </button>
            ))}
          </div>
        )}

        {/* Input Footer Area */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputText);
          }}
          className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex gap-2 items-center"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
            placeholder={isLoading ? "Generating reply..." : "Ask me anything about goals..."}
            className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-slate-100 focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="w-10 h-10 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </>
  );
};
export default Chatbot;
