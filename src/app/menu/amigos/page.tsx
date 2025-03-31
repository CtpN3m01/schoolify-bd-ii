"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useState } from "react"
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

// Definición de tipos
interface Friend {
  id: number;
  name: string;
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

// Mock data para amigos con más información
const friendsData: Friend[] = [
  { 
    id: 1, 
    name: "Ana García", 
    avatar: "https://i.pravatar.cc/150?img=1", 
    status: "En línea",
    description: "Estudiante de Ingeniería Informática. Me encanta la programación y el diseño web.",
    university: "Universidad Autónoma"
  },
  { 
    id: 2, 
    name: "Carlos Rodríguez", 
    avatar: "https://i.pravatar.cc/150?img=2", 
    status: "En clase",
    description: "Estudiando Medicina. Aficionado al deporte y la música.",
    university: "Universidad Central"
  },
  { 
    id: 3, 
    name: "María López", 
    avatar: "https://i.pravatar.cc/150?img=3", 
    status: "En línea",
    description: "Apasionada por las matemáticas y la física. Me gusta resolver problemas complejos.",
    university: "Universidad Tecnológica"
  },
]

// Mock data para sugerencias con más información
const suggestionsData: Suggestion[] = [
  { 
    id: 4, 
    name: "Juan Pérez", 
    avatar: "https://i.pravatar.cc/150?img=4", 
    mutualFriends: 5,
    description: "Estudiante de último año de Arquitectura. Interesado en el diseño sostenible.",
    university: "Universidad Nacional"
  },
  { 
    id: 5, 
    name: "Laura Torres", 
    avatar: "https://i.pravatar.cc/150?img=5", 
    mutualFriends: 3,
    description: "Apasionada por la literatura y los idiomas. Actualmente aprendiendo francés.",
    university: "Universidad de Letras"
  },
  { 
    id: 6, 
    name: "Miguel Sánchez", 
    avatar: "https://i.pravatar.cc/150?img=6", 
    mutualFriends: 2,
    description: "Estudiante de Biología. Investigador en ciencias ambientales.",
    university: "Universidad de Ciencias"
  },
  { 
    id: 7, 
    name: "Sara Martínez", 
    avatar: "https://i.pravatar.cc/150?img=7", 
    mutualFriends: 4,
    description: "Apasionada por el arte digital y la animación 3D.",
    university: "Universidad de Artes Visuales"
  },
]

export default function Amigos() {
  const [searchQuery, setSearchQuery] = useState("");
  
  // Filtrar amigos basado en la búsqueda
  const filteredFriends = friendsData.filter(friend => 
    friend.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Filtrar sugerencias basado en la búsqueda
  const filteredSuggestions = suggestionsData.filter(suggestion => 
    suggestion.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen p-4 pb-16 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Amigos</h1>
        
        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="w-full mb-5 p-1">
            <TabsTrigger value="friends" className="flex-1">Tus amigos</TabsTrigger>
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
              {filteredFriends.length > 0 ? (
                filteredFriends.map((friend) => (
                  <FriendCard 
                    key={friend.id}
                    name={friend.name}
                    avatar={friend.avatar}
                    status={friend.status}
                    description={friend.description}
                    university={friend.university}
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
          
          <TabsContent value="suggestions">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSuggestions.length > 0 ? (
                filteredSuggestions.map((suggestion) => (
                  <SuggestionCard 
                    key={suggestion.id}
                    name={suggestion.name}
                    avatar={suggestion.avatar}
                    mutualFriends={suggestion.mutualFriends}
                    description={suggestion.description}
                    university={suggestion.university}
                  />
                ))
              ) : (
                <div className="text-left p-6 border rounded-lg bg-muted/30 col-span-full">
                  <p className="text-muted-foreground">
                    {searchQuery ? "No se encontraron sugerencias con ese nombre." : "No hay sugerencias disponibles."}
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
  name: string;
  avatar: string;
  status: string;
  description?: string;
  university?: string;
}

function FriendCard({ name, avatar, status, description, university }: FriendCardProps) {
  return (
    <Card className="p-3 flex items-center justify-between border transition-all duration-300 hover:shadow-md hover:border-primary/20 hover:translate-y-[-2px] cursor-pointer rounded-md">
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
              <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border border-white ${
                status === "En línea" ? "bg-green-500" : "bg-gray-400"
              }`} />
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
                      <span className={`w-2 h-2 rounded-full mr-1 ${
                        status === "En línea" ? "bg-green-500" : "bg-gray-400"
                      }`}></span>
                      {status}
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
          <p className="text-xs text-muted-foreground">{status}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button className="text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-colors px-3 py-1.5 rounded">
          Mensaje
        </button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="text-xs text-destructive hover:bg-destructive/10 transition-colors px-2 py-1.5 rounded">
              Eliminar
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará a <span className="font-semibold">{name}</span> de tu lista de amigos y no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive hover:bg-destructive/90">
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Card>
  )
}

// Componente para mostrar una sugerencia de amistad
interface SuggestionCardProps {
  name: string;
  avatar: string;
  mutualFriends: number;
  description?: string;
  university?: string;
}

function SuggestionCard({ name, avatar, mutualFriends, description, university }: SuggestionCardProps) {
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
        <button className="text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-colors px-3 py-1.5 rounded">
          Agregar
        </button>
        <button className="text-xs text-muted-foreground hover:bg-muted transition-colors px-2 py-1.5 rounded">
          Ignorar
        </button>
      </div>
    </Card>
  )
}
