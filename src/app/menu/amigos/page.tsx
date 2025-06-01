"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"
import { Search } from "lucide-react"
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
  const [searchResult, setSearchResult] = useState<Friend|null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  // Simulación: usuario actual (debería venir de auth)
  const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : '';

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
      .finally(() => setLoadingSuggestions(false));
  }, [currentUserId]);

  // Buscar usuario por username
  const handleSearchUser = async () => {
    setSearching(true);
    setSearchError("");
    setSearchResult(null);
    try {
      const res = await fetch(`/api/neo4jDB/buscar-usuario-por-username?username=${searchUsername}&userId=${currentUserId}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResult(data);
      } else {
        setSearchError("Usuario no encontrado");
      }
    } catch {
      setSearchError("Error buscando usuario");
    } finally {
      setSearching(false);
    }
  };

  // Filtrar amigos basado en la búsqueda
  // Elimina duplicados por id (string o number)
  const uniqueFriends = Array.from(new Map(friends.map(f => [String(f.id), f])).values());
  const filteredFriends = uniqueFriends.filter(friend => 
    friend.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
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
                filteredFriends.map((friend) => (                  <FriendCard 
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
          </TabsContent>          <TabsContent value="solicitudes">
            <div className="mb-4">
              <div className="flex gap-2 mb-4">
                <Input
                  type="search"
                  placeholder="Buscar usuario por username..."
                  value={searchUsername}
                  onChange={e => setSearchUsername(e.target.value)}
                  className="flex-1"
                  onKeyDown={e => { if (e.key === 'Enter') handleSearchUser(); }}
                />
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60 text-sm"
                  onClick={handleSearchUser}
                  disabled={searching || !searchUsername}
                >
                  {searching ? 'Buscando...' : 'Buscar'}
                </button>
                <button
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-60 text-sm"
                  onClick={() => {
                    setLoadingSolicitudes(true);
                    fetch(`/api/neo4jDB/solicitudes-pendientes?userId=${currentUserId}`)
                      .then(res => res.json())
                      .then(data => setSolicitudes(data.solicitudes || []))
                      .finally(() => setLoadingSolicitudes(false));
                  }}
                  disabled={loadingSolicitudes}
                >
                  {loadingSolicitudes ? 'Actualizando...' : 'Actualizar Solicitudes'}
                </button>
              </div>
              {searching && <div className="text-sm text-muted-foreground">Buscando...</div>}
              {searchError && <div className="text-sm text-destructive">{searchError}</div>}
              {searchResult && (
                <div className="mt-2">                  <FriendCard
                    name={searchResult.name}
                    avatar={searchResult.avatar}
                    status={searchResult.status}
                    description={searchResult.description}
                    university={searchResult.university}
                    id={searchResult.id}
                    username={searchResult.username}
                    showAddFriend
                    refresh={refreshFriendsAndSolicitudes}
                  />
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loadingSolicitudes ? (
                <div className="text-center col-span-full py-8 text-muted-foreground">Cargando solicitudes...</div>
              ) : solicitudes.length > 0 ? (
                solicitudes.map((sol) => (                  <FriendCard
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
    setLoading(true);
    try {
      const res = await fetch('/api/neo4jDB/enviar-solicitud-amistad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromUserId: currentUserId, toUserId: id })
      });
      if (res.ok) setSent(true);
      if (refresh) refresh();
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
      <div className="flex items-center gap-3">
        <HoverCard>
          <HoverCardTrigger asChild>
            <div className="relative cursor-pointer w-12 h-12">
              <Image 
                src={avatar} 
                alt={name} 
                width={48}
                height={48}
                className="rounded-full object-cover border border-muted" 
              />
              <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border border-white ${status === "En línea" ? "bg-green-500" : "bg-gray-400"}`} />
            </div>
          </HoverCardTrigger>
          <HoverCardContent className="w-80">
            <div className="flex justify-between space-x-4">
              <div className="flex flex-col space-y-1">
                <div className="flex items-center gap-2">
                  <div className="relative w-14 h-14">
                    <Image 
                      src={avatar} 
                      alt={name} 
                      width={56}
                      height={56}
                      className="rounded-full object-cover border-2 border-muted" 
                    />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">{name}</h4>
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
        </HoverCard>
        <div>
          <h3 className="font-medium text-base">{name}</h3>
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
            >Mensaje</button>
            <Dialog>
              <DialogTrigger asChild>
                <button
                  className="text-xs text-destructive hover:bg-destructive/10 transition-colors px-2 py-1.5 rounded disabled:opacity-60 ml-2"
                  disabled={loading}
                >Eliminar</button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>¿Eliminar amigo?</DialogTitle>
                </DialogHeader>
                <p>¿Estás seguro que deseas eliminar a <span className="font-semibold">{name}</span> de tu lista de amigos? Esta acción no se puede deshacer.</p>
                <DialogFooter>
                  <DialogClose asChild>
                    <button className="px-4 py-1 rounded bg-muted text-muted-foreground hover:bg-muted/70">Cancelar</button>
                  </DialogClose>
                  <button
                    className="px-4 py-1 rounded bg-destructive text-white hover:bg-destructive/90"
                    onClick={async () => {
                      setLoading(true);
                      await fetch('/api/neo4jDB/eliminar-amigo', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: currentUserId, friendId: id })
                      });
                      setLoading(false);
                      if (refresh) refresh();
                      toast("Amigo eliminado correctamente");
                    }}
                  >Eliminar</button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>        )}        <button
          className="text-xs bg-blue-600 text-white hover:bg-blue-700 transition-colors px-3 py-1.5 rounded"
          onClick={() => router.push(`/menu/perfil?id=${username}`)}
        >Ver perfil</button>
      </div>
    </Card>
  );
}

// Componente para mostrar una sugerencia de amistad
interface SuggestionCardProps {
  name: string;
  avatar: string;
  mutualFriends: number;
  description?: string;
  university?: string;
}

function SuggestionCard({ name, avatar, mutualFriends, description, university, id }: SuggestionCardProps & { id: number }) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  // Simulación: usuario actual (debería venir de auth)
  const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : '';

  const handleSendRequest = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/neo4jDB/enviar-solicitud-amistad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromUserId: currentUserId, toUserId: id })
      });
      if (res.ok) {
        setSent(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-3 flex items-center justify-between border transition-all duration-300 hover:shadow-md hover:border-primary/20 hover:translate-y-[-2px] cursor-pointer rounded-md">
      <div className="flex items-center gap-3">
        <HoverCard>
          <HoverCardTrigger asChild>
            <div className="relative w-12 h-12 cursor-pointer">
              <Image 
                src={avatar} 
                alt={name} 
                width={48}
                height={48}
                className="rounded-full object-cover border border-muted" 
              />
            </div>
          </HoverCardTrigger>
          <HoverCardContent className="w-80">
            <div className="flex justify-between space-x-4">
              <div className="flex flex-col space-y-1">
                <div className="flex items-center gap-2">
                  <div className="relative w-14 h-14">
                    <Image 
                      src={avatar} 
                      alt={name} 
                      width={56}
                      height={56}
                      className="rounded-full object-cover border-2 border-muted" 
                    />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">{name}</h4>
                    <p className="text-xs text-muted-foreground">{university}</p>
                    <span className="text-xs inline-flex items-center mt-1">
                      {mutualFriends} amigos en común
                    </span>
                  </div>
                </div>
                <p className="text-sm">
                  {description || "Sin descripción disponible"}
                </p>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>
        <div>
          <h3 className="font-medium text-base">{name}</h3>
          <p className="text-xs text-muted-foreground">
            {mutualFriends} amigos en común
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          className="text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-colors px-3 py-1.5 rounded disabled:opacity-60"
          onClick={handleSendRequest}
          disabled={loading || sent}
        >
          {sent ? 'Solicitud enviada' : loading ? 'Enviando...' : 'Agregar'}
        </button>
        <button className="text-xs text-muted-foreground hover:bg-muted transition-colors px-2 py-1.5 rounded">
          Ignorar
        </button>
      </div>
    </Card>
  );
}
