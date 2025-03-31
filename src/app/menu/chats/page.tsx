"use client";

import { useState, useRef, useEffect } from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

// Definición de interfaces para TypeScript
interface Message {
  id: number;
  text: string;
  sender: 'me' | 'other';
  time: string;
}

interface Contact {
  id: number;
  name: string;
  avatar: string;
  status: 'online' | 'offline' | 'away';
  unread: number;
}

interface ChatMessages {
  [key: number]: Message[];
}

export default function Chat() {
  const [activeChat, setActiveChat] = useState<number>(1);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [showScrollButton, setShowScrollButton] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  // Usamos solo la constante contacts para leer, ya que no estamos modificando los contactos en esta página
  const [contacts] = useState<Contact[]>([
    { id: 1, name: 'Ana García', avatar: '👩‍🎓', status: 'online', unread: 2 },
    { id: 2, name: 'Carlos Rodríguez', avatar: '👨‍💻', status: 'offline', unread: 0 },
    { id: 3, name: 'Laura Martínez', avatar: '👩‍🔬', status: 'online', unread: 5 },
    { id: 4, name: 'Miguel Sánchez', avatar: '👨‍🎨', status: 'away', unread: 0 },
    { id: 5, name: 'Sofía López', avatar: '👩‍🏫', status: 'online', unread: 1 },
    { id: 6, name: 'Daniel Pérez', avatar: '👨‍🔧', status: 'online', unread: 3 },
    { id: 7, name: 'Isabella Flores', avatar: '👩‍⚕️', status: 'away', unread: 0 },
    { id: 8, name: 'Alejandro Torres', avatar: '👨‍✈️', status: 'offline', unread: 4 },
    { id: 9, name: 'Valentina Ruiz', avatar: '👩‍🚀', status: 'online', unread: 2 },
    { id: 10, name: 'Mateo Gómez', avatar: '👨‍🌾', status: 'offline', unread: 0 },
    { id: 11, name: 'Camila Díaz', avatar: '👩‍🍳', status: 'online', unread: 1 },
    { id: 12, name: 'Santiago Herrera', avatar: '👨‍🏭', status: 'away', unread: 0 },
    { id: 13, name: 'Lucía Mendoza', avatar: '👩‍🔧', status: 'online', unread: 7 },
    { id: 14, name: 'Emilio Castro', avatar: '👨‍🚒', status: 'offline', unread: 0 },
    { id: 15, name: 'Paula Vargas', avatar: '👩‍💼', status: 'online', unread: 2 },
    { id: 16, name: 'Javier Reyes', avatar: '👨‍⚖️', status: 'away', unread: 1 },
    { id: 17, name: 'Mariana Ortiz', avatar: '👩‍🎤', status: 'online', unread: 0 },
    { id: 18, name: 'Tomás Núñez', avatar: '👨‍🎓', status: 'offline', unread: 3 },
    { id: 19, name: 'Andrea Vega', avatar: '👩‍🏭', status: 'online', unread: 0 },
    { id: 20, name: 'Leonardo Jiménez', avatar: '👨‍🔬', status: 'away', unread: 5 }
  ]);

  const [chats, setChats] = useState<ChatMessages>({
    1: [
      { id: 1, text: '¡Hola! ¿Cómo vas con el proyecto de BD?', sender: 'other', time: '09:30' },
      { id: 2, text: 'Bien, estoy terminando el diseño de la base de datos', sender: 'me', time: '09:32' },
      { id: 3, text: '¿Necesitas ayuda con algo?', sender: 'other', time: '09:33' },
      { id: 4, text: 'Sí, tengo dudas con las relaciones', sender: 'me', time: '09:35' },
      { id: 5, text: 'Podemos revisar juntos más tarde', sender: 'other', time: '09:36' },
    ],
    2: [
      { id: 1, text: '¿Asistirás a la clase de mañana?', sender: 'other', time: '15:20' },
      { id: 2, text: 'Sí, es importante para el examen', sender: 'me', time: '15:25' },
    ],
    3: [
      { id: 1, text: '¡Felicidades por tu calificación!', sender: 'other', time: '14:10' },
      { id: 2, text: '¡Gracias! Estudié mucho', sender: 'me', time: '14:12' },
      { id: 3, text: '¿Me pasas tus apuntes?', sender: 'other', time: '14:15' },
      { id: 4, text: 'Claro, te los envío por email', sender: 'me', time: '14:20' },
      { id: 5, text: '¡Genial! Te lo agradezco mucho', sender: 'other', time: '14:21' },
    ],
  });

  const handleSendMessage = () => {
    if (inputMessage.trim() === '') return;
    
    const newMessage: Message = {
      id: chats[activeChat] ? chats[activeChat].length + 1 : 1,
      text: inputMessage,
      sender: 'me',
      time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    };
    
    setChats(prev => ({
      ...prev,
      [activeChat]: prev[activeChat] ? [...prev[activeChat], newMessage] : [newMessage]
    }));
    
    setInputMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setInputMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  // Filtrar contactos según la búsqueda
  const filteredContacts = contacts.filter(contact => 
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Detectar cuando el usuario ha scrolleado hacia arriba
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      // Mostrar el botón de scroll si no está en el fondo
      // (dejamos un pequeño margen de 100px)
      setShowScrollButton(scrollHeight - scrollTop - clientHeight > 100);
    }
  };

  // Extraer el valor dependencia para useEffect
  const currentChatMessages = chats[activeChat];

  useEffect(() => {
    // Scroll to bottom cuando cambian los mensajes
    scrollToBottom();
  }, [currentChatMessages]);

  useEffect(() => {
    // Añadir evento de scroll al contenedor de mensajes
    const messagesContainer = messagesContainerRef.current;
    if (messagesContainer) {
      messagesContainer.addEventListener('scroll', handleScroll);
    }
    
    return () => {
      if (messagesContainer) {
        messagesContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Contacts sidebar */}
      <div className="w-1/4 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
        <div className="flex-none p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-800">Mensajes</h1>
          <div className="mt-2 relative">
            <Input
              type="text"
              placeholder="Buscar contactos..."
              className="w-full pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <svg className="w-4 h-4 absolute left-2 top-2.5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <div className="divide-y divide-gray-100">
            {filteredContacts.length > 0 ? (
              filteredContacts.map(contact => (
                <div
                  key={contact.id}
                  className={`p-3 flex items-center cursor-pointer hover:bg-gray-50 ${activeChat === contact.id ? 'bg-blue-50' : ''}`}
                  onClick={() => setActiveChat(contact.id)}
                >
                  <div className="relative">
                    <div className="text-2xl">{contact.avatar}</div>
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ${
                      contact.status === 'online' ? 'bg-green-500' : 
                      contact.status === 'away' ? 'bg-yellow-500' : 'bg-gray-400'
                    } border-2 border-white`}></div>
                  </div>
                  <div className="ml-3 flex-1">
                    <div className="flex justify-between items-center">
                      <p className="font-medium text-gray-900">{contact.name}</p>
                      <p className="text-xs text-gray-500">12:30</p>
                    </div>
                    <p className="text-sm text-gray-500 truncate">Último mensaje...</p>
                  </div>
                  {contact.unread > 0 && (
                    <div className="ml-2 bg-blue-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {contact.unread}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500">
                No se encontraron contactos con ese nombre
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Chat area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Chat header - fixed */}
        <div className="flex-none p-3 border-b border-gray-200 bg-white flex items-center">
          <div className="text-2xl mr-2">
            {contacts.find(c => c.id === activeChat)?.avatar}
          </div>
          <div>
            <h2 className="font-medium text-gray-900">
              {contacts.find(c => c.id === activeChat)?.name}
            </h2>
            <p className="text-xs text-gray-500">
              {contacts.find(c => c.id === activeChat)?.status === 'online' 
                ? 'En línea' 
                : contacts.find(c => c.id === activeChat)?.status === 'away'
                  ? 'Ausente'
                  : 'Desconectado'}
            </p>
          </div>
        </div>
        
        {/* Messages - scrollable area */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50"
          onScroll={handleScroll}
        >
          {chats[activeChat]?.map((message: Message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-lg ${
                message.sender === 'me' 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : 'bg-white text-gray-800 rounded-bl-none shadow-sm'
              }`}>
                <div>{message.text}</div>
                <div className={`text-xs mt-1 ${message.sender === 'me' ? 'text-blue-200' : 'text-gray-500'} text-right`}>
                  {message.time}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
          
          {/* Botón para volver al fondo del chat */}
          {showScrollButton && (
            <div className="fixed bottom-24 right-8 z-10">
              <Button
                onClick={scrollToBottom}
                size="icon"
                className="bg-blue-600 text-white rounded-full hover:bg-blue-700 shadow-md"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </Button>
            </div>
          )}
        </div>
        
        {/* Input area - fixed */}
        <div className="flex-none p-3 border-t border-gray-200 bg-white">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="icon"
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </Button>
            <div className="relative">
              <Button 
                variant="ghost" 
                size="icon"
                className="p-2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              >
                <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </Button>
              {showEmojiPicker && (
                <div className="absolute bottom-12 left-0 z-10">
                  <EmojiPicker onEmojiClick={handleEmojiClick} />
                </div>
              )}
            </div>
            <div className="flex-1 mx-2">
              <Textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Escribe un mensaje..."
                className="min-h-[40px] px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none overflow-hidden"
              />
            </div>
            <Button 
              onClick={handleSendMessage}
              className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 focus:outline-none"
              size="icon"
            >
              <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
