"use client"

import { Geist, Geist_Mono } from "next/font/google";
import { usePathname, useRouter } from "next/navigation";
import "./globals.css";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { HomeIcon, Search, UsersIcon, GraduationCapIcon, UserIcon, MessageSquareText, User2, ChevronUp, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { useEffect, useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/auth/login" || pathname === "/auth/register" || pathname === "/auth/forgot-password";
  const isChatsPage = pathname === "/menu/chats";
  const [user, setUser] = useState<{ nombreUsuario: string; foto?: string } | null>(null);

  useEffect(() => {
    // Obtener el usuario autenticado
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => setUser(data.user));
  }, []);

  const handleLogout = async () => {
    await fetch("/api/mongoDB/auth/logout", { method: "POST" });
    router.push("/auth/login");
  };

  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {isLoginPage ? (
          <div className="min-h-screen">
            {children}
          </div>
        ) : (
          <SidebarProvider>
            <Sidebar>
              <SidebarHeader>
                <div className="flex justify-center items-center gap-2 px-2 w-full">
                  <GraduationCapIcon className="h-8 w-8" />
                  <span className="text-xl font-bold">Schoolify</span>
                </div>
              </SidebarHeader>
              
              <SidebarContent>
                <div>
                  <div className="px-2 text-xxs text-black font-bold">
                    Menú
                  </div>
                </div>
                <SidebarMenu>

                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      tooltip="Principal" 
                      onClick={() => router.push('/menu/principal')}
                    >
                      <HomeIcon />
                      <span>Principal</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      tooltip="Buscar"
                      onClick={() => router.push('/menu/buscar')}
                    >
                      <Search />
                      <span>Buscar</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      tooltip="Amigos"
                      onClick={() => router.push('/menu/amigos')}
                    >
                      <UsersIcon />
                      <span>Amigos</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      tooltip="Chats"
                      onClick={() => router.push('/menu/chats')}
                    >
                      <MessageSquareText />
                      <span>Chats</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      tooltip="Perfil"
                      onClick={() => router.push('/menu/perfil')}
                    >
                      <UserIcon />
                      <span>Perfil</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <Separator className="my-2" />

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip="Portal Docente"
                      onClick={() => router.push('/menu/portal-docente/cursos')}
                    >
                      <GraduationCapIcon />
                      <span>Portal Docente</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip="Evaluaciones"
                      onClick={() => router.push('/menu/portal-docente/evaluaciones')}
                    >
                      <GraduationCapIcon />
                      <span>Evaluaciones</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarContent>

              <SidebarFooter>
              <SidebarMenu>
                <SidebarMenuItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuButton>
                        <Avatar className="mr-2">
                          {user?.foto ? (
                            <AvatarImage src={user.foto} alt={user.nombreUsuario} />
                          ) : (
                            <AvatarFallback>{user?.nombreUsuario?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                          )}
                        </Avatar>
                        {user?.nombreUsuario || "Usuario"}
                        <ChevronUp className="ml-auto" />
                      </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      side="top"
                      className="w-[--radix-popper-anchor-width]"
                    >
                      <DropdownMenuItem onClick={() => router.push('/menu/perfil')}>
                        <span>Perfil</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleLogout}>
                        <span>Cerrar Sesión</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarFooter>
            </Sidebar>
            <SidebarInset>
              {isChatsPage ? (
                <div className="h-screen">
                  {children}
                </div>
              ) : (
                <div className="relative flex min-h-screen flex-col">
                  <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6">
                    <SidebarTrigger />
                    <div className="flex-1" />
                  </header>
                  <main className="flex-1 p-6">
                    {children}
                  </main>
                </div>
              )}
            </SidebarInset>
          </SidebarProvider>
        )}
        <Toaster />
      </body>
    </html>
  );
}
