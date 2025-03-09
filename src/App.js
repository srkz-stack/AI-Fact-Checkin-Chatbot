//App.js
import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import ReactMarkdown from 'react-markdown';
import { HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
const { GoogleGenerativeAI } = require("@google/generative-ai");

function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [editChatId, setEditChatId] = useState(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const toggleTheme = () => {
    setIsDarkMode((prevState) => !prevState);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Load chats and messages from localStorage
  useEffect(() => {
    try {
      const savedChats = JSON.parse(localStorage.getItem('chats')) || [];
      if (savedChats.length > 0) {
        setChats(savedChats);
        setActiveChat(savedChats[0].id);
        setMessages(savedChats[0].messages);
      } else {
        const defaultChat = { id: Date.now(), title: 'Chat 1', messages: [] };
        const initialChats = [defaultChat];
        setChats(initialChats);
        setActiveChat(defaultChat.id);
        localStorage.setItem('chats', JSON.stringify(initialChats));
      }
    } catch (error) {
      console.error("Error loading chats from localStorage:", error);
    }
  }, []);

  // Save chats to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('chats', JSON.stringify(chats));
    } catch (error) {
      console.error("Error saving chats to localStorage:", error);
    }
  }, [chats]);
  
  useEffect(() => {
    document.body.classList.toggle('dark-mode', isDarkMode);
  }, [isDarkMode]);

  // Auto-scroll to the bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fix for input disappearing after multiple messages
  useEffect(() => {
    // Ensure input is always visible and properly sized
    if (inputRef.current) {
      inputRef.current.style.display = 'block';
      inputRef.current.style.visibility = 'visible';
    }
  }, [messages]);

  const handleMessageSend = async () => {
    if (input.trim() === '') return;
  
    const userMessage = { text: input, sender: 'user' };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
  
    const updatedChats = chats.map(chat =>
      chat.id === activeChat ? { ...chat, messages: updatedMessages } : chat
    );
    setChats(updatedChats);
  
    try {
      const safetySettings = [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      ];
      const generationConfig = { maxOutputTokens: 200, temperature: 0.9, topP: 0.1, topK: 16 };
  
      const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", safetySettings, generationConfig });
  
      // Step 1: Check if it's a true, false, partially true, or partially false fact
      const factCheckPrompt = `Determine if the following statement is factually correct. Reply ONLY with one of the following labels: \n\n"True Fact", "False Fact", "Partially True Fact", "Partially False Fact".\n\nStatement: "${input}"`;
      const factCheckResult = await model.generateContent(factCheckPrompt);
      const factCheckResponse = await factCheckResult.response.text().trim();
  
      // Step 2: Get the normal response
      const chat = model.startChat();
      const result = await chat.sendMessage(input);
      const botResponse = await result.response.text();
  
      // Append both fact check and response
      const factCheckMessage = { text: factCheckResponse, sender: 'bot' };
      const botMessage = { text: botResponse, sender: 'bot' };
  
      const updatedMessagesWithBot = [...updatedMessages, factCheckMessage, botMessage];
      setMessages(updatedMessagesWithBot);
  
      const updatedChatsWithBot = chats.map(chat =>
        chat.id === activeChat ? { ...chat, messages: updatedMessagesWithBot } : chat
      );
      setChats(updatedChatsWithBot);
  
    } catch (error) {
      console.error("Error with AI response:", error);
      const errorMessage = { text: "Oops! Something went wrong. Please try again.", sender: 'bot' };
      setMessages([...updatedMessages, errorMessage]);
      
      const updatedChatsWithError = chats.map(chat =>
        chat.id === activeChat ? { ...chat, messages: [...updatedMessages, errorMessage] } : chat
      );
      setChats(updatedChatsWithError);
    }
  };
  
  const handleNewChat = () => {
    const newChat = { id: Date.now(), title: `Chat ${chats.length + 1}`, messages: [] };
    setChats([newChat, ...chats]);
    setActiveChat(newChat.id);
    setMessages([]);
    // Close sidebar on mobile after creating a new chat
    if (window.innerWidth <= 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleChatSelect = (chatId) => {
    const selectedChat = chats.find(chat => chat.id === chatId);
    setActiveChat(chatId);
    setMessages(selectedChat?.messages || []);
    // Close sidebar on mobile after selecting a chat
    if (window.innerWidth <= 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleChatDelete = (chatId) => {
    const updatedChats = chats.filter(chat => chat.id !== chatId);
    setChats(updatedChats);

    if (activeChat === chatId && updatedChats.length > 0) {
      setActiveChat(updatedChats[0].id);
      setMessages(updatedChats[0].messages);
    } else if (updatedChats.length === 0) {
      const newChat = { id: Date.now(), title: 'Chat 1', messages: [] };
      setChats([newChat]);
      setActiveChat(newChat.id);
      setMessages([]);
    }
  };

  const handleEditStart = (chatId, currentTitle) => {
    setEditChatId(chatId);
    setEditedTitle(currentTitle);
  };

  const handleEditSave = (chatId) => {
    const updatedChats = chats.map(chat =>
      chat.id === chatId ? { ...chat, title: editedTitle } : chat
    );
    setChats(updatedChats);
    setEditChatId(null);
    setEditedTitle('');
  };

  const handleEditCancel = () => {
    setEditChatId(null);
    setEditedTitle('');
  };

  const handleResetChat = () => {
    setMessages([]);
    const updatedChats = chats.map(chat =>
      chat.id === activeChat ? { ...chat, messages: [] } : chat
    );
    setChats(updatedChats);
  };

  // Get the current chat title
  const activeChatTitle = chats.find(chat => chat.id === activeChat)?.title || 'Chat';

  return (
    <div className={`app-container ${isDarkMode ? 'dark-mode' : ''}`}>
      {/* Mobile top bar */}
      <div className="mobile-top-bar">
        <button className="menu-toggle" onClick={toggleSidebar}>
          ☰
        </button>
        <h2 className="mobile-chat-title">{activeChatTitle}</h2>
        <div className="theme-toggle mobile">
          <label className="switch">
            <input type="checkbox" checked={isDarkMode} onChange={toggleTheme} />
            <span className="slider round"></span>
          </label>
        </div>
      </div>

      {/* Sidebar overlay for mobile */}
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={toggleSidebar}></div>
      )}

      {/* Sidebar */}
      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <button className="new-chat-button" onClick={handleNewChat}>+ New Chat</button>
          <div className="theme-toggle desktop">
            <label className="switch">
              <input type="checkbox" checked={isDarkMode} onChange={toggleTheme} />
              <span className="slider round"></span>
            </label>
          </div>
        </div>
        <div className="chat-history">
          {chats.map(chat => (
            <div
              key={chat.id}
              className={`chat-history-item ${chat.id === activeChat ? 'active' : ''}`}
              onClick={() => handleChatSelect(chat.id)}
            >
              {editChatId === chat.id ? (
                <div className="edit-chat">
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                  />
                  <span className="save-icon" onClick={() => handleEditSave(chat.id)}>✔️</span>
                  <span className="cancel-icon" onClick={handleEditCancel}>❌</span>
                </div>
              ) : (
                <>
                  <span className="chat-title">{chat.title}</span>
                  <div className="chat-actions">
                    <span
                      className="edit-icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditStart(chat.id, chat.title);
                      }}
                    >✏️</span>
                    <span
                      className="delete-icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleChatDelete(chat.id);
                      }}
                    >🗑️</span>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Chat container */}
      <div className="chat-container">
        <h1 className="desktop-title">AI Chatbot</h1>
        <div className="chat-box">
          {messages.length === 0 ? (
            <div className="empty-message">No messages yet... Type a message to start chatting!</div>
          ) : (
            messages.map((message, index) => (
              <div key={index} className={`message ${message.sender}`}>
                {message.sender === 'bot' ? (
                  <ReactMarkdown>{message.text}</ReactMarkdown>
                ) : (
                  message.text
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="input-container">
          <div className="input-box">
            <input
              ref={inputRef}
              type="text"
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleMessageSend();
                }
              }}
            />
            <button 
              className="send-button" 
              onClick={handleMessageSend}
              aria-label="Send message"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <button onClick={handleResetChat} className="reset-button">Reset Chat</button>
        </div>
      </div>
    </div>
  );
}

export default Chatbot;
