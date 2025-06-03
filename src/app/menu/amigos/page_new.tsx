"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useState, useEffect, useCallback, useRef } from "react"
import { Search, RefreshCw } from "lucide-react"
import Image from "next/image"
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

// Definición de tipos
interface Friend {
  id: number;
  name: string;
  username?: string;
  avatar: string;
  status: string;
  description?: string;
  university?: string;
  mutualFriends?: number;
}

interface Suggestion {
  id: number;
  name: string;
  avatar: string;
  mutualFriends: number;
  description?: string;
  university?: string;
}

export default function Amigos() {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [solicitudes, setSolicitudes] = useState<Friend[]>([]);
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(false);
  const [searchUsername, setSearchUsername] = useState("");
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  
  // Refs para debounce
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSearchRef = useRef<string>("");
  
  // Simulación: usuario actual (debería venir de auth)
  const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : '';

  // Debug para verificar el userId
  useEffect(() => {
    console.log('Current userId en amigos:', currentUserId);
  }, [currentUserId]);

  // Función de búsqueda con debounce
  const searchUsersWithDebounce = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      setSearchError("");
      return;
    }

    // Limpiar timeout anterior
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Si es la misma búsqueda, no hacer nada
    if (lastSearchRef.current === query) return;
    lastSearchRef.current = query;

    // Establecer nuevo timeout para búsqueda
    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      setSearchError("");
      
      try {
        // Buscar por coincidencia exacta primero
        const exactRes = await fetch(`/api/neo4jDB/buscar-usuario-por-username?username=${encodeURIComponent(query)}&userId=${currentUserId}`);
        
        // Buscar por similitud/porcentaje usando explorar con el query como filtro
        const exploreRes = await fetch(`/api/neo4jDB/explorar?userId=${currentUserId}&search=${encodeURIComponent(query)}&limit=5`);
        
        const results: Friend[] = [];
        
        // Agregar resultado exacto si existe
        if (exactRes.ok) {
          const exactData = await exactRes.json();
          results.push({
            id: exactData._id,
            name: exactData.nombre,
            username: exactData.nombreUsuario,
            avatar: exactData.foto,
            status: exactData.estado,
            description: exactData.descripcion,
            university: exactData.universidad
          });
        }
        
        // Agregar resultados similares si existen (usando explorar como fallback)
        if (exploreRes.ok) {
          const exploreData = await exploreRes.json();
          const similarUsers = (exploreData.usuarios || [])
            .filter((user: any) => 
              user._id !== currentUserId && // No incluir el usuario actual
              !results.some(r => r.id === user._id) && // Evitar duplicados
              (user.nombre.toLowerCase().includes(query.toLowerCase()) || 
               user.nombreUsuario.toLowerCase().includes(query.toLowerCase()))
            )
            .slice(0, 4) // Limitar a 4 resultados adicionales
            .map((user: any) => ({
              id: user._id,
              name: user.nombre,
              username: user.nombreUsuario,
              avatar: user.foto,
              status: user.estado || 'offline',
              description: user.descripcion,
              university: user.universidad
            }));
          
          results.push(...similarUsers);
        }
        
        if (results.length === 0) {
          setSearchError("No se encontraron usuarios");
        }
        
        setSearchResults(results);
      } catch (error) {
        console.error('Error en búsqueda:', error);
        setSearchError("Error buscando usuarios");
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300); // Debounce de 300ms
  }, [currentUserId]);
  
  // Actualizar búsqueda cuando cambie el input
  useEffect(() => {
    searchUsersWithDebounce(searchUsername);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchUsername, searchUsersWithDebounce]);

  // Cargar amigos reales
  useEffect(() => {
    if (!currentUserId) return;
    setLoadingFriends(true);
    fetch(`/api/neo4jDB/listar-amigos?userId=${currentUserId}`)
      .then(res => res.json())
      .then(data => setFriends(data.amigos || []))
      .finally(() => setLoadingFriends(false));
  }, [currentUserId]);

  // Cargar solicitudes de amistad recibidas
  useEffect(() => {
    if (!currentUserId) return;
    setLoadingSolicitudes(true);
    fetch(`/api/neo4jDB/solicitudes-pendientes?userId=${currentUserId}`)
      .then(res => res.json())
      .then(data => setSolicitudes(data.solicitudes || []))
      .finally(() => setLoadingSolicitudes(false));
  }, [currentUserId]);

  // Sugerencias de amigos
  useEffect(() => {
    if (!currentUserId) return;
    setLoadingSuggestions(true);
    fetch(`/api/neo4jDB/sugerencias-amigos?userId=${currentUserId}`)
      .then(res => res.json())
      .then(data => setSuggestions(data.sugerencias || []))
      .finally(() => setLoadingSuggestions(false));
  }, [currentUserId]);

  // Función mejorada para actualizar solicitudes con mejor manejo de errores
  const actualizarSolicitudes = useCallback(async () => {
    if (!currentUserId) return;
    
    setLoadingSolicitudes(true);
    try {
      console.log('Actualizando solicitudes para usuario:', currentUserId);
      const response = await fetch(`/api/neo4jDB/solicitudes-pendientes?userId=${currentUserId}&timestamp=${Date.now()}`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Solicitudes recibidas:', data);
      
      setSolicitudes(data.solicitudes || []);
      
      if (data.solicitudes && data.solicitudes.length > 0) {
        toast(`Se encontraron ${data.solicitudes.length} solicitudes pendientes`);
      } else {
        toast('No hay solicitudes pendientes en este momento');
      }
    } catch (error) {
      console.error('Error actualizando solicitudes:', error);
      toast('Error al actualizar solicitudes');
      setSearchError('Error al actualizar solicitudes');
    } finally {
      setLoadingSolicitudes(false);
    }
  }, [currentUserId]);

  // Filtrar amigos basado en la búsqueda
  // Elimina duplicados por id (string o number)
  const uniqueFriends = Array.from(new Map(friends.map(f => [String(f.id), f])).values());
  const filteredFriends = uniqueFriends.filter(friend => 
    friend.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Eliminar duplicados de solicitudes también
  const uniqueSolicitudes = Array.from(new Map(solicitudes.map(s => [String(s.id), s])).values());
  
  // Filtrar sugerencias basado en la búsqueda
  const filteredSuggestions = suggestions.filter(suggestion => 
    suggestion.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Refrescar amigos y solicitudes tras aceptar/rechazar/agregar
  // Se pasa como prop a FriendCard
  const refreshFriendsAndSolicitudes = () => {
    setLoadingFriends(true);
    fetch(`/api/neo4jDB/listar-amigos?userId=${currentUserId}`)
      .then(res => res.json())
      .then(data => setFriends(data.amigos || []))
      .finally(() => setLoadingFriends(false));
    setLoadingSolicitudes(true);
    fetch(`/api/neo4jDB/solicitudes-pendientes?userId=${currentUserId}`)
      .then(res => res.json())
      .then(data => setSolicitudes(data.solicitudes || []))
      .finally(() => setLoadingSolicitudes(false));
  };

  return (
    <div className="min-h-screen p-4 pb-16 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Amigos</h1>
        
        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="w-full mb-5 p-1">
            <TabsTrigger value="friends" className="flex-1">Tus amigos</TabsTrigger>
            <TabsTrigger value="solicitudes" className="flex-1">Solicitudes de amistad</TabsTrigger>
            <TabsTrigger value="suggestions" className="flex-1">Sugerencias</TabsTrigger>
          </TabsList>
          
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            <Input
              type="search"
              placeholder="Buscar amigos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          
          <TabsContent value="friends">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loadingFriends ? (
                <div className="text-center col-span-full py-8 text-muted-foreground">Cargando amigos...</div>
              ) : filteredFriends.length > 0 ? (
                filteredFriends.map((friend) => (
                  <FriendCard 
                    key={friend.id}
                    id={friend.id}
                    name={friend.name}
                    username={friend.username}
                    avatar={friend.avatar}
                    status={friend.status}
                    description={friend.description}
                    university={friend.university}
                    refresh={refreshFriendsAndSolicitudes}
                  />
                ))
              ) : (
                <div className="text-left p-6 border rounded-lg bg-muted/30 col-span-full">
                  <p className="text-muted-foreground">
                    {searchQuery ? "No se encontraron amigos con ese nombre." : "No tienes amigos agregados todavía."}
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="solicitudes">
            <div className="mb-4">
              <div className="flex gap-2 mb-4">
                <Input
                  type="search"
                  placeholder="Buscar usuario (búsqueda en tiempo real)..."
                  value={searchUsername}
                  onChange={e => setSearchUsername(e.target.value)}
                  className="flex-1"
                />
                <button
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-60 text-sm flex items-center gap-2"
                  onClick={actualizarSolicitudes}
                  disabled={loadingSolicitudes}
                >
                  <RefreshCw className={`w-4 h-4 ${loadingSolicitudes ? 'animate-spin' : ''}`} />
                  {loadingSolicitudes ? 'Actualizando...' : 'Actualizar Solicitudes'}
                </button>
              </div>
              
              {/* Indicador de búsqueda */}
              {searching && (
                <div className="text-sm text-blue-600 mb-2 flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  Buscando usuarios...
                </div>
              )}
              
              {/* Error de búsqueda */}
              {searchError && (
                <div className="text-sm text-destructive mb-2">{searchError}</div>
              )}
              
              {/* Resultados de búsqueda */}
              {searchResults.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Resultados de búsqueda ({searchResults.length}):
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {searchResults.map((result) => (
                      <FriendCard
                        key={result.id}
                        name={result.name}
                        avatar={result.avatar}
                        status={result.status}
                        description={result.description}
                        university={result.university}
                        id={result.id}
                        username={result.username}
                        showAddFriend
                        refresh={refreshFriendsAndSolicitudes}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loadingSolicitudes ? (
                <div className="text-center col-span-full py-8 text-muted-foreground">Cargando solicitudes...</div>
              ) : uniqueSolicitudes.length > 0 ? (
                uniqueSolicitudes.map((sol) => (
                  <FriendCard
                    key={sol.id}
                    name={sol.name}
                    username={sol.username}
                    avatar={sol.avatar}
                    status={sol.status}
                    description={sol.description}
                    university={sol.university}
                    id={sol.id}
                    showAcceptReject
                    refresh={refreshFriendsAndSolicitudes}
                  />
                ))
              ) : (
                <div className="text-left p-6 border rounded-lg bg-muted/30 col-span-full">
                  <p className="text-muted-foreground">No tienes solicitudes pendientes.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="suggestions">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loadingSuggestions ? (
                <div className="text-center col-span-full py-8 text-muted-foreground">Cargando sugerencias...</div>
              ) : filteredSuggestions.length > 0 ? (
                filteredSuggestions.map((suggestion) => (
                  <FriendCard
                    key={suggestion.id}
                    id={suggestion.id}
                    name={suggestion.name}
                    avatar={suggestion.avatar}
                    status="suggestion"
                    description={suggestion.description}
                    university={suggestion.university}
                    mutualFriends={suggestion.mutualFriends}
                    showAddFriend
                    refresh={refreshFriendsAndSolicitudes}
                  />
                ))
              ) : (
                <div className="text-left p-6 border rounded-lg bg-muted/30 col-span-full">
                  <p className="text-muted-foreground">
                    {searchQuery ? "No se encontraron sugerencias con ese nombre." : "No hay sugerencias disponibles en este momento."}
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// Componente para mostrar un amigo
interface FriendCardProps {
  id: number | string;
  name: string;
  username?: string;
  avatar: string;
  status: string;
  description?: string;
  university?: string;
  mutualFriends?: number;
  showAddFriend?: boolean;
  showAcceptReject?: boolean;
  refresh?: () => void;
}

function FriendCard({ id, name, username, avatar, status, description, university, mutualFriends, showAddFriend, showAcceptReject, refresh }: FriendCardProps) {
  const router = useRouter();
  const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : '';

  const handleAddFriend = async () => {
    try {
      const res = await fetch('/api/neo4jDB/enviar-solicitud-amistad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          remitenteId: currentUserId,
          destinatarioId: id
        })
      });
      
      if (res.ok) {
        toast("Solicitud de amistad enviada");
        refresh?.();
      } else {
        const data = await res.json();
        toast(data.message || "Error al enviar solicitud");
      }
    } catch {
      toast("Error al enviar solicitud de amistad");
    }
  };

  const handleAcceptFriend = async () => {
    try {
      const res = await fetch('/api/neo4jDB/aceptar-solicitud-amistad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          remitenteId: id,
          destinatarioId: currentUserId
        })
      });
      
      if (res.ok) {
        toast("Solicitud aceptada");
        refresh?.();
      } else {
        const data = await res.json();
        toast(data.message || "Error al aceptar solicitud");
      }
    } catch {
      toast("Error al aceptar solicitud");
    }
  };

  const handleRejectFriend = async () => {
    try {
      const res = await fetch('/api/neo4jDB/rechazar-solicitud-amistad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          remitenteId: id,
          destinatarioId: currentUserId
        })
      });
      
      if (res.ok) {
        toast("Solicitud rechazada");
        refresh?.();
      } else {
        const data = await res.json();
        toast(data.message || "Error al rechazar solicitud");
      }
    } catch {
      toast("Error al rechazar solicitud");
    }
  };

  const handleRemoveFriend = async () => {
    try {
      const res = await fetch('/api/neo4jDB/eliminar-amigo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario1Id: currentUserId,
          usuario2Id: id
        })
      });
      
      if (res.ok) {
        toast("Amigo eliminado");
        refresh?.();
      } else {
        const data = await res.json();
        toast(data.message || "Error al eliminar amigo");
      }
    } catch {
      toast("Error al eliminar amigo");
    }
  };

  const goToChat = async () => {
    try {
      router.push(`/menu/chats?userId=${id}`);
    } catch (error) {
      console.error('Error al ir al chat:', error);
      toast('Error al abrir el chat');
    }
  };

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <HoverCard>
          <HoverCardTrigger asChild>
            <div className="flex items-center space-x-3 cursor-pointer">
              <Image 
                src={avatar || "/default-avatar.png"} 
                alt={name}
                width={48}
                height={48}
                className="rounded-full object-cover"
              />
              <div>
                <h3 className="font-medium text-sm">{name}</h3>
                {username && <p className="text-xs text-muted-foreground">@{username}</p>}
                <div className="flex items-center space-x-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${
                    status === 'online' ? 'bg-green-500' : 
                    status === 'offline' ? 'bg-gray-400' :
                    status === 'suggestion' ? 'bg-blue-500' : 'bg-yellow-500'
                  }`} />
                  <span className="text-xs capitalize text-muted-foreground">{status}</span>
                </div>
              </div>
            </div>
          </HoverCardTrigger>
          <HoverCardContent className="w-80">
            <div className="flex justify-between space-x-4">
              <Image 
                src={avatar || "/default-avatar.png"} 
                alt={name}
                width={48}
                height={48}
                className="rounded-full"
              />
              <div className="space-y-1 flex-1">
                <h4 className="text-sm font-semibold">{name}</h4>
                {username && <p className="text-xs text-muted-foreground">@{username}</p>}
                {description && <p className="text-xs">{description}</p>}
                {university && <p className="text-xs text-muted-foreground">📚 {university}</p>}
                {mutualFriends !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    👥 {mutualFriends} amigos en común
                  </p>
                )}
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>
      </div>

      <div className="mt-3 flex gap-2">
        {showAddFriend && (
          <button
            onClick={handleAddFriend}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-1.5 px-3 rounded transition-colors"
          >
            Agregar
          </button>
        )}
        
        {showAcceptReject && (
          <>
            <button
              onClick={handleAcceptFriend}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-1.5 px-3 rounded transition-colors"
            >
              Aceptar
            </button>
            <button
              onClick={handleRejectFriend}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs py-1.5 px-3 rounded transition-colors"
            >
              Rechazar
            </button>
          </>
        )}
        
        {!showAddFriend && !showAcceptReject && (
          <>
            <button
              onClick={goToChat}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-1.5 px-3 rounded transition-colors"
            >
              Chat
            </button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs py-1.5 px-3 rounded transition-colors">
                  Eliminar
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción eliminará a {name} de tu lista de amigos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRemoveFriend}>
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
    </Card>
  );
}
