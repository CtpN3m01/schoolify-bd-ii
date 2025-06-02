'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { io as clientIO, Socket } from 'socket.io-client';
import { useRouter } from 'next/navigation';
import { useUser } from '@/app/UserContext';

interface Usuario {
  _id: string;
  nombreUsuario: string;
  nombre: string;
  apellido1: string;
  apellido2: string;
  foto?: string;
  ultimoMensaje?: Message;
  unreadCount?: number;
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
  const [showScrollButton, setShowScrollButton] = useState(false);  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const router = useRouter();
  const { user } = useUser();
  // Get current user ID from context
  const currentUserId = user?._id || '';

  // Debug user info
  useEffect(() => {
    console.log('Current user from context:', user);
    console.log('Current userId:', currentUserId);
  }, [user, currentUserId]);  // Cargar usuarios con conversaciones existentes
  useEffect(() => {
    if (!currentUserId) return;
    
    fetch(`/api/neo4jDB/usuarios-con-conversaciones?userId=${currentUserId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.usuarios)) {
          console.log('Usuarios con conversaciones cargados:', data.usuarios);
          
          // Filtrar usuarios válidos
          const usuariosValidos = data.usuarios.filter((u: any) => 
            u && u._id && u.nombreUsuario && u.nombre
          );
            setUsuarios(usuariosValidos);
          
          console.log('Usuarios válidos cargados:', usuariosValidos.length);
        } else {
          console.warn('Respuesta inválida del servidor:', data);
          setUsuarios([]);
        }
      })
      .catch(error => {
        console.error('Error cargando usuarios con conversaciones:', error);
        setUsuarios([]);
      });
  }, [currentUserId]);
  // Estado para marcar chats con mensajes nuevos
  const [newMessages, setNewMessages] = useState<{ [userId: string]: boolean }>({});// Actualizar mensajes y contadores en tiempo real
  useEffect(() => {
    if (!socketRef.current) return;
    const socket = socketRef.current;
    
    // Cuando recibo un mensaje, actualizar mensajes y contadores en tiempo real
    socket.on('receive-message', (msg: Message) => {
      console.log('Mensaje recibido por socket:', msg);
      
      // SOLO agregar el mensaje si es para el chat activo y NO es un mensaje que yo envié
      // (los mensajes que yo envío ya se agregan inmediatamente al enviar)
      if (msg.from === activeChat && msg.to === currentUserId) {
        setMessages(prev => {
          // Verificar duplicados usando múltiples criterios
          const exists = prev.some(existingMsg => {
            // Mismo ID
            if (existingMsg._id && msg._id && existingMsg._id === msg._id) return true;
            
            // Mismo contenido, emisor, receptor y tiempo muy cercano (dentro de 2 segundos)
            const timeDiff = Math.abs(
              (existingMsg.epochMillis as number || 0) - (msg.epochMillis as number || 0)
            );
            
            return existingMsg.from === msg.from && 
                   existingMsg.to === msg.to && 
                   existingMsg.contenido === msg.contenido &&
                   timeDiff < 2000;
          });
          
          if (exists) {
            console.log('Mensaje duplicado detectado, no agregando');
            return prev;
          }
          
          console.log('Agregando nuevo mensaje recibido');
          return [...prev, msg];
        });
      }
        // Si el mensaje es para mí pero NO estoy en ese chat, marcar como nuevo mensaje
      if (msg.to === currentUserId && msg.from !== activeChat && msg.from !== currentUserId) {
        setNewMessages(prev => ({
          ...prev,
          [msg.from]: true
        }));
      }
    });
    
    return () => {
      socket.off('receive-message');
    };
  }, [activeChat, currentUserId]);  // Limpiar marca de mensaje nuevo al abrir un chat
  useEffect(() => {
    if (!activeChat) return;
    setNewMessages(prev => ({ ...prev, [activeChat]: false }));
  }, [activeChat]);
  // Ordenar usuarios: primero los que tienen mensajes nuevos, 
  // luego por último mensaje más reciente
  const usuariosOrdenados = usuarios.slice().sort((a, b) => {
    const hasNewA = newMessages[a._id] || false;
    const hasNewB = newMessages[b._id] || false;
    
    // Priorizar usuarios con mensajes nuevos
    if (hasNewA && !hasNewB) return -1;
    if (hasNewB && !hasNewA) return 1;
    
    // Si ambos tienen o no tienen mensajes nuevos, ordenar por último mensaje
    const getLastMessageTime = (usuario: Usuario) => {
      if (!usuario.ultimoMensaje) return 0;
      const msg = usuario.ultimoMensaje;
      if (msg.epochMillis) {
        return typeof msg.epochMillis === 'object' && msg.epochMillis !== null && 'low' in msg.epochMillis
          ? (msg.epochMillis as any).low
          : msg.epochMillis as number;
      }
      if (msg.fecha) {
        if (typeof msg.fecha === 'string' && !isNaN(Date.parse(msg.fecha))) 
          return new Date(msg.fecha).getTime();
        if (typeof msg.fecha === 'object' && msg.fecha !== null && 'low' in msg.fecha) 
          return (msg.fecha as any).low;
      }
      return 0;
    };
    
    return getLastMessageTime(b) - getLastMessageTime(a);
  });// Función para eliminar duplicados del historial  // Función para eliminar duplicados del historial
  const removeDuplicateMessages = (messages: Message[]): Message[] => {
    const seen = new Set<string>();
    return messages.filter(msg => {
      // Crear una clave única basada en contenido, emisor, receptor y tiempo
      const timePart = typeof msg.epochMillis === 'object' && msg.epochMillis !== null && 'low' in msg.epochMillis
        ? (msg.epochMillis as any).low
        : (msg.epochMillis || 0);
      
      const key = `${msg.from}-${msg.to}-${msg.contenido}-${Math.floor(Number(timePart) / 1000)}`; // Agrupamos por segundo
      
      if (seen.has(key)) {
        console.log('Duplicado removido:', msg.contenido);
        return false;
      }
      
      seen.add(key);
      return true;
    });
  };

  // Cargar historial de mensajes cuando cambia el chat activo
  useEffect(() => {
    if (!activeChat || !currentUserId) return;
    
    fetch(`/api/neo4jDB/historial-mensajes?fromId=${currentUserId}&toId=${activeChat}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          // Ordenar mensajes por fecha ascendente
          const mensajesOrdenados = (data.mensajes || []).slice().sort((a: any, b: any) => {
            // Soportar string ISO y objeto Neo4j {low}
            const getTime = (fecha: any) => {
              if (!fecha) return 0;
              if (typeof fecha === 'string' && !isNaN(Date.parse(fecha))) return new Date(fecha).getTime();
              if (typeof fecha === 'object' && fecha !== null && Object.prototype.hasOwnProperty.call(fecha, 'low')) return (fecha as any).low;
              return 0;
            };
            return getTime(a.fecha) - getTime(b.fecha);
          });
          
          // Eliminar duplicados
          const mensajesSinDuplicados = removeDuplicateMessages(mensajesOrdenados);
          console.log(`Historial cargado: ${data.mensajes?.length || 0} mensajes, ${mensajesSinDuplicados.length} únicos`);
          
          setMessages(mensajesSinDuplicados);
        }
      })
      .catch(error => {
        console.error('Error cargando historial:', error);
        setMessages([]);
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
    return () => {
      socket.disconnect();
    };
  }, [currentUserId]);  // Enviar mensaje (ahora también por socket.io)
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !activeChat || !currentUserId) return;
    
    console.log('Enviando mensaje:', { fromId: currentUserId, toId: activeChat, contenido: inputMessage });
    
    try {
      const res = await fetch('/api/neo4jDB/enviar-mensaje', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromId: currentUserId, toId: activeChat, contenido: inputMessage })
      });
      
      const data = await res.json();
      console.log('Respuesta del servidor:', data);
      
      if (data.success) {
        // Crear el mensaje con la estructura correcta
        const nuevoMensaje: Message = {
          _id: data.mensaje?._id || `temp-${Date.now()}`,
          from: currentUserId,
          to: activeChat,
          contenido: inputMessage,
          fecha: data.mensaje?.fecha || new Date().toISOString(),
          epochMillis: data.mensaje?.epochMillis || Date.now()
        };
        
        // Agregar inmediatamente a los mensajes locales
        setMessages(prev => [...prev, nuevoMensaje]);
        setInputMessage('');
        
        // Emitir por socket.io para que el destinatario lo reciba
        socketRef.current?.emit('send-message', nuevoMensaje);
      } else {
        console.error('Error al enviar mensaje:', data.error || 'Error desconocido');
      }
    } catch (error) {
      console.error('Error en handleSendMessage:', error);
    }
  };

  // Filtrar usuarios (no mostrar el propio usuario en la lista de chats)
  const filteredUsuarios = usuariosOrdenados.filter(u =>
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
        <div className="flex-1 overflow-y-auto">          <div className="divide-y divide-gray-100">
            {filteredUsuarios.length > 0 ? (
              filteredUsuarios.map(u => {
                // Validar que el usuario tenga los campos necesarios
                if (!u._id || !u.nombreUsuario || !u.nombre) {
                  console.warn('Usuario con datos incompletos:', u);
                  return null;
                }
                
                return (
                  <div
                    key={`user-${u._id}`}
                    className={`p-3 flex items-center cursor-pointer hover:bg-gray-50 ${activeChat === u._id ? 'bg-blue-50' : ''}`}
                    onClick={() => setActiveChat(u._id)}
                  >
                    <Avatar>
                      <AvatarImage src={u.foto || undefined} alt={u.nombreUsuario} />
                      <AvatarFallback>{u.nombreUsuario[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="ml-3 flex-1">                      <div className="flex justify-between items-center">
                        <p className="font-medium text-gray-900">{u.nombre} {u.apellido1}</p>
                        {/* Mostrar indicador solo si hay mensajes nuevos y NO es el chat activo */}
                        {newMessages[u._id] && activeChat !== u._id && (
                          <span className="ml-2 bg-green-500 text-white rounded-full px-2 py-0.5 text-xs font-bold">Nuevo</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {searchQuery ? 
                          u.nombreUsuario : 
                          (u.ultimoMensaje && u.ultimoMensaje.contenido ? 
                            (u.ultimoMensaje.contenido.length > 30 ? 
                              u.ultimoMensaje.contenido.substring(0, 30) + '...' : 
                              u.ultimoMensaje.contenido
                            ) : 
                            u.nombreUsuario
                          )
                        }
                      </p>
                    </div>
                  </div>
                );
              }).filter(Boolean) // Filtrar elementos null
            ) : usuarios.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <div className="text-gray-400 mb-2">💬</div>
                <p>No tienes conversaciones aún</p>
                <p className="text-xs mt-1">Inicia una conversación con tus compañeros</p>
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500">
                <div className="text-gray-400 mb-2">🔍</div>
                <p>No se encontraron usuarios</p>
                <p className="text-xs mt-1">Prueba con otro término de búsqueda</p>
              </div>
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
              <Avatar
                onClick={() => {
                  const usuario = usuarios.find(u => u._id === activeChat);
                  if (usuario) router.push(`/menu/perfil?id=${usuario.nombreUsuario}`);
                }}
                className="cursor-pointer"
              >
                <AvatarImage src={usuarios.find(u => u._id === activeChat)?.foto || undefined} alt={usuarios.find(u => u._id === activeChat)?.nombreUsuario || ''} />
                <AvatarFallback>{usuarios.find(u => u._id === activeChat)?.nombreUsuario[0]}</AvatarFallback>
              </Avatar>
              <div className="ml-3 cursor-pointer" onClick={() => {
                const usuario = usuarios.find(u => u._id === activeChat);
                if (usuario) router.push(`/menu/perfil?id=${usuario.nombreUsuario}`);
              }}>
                <h2 className="font-medium text-gray-900">{usuarios.find(u => u._id === activeChat)?.nombre} {usuarios.find(u => u._id === activeChat)?.apellido1}</h2>
                <p className="text-xs text-gray-500">{usuarios.find(u => u._id === activeChat)?.nombreUsuario}</p>
              </div>
            </>
          )}
        </div>        {/* Mensajes */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {(() => {
            let lastDate: string | null = null;
            const renderedItems: React.ReactElement[] = [];
            let keyCounter = 0;
            
            messages.forEach((m, idx) => {
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
                if (showDate) {
                keyCounter++;
                renderedItems.push(
                  <div key={`date-${keyCounter}`} className="text-center text-xs text-gray-400 my-2 select-none">
                    {dateObj?.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                );
                lastDate = dateStr;
              }
              
              // Generar clave única simple usando contador
              keyCounter++;
              const messageKey = `msg-${keyCounter}`;
              
              renderedItems.push(
                <div key={messageKey} className={`flex ${m.from === currentUserId ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-lg ${m.from === currentUserId ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none shadow-sm'}`}>
                    <div>{m.contenido}</div>
                    <div className={`text-xs mt-1 ${m.from === currentUserId ? 'text-blue-200' : 'text-gray-500'} text-right`}>
                      {dateObj ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </div>
                  </div>
                </div>
              );
            });
            
            return renderedItems;
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
