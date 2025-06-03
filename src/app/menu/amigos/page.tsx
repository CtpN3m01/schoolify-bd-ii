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
        
        // Buscar por similitud/porcentaje usando un endpoint que debería existir o crear
        const similarRes = await fetch(`/api/neo4jDB/buscar-usuarios-similares?query=${encodeURIComponent(query)}&userId=${currentUserId}&limit=5`);
        
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
        
        // Agregar resultados similares si existen
        if (similarRes.ok) {
          const similarData = await similarRes.json();
          const similarUsers = (similarData.usuarios || [])
            .filter((user: any) => !results.some(r => r.id === user._id)) // Evitar duplicados
            .map((user: any) => ({
              id: user._id,
              name: user.nombre,
              username: user.nombreUsuario,
              avatar: user.foto,
              status: user.estado,
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
      }    };
  }, [searchUsername, searchUsersWithDebounce]);
  
  // Debug para verificar el userId
  useEffect(() => {
    console.log('Current userId en amigos:', currentUserId);
  }, [currentUserId]);

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
      .finally(() => setLoadingSuggestions(false));  }, [currentUserId]);

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
                  placeholder="Buscar Amigos"
                  value={searchUsername}
                  onChange={e => setSearchUsername(e.target.value)}
                  className="flex-1"
                />
                <button
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-60 text-sm"
                  onClick={actualizarSolicitudes}
                  disabled={loadingSolicitudes}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loadingSolicitudes ? 'animate-spin' : ''}`} />
                  {loadingSolicitudes ? 'Actualizando...' : 'Actualizar Solicitudes'}
                </button>
              </div>
              {searching && <div className="text-sm text-muted-foreground">Buscando...</div>}
              {searchError && <div className="text-sm text-destructive">{searchError}</div>}
              {searchResults.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-2">Resultados de búsqueda:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
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
  showAddFriend?: boolean;
  showAcceptReject?: boolean;
  refresh?: () => void;
}

function FriendCard({ id, name, username, avatar, status, description, university, showAddFriend, showAcceptReject, refresh }: FriendCardProps) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [rejected, setRejected] = useState(false);
  const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : '';
  const router = useRouter();
  const handleSendRequest = async () => {
    if (loading || sent) return; // Prevenir múltiples clics
    setLoading(true);
    try {
      const res = await fetch('/api/neo4jDB/enviar-solicitud-amistad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromUserId: currentUserId, toUserId: id })
      });
      if (res.ok) {
        setSent(true);
        toast.success('Solicitud de amistad enviada');
      } else {
        const errorData = await res.json();
        if (res.status === 409) {
          setSent(true); // Marcar como enviada si ya existe
          toast.info('La solicitud ya fue enviada anteriormente');
        } else {
          toast.error(errorData.message || 'Error al enviar solicitud');
        }
      }
      if (refresh) refresh();
    } catch (error) {
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  };
  const handleAccept = async () => {
    setLoading(true);
    try {
      await fetch('/api/neo4jDB/aceptar-solicitud-amistad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromUserId: id, toUserId: currentUserId })
      });
      setAccepted(true);
      if (refresh) refresh();
    } finally {
      setLoading(false);
    }
  };
  const handleReject = async () => {
    setLoading(true);
    try {
      await fetch('/api/neo4jDB/rechazar-solicitud-amistad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromUserId: id, toUserId: currentUserId })
      });
      setRejected(true);
      if (refresh) refresh();
    } finally {
      setLoading(false);
    }
  };

  if (accepted) return <Card className="p-3">Solicitud aceptada</Card>;
  if (rejected) return <Card className="p-3">Solicitud rechazada</Card>;

  return (
    <Card className="relative flex flex-col gap-2 p-4">
      <div className="flex items-center gap-3">        <HoverCard>
          <HoverCardTrigger asChild>
            <div className="relative cursor-pointer w-12 h-12">
              {avatar && avatar.trim() !== '' ? (
                <Image 
                  src={avatar} 
                  alt={`Avatar de ${name}`} 
                  width={48}
                  height={48}
                  className="rounded-full object-cover border border-muted" 
                />
              ) : (                <div className="w-12 h-12 rounded-full bg-muted border border-muted flex items-center justify-center">
                  <span className="text-muted-foreground font-medium">
                    {name && name.length > 0 ? name.charAt(0).toUpperCase() : '?'}
                  </span>
                </div>
              )}
              <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border border-white ${status === "En línea" ? "bg-green-500" : "bg-gray-400"}`} />
            </div>
          </HoverCardTrigger>
          <HoverCardContent className="w-80">            <div className="flex justify-between space-x-4">
              <div className="flex flex-col space-y-1">
                <div className="flex items-center gap-2">
                  <div className="relative w-14 h-14">
                    {avatar && avatar.trim() !== '' ? (
                      <Image 
                        src={avatar} 
                        alt={`Avatar de ${name}`} 
                        width={56}
                        height={56}
                        className="rounded-full object-cover border-2 border-muted" 
                      />                    ) : (
                      <div className="w-14 h-14 rounded-full bg-muted border-2 border-muted flex items-center justify-center">
                        <span className="text-muted-foreground font-medium text-lg">
                          {name && name.length > 0 ? name.charAt(0).toUpperCase() : '?'}
                        </span>
                      </div>
                    )}
                  </div>                  <div>
                    <h4 className="text-sm font-semibold">{name || 'Sin nombre'}</h4>
                    <p className="text-xs text-muted-foreground">{university}</p>
                    <span className="text-xs inline-flex items-center mt-1">
                      <span className={`w-2 h-2 rounded-full mr-1 ${status === "En línea" ? "bg-green-500" : "bg-gray-400"}`}></span>
                      {status}
                    </span>
                  </div>
                </div>
                <p className="text-sm">{description || "Sin descripción disponible"}</p>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>        <div>
          <h3 className="font-medium text-base">{name || 'Sin nombre'}</h3>
          <p className="text-xs text-muted-foreground">{status}</p>
        </div>
      </div>
      <div className="flex gap-2 mt-2">
        {showAddFriend && (
          <button
            className="text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-colors px-3 py-1.5 rounded disabled:opacity-60"
            onClick={handleSendRequest}
            disabled={loading || sent}
          >
            {sent ? 'Solicitud enviada' : loading ? 'Enviando...' : 'Agregar'}
          </button>
        )}
        {showAcceptReject && (
          <>
            <button
              className="text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-colors px-3 py-1.5 rounded disabled:opacity-60"
              onClick={handleAccept}
              disabled={loading}
            >Aceptar</button>
            <button
              className="text-xs text-destructive hover:bg-destructive/10 transition-colors px-2 py-1.5 rounded disabled:opacity-60"
              onClick={handleReject}
              disabled={loading}
            >Rechazar</button>
          </>
        )}
        {!showAddFriend && !showAcceptReject && (
          <>
            <button
              className="text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-colors px-3 py-1.5 rounded"
              onClick={() => router.push(`/menu/chats?userId=${id}`)}
            > Mensaje
            </button>            
            <Dialog>
              <DialogTrigger asChild>
                <button
                  className="text-xs text-destructive hover:bg-destructive/10 transition-colors px-2 py-1.5 rounded disabled:opacity-60 ml-2"
                  disabled={loading}
                >Eliminar
                </button>
              </DialogTrigger>
              <DialogContent className="h-[250px] w-full sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-lg">¿Eliminar amigo?</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <p className="text-sm text-muted-foreground">
                    ¿Estás seguro que deseas eliminar a <span className="font-semibold text-foreground">{name || 'este usuario'}</span> de tu lista de amigos? Esta acción no se puede deshacer.
                  </p>
                </div>
                <DialogFooter className="gap-2">
                  <DialogClose asChild>
                    <button className="px-4 py-2 text-sm rounded bg-muted text-muted-foreground hover:bg-muted/70 transition-colors">
                      Cancelar
                    </button>
                  </DialogClose>
                  <button
                    className="px-4 py-2 text-sm rounded bg-destructive text-white hover:bg-destructive/90 transition-colors disabled:opacity-60"
                    disabled={loading}
                    onClick={async () => {
                      setLoading(true);
                      try {
                        await fetch('/api/neo4jDB/eliminar-amigo', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ userId: currentUserId, friendId: id })
                        });
                        if (refresh) refresh();
                        toast("Amigo eliminado correctamente");
                      } catch (error) {
                        toast("Error al eliminar amigo");
                      } finally {
                        setLoading(false);
                      }
                    }}
                  >
                    {loading ? 'Eliminando...' : 'Eliminar'}
                  </button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>        )}        <button
          className="text-xs bg-blue-600 text-white hover:bg-blue-700 transition-colors px-3 py-1.5 rounded"
          onClick={() => router.push(`/menu/perfil?username=${username || `id_${id}`}`)}
        >Ver perfil</button>
      </div>    </Card>
  );
}
