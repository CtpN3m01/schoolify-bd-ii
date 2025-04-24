"use client";

import { useState, useRef, useEffect } from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { io as clientIO, Socket } from 'socket.io-client';

interface Usuario {
  _id: string;
  nombreUsuario: string;
  nombre: string;
  apellido1: string;
  apellido2: string;
  foto?: string;
}

interface Message {
  _id?: string;
  from: string;
  to: string;
  contenido: string;
  fecha?: string;
  epochMillis?: number | { low: number; high: number };
}

export default function Chat() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // Simulación: usuario actual (esto debería venir de auth)
  const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : '';

  // Cargar usuarios reales
  useEffect(() => {
    fetch('/api/test/get_usuarios')
      .then(res => res.json())
      .then(data => setUsuarios(data.data || []));
  }, []);

  // Cargar historial de mensajes cuando cambia el chat activo
  useEffect(() => {
    if (!activeChat) return;
    fetch(`/api/neo4jDB/historial-mensajes?fromId=${currentUserId}&toId=${activeChat}`)
      .then(res => res.json())
      .then(data => {
        // Ordenar mensajes por fecha ascendente
        const mensajes = (data.mensajes || []).slice().sort((a: any, b: any) => {
          // Soportar string ISO y objeto Neo4j {low}
          const getTime = (fecha: any) => {
            if (!fecha) return 0;
            if (typeof fecha === 'string' && !isNaN(Date.parse(fecha))) return new Date(fecha).getTime();
            if (typeof fecha === 'object' && fecha !== null && Object.prototype.hasOwnProperty.call(fecha, 'low')) return (fecha as any).low;
            return 0;
          };
          return getTime(a.fecha) - getTime(b.fecha);
        });
        setMessages(mensajes);
      });
  }, [activeChat, currentUserId]);

  // Scroll automático
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Conexión a socket.io
  useEffect(() => {
    const socket = clientIO({
      path: '/api/socket_io',
      autoConnect: false
    });
    socketRef.current = socket;
    if (currentUserId) {
      socket.connect();
      socket.emit('join', currentUserId);
    }
    socket.on('receive-message', (msg: Message) => {
      // Solo agregar si el mensaje es para el chat activo
      if (msg.from === activeChat || msg.to === activeChat) {
        setMessages(prev => [...prev, msg]);
      }
    });
    return () => {
      socket.disconnect();
    };
  }, [currentUserId, activeChat]);

  // Enviar mensaje (ahora también por socket.io)
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !activeChat) return;
    const res = await fetch('/api/neo4jDB/enviar-mensaje', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromId: currentUserId, toId: activeChat, contenido: inputMessage })
    });
    const data = await res.json();
    if (data.success) {
      const msg = { ...data.mensaje, from: currentUserId, to: activeChat };
      setMessages(prev => [...prev, msg]);
      setInputMessage('');
      // Emitir por socket.io
      socketRef.current?.emit('send-message', msg);
    }
  };

  // Filtrar usuarios
  const filteredUsuarios = usuarios.filter(u =>
    u._id !== currentUserId &&
    (u.nombreUsuario.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.nombre.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar de usuarios */}
      <div className="w-1/4 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
        <div className="flex-none p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-800">Mensajes</h1>
          <div className="mt-2 relative">
            <Input
              type="text"
              placeholder="Buscar usuarios..."
              className="w-full pl-8"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <svg className="w-4 h-4 absolute left-2 top-2.5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="divide-y divide-gray-100">
            {filteredUsuarios.length > 0 ? (
              filteredUsuarios.map(u => (
                <div
                  key={u._id}
                  className={`p-3 flex items-center cursor-pointer hover:bg-gray-50 ${activeChat === u._id ? 'bg-blue-50' : ''}`}
                  onClick={() => setActiveChat(u._id)}
                >
                  <Avatar>
                    <AvatarImage src={u.foto || undefined} alt={u.nombreUsuario} />
                    <AvatarFallback>{u.nombreUsuario[0]}</AvatarFallback>
                  </Avatar>
                  <div className="ml-3 flex-1">
                    <div className="flex justify-between items-center">
                      <p className="font-medium text-gray-900">{u.nombre} {u.apellido1}</p>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{u.nombreUsuario}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500">No se encontraron usuarios</div>
            )}
          </div>
        </div>
      </div>
      {/* Chat area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Chat header */}
        <div className="flex-none p-3 border-b border-gray-200 bg-white flex items-center">
          {activeChat && (
            <>
              <Avatar>
                <AvatarImage src={usuarios.find(u => u._id === activeChat)?.foto || undefined} alt={usuarios.find(u => u._id === activeChat)?.nombreUsuario || ''} />
                <AvatarFallback>{usuarios.find(u => u._id === activeChat)?.nombreUsuario[0]}</AvatarFallback>
              </Avatar>
              <div className="ml-3">
                <h2 className="font-medium text-gray-900">{usuarios.find(u => u._id === activeChat)?.nombre} {usuarios.find(u => u._id === activeChat)?.apellido1}</h2>
                <p className="text-xs text-gray-500">{usuarios.find(u => u._id === activeChat)?.nombreUsuario}</p>
              </div>
            </>
          )}
        </div>
        {/* Mensajes */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {(() => {
            let lastDate: string | null = null;
            return messages.map((m, idx) => {
              // Obtener fecha (solo día, mes, año)
              let dateObj: Date | null = null;
              // Usar epochMillis si existe, si no usar fecha
              if (m.epochMillis) {
                // Puede venir como Neo4j Integer {low, high} o como number
                let ms = typeof m.epochMillis === 'object' && m.epochMillis !== null && 'low' in m.epochMillis
                  ? (m.epochMillis as any).low
                  : m.epochMillis;
                dateObj = new Date(Number(ms));
              } else if (m.fecha) {
                if (typeof m.fecha === 'string' && !isNaN(Date.parse(m.fecha))) {
                  dateObj = new Date(m.fecha);
                } else if (typeof m.fecha === 'object' && m.fecha !== null && Object.prototype.hasOwnProperty.call(m.fecha, 'low')) {
                  dateObj = new Date((m.fecha as any).low);
                }
              }
              const dateStr = dateObj ? dateObj.toLocaleDateString() : '';
              const showDate = dateStr && dateStr !== lastDate;
              lastDate = dateStr || lastDate;
              return [
                showDate && (
                  <div key={`date-${dateStr}`} className="text-center text-xs text-gray-400 my-2 select-none">
                    {dateObj?.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                ),
                <div key={m._id || idx} className={`flex ${m.from === currentUserId ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-lg ${m.from === currentUserId ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none shadow-sm'}`}>
                    <div>{m.contenido}</div>
                    <div className={`text-xs mt-1 ${m.from === currentUserId ? 'text-blue-200' : 'text-gray-500'} text-right`}>
                      {dateObj ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </div>
                  </div>
                </div>
              ];
            });
          })()}
          <div ref={messagesEndRef} />
        </div>
        {/* Input */}
        <div className="flex-none p-3 border-t border-gray-200 bg-white">
          <div className="flex items-center">
            <div className="relative">
              <Button variant="ghost" size="icon" className="p-2 text-gray-400 hover:text-gray-600" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </Button>
              {showEmojiPicker && (
                <div className="absolute bottom-12 left-0 z-10">
                  <EmojiPicker onEmojiClick={(emojiData: EmojiClickData) => { setInputMessage(prev => prev + emojiData.emoji); setShowEmojiPicker(false); }} />
                </div>
              )}
            </div>
            <div className="flex-1 mx-2">
              <Textarea
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                placeholder="Escribe un mensaje..."
                className="min-h-[40px] px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none overflow-hidden"
              />
            </div>
            <Button onClick={handleSendMessage} className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 focus:outline-none" size="icon">
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
