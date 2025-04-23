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
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { useEffect, useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

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
          // Render just the children without sidebar for login-related pages
          <div className="min-h-screen">
            {children}
          </div>
        ) : (
          // Render the normal layout with sidebar for all other pages
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
                    <Collapsible defaultOpen className="group/collapsible">
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton tooltip="Portal Docente">
                            <div className="flex items-center w-full justify-between">
                              <div className="flex items-center">
                                <GraduationCapIcon />
                                <span>Portal Docente</span>
                              </div>
                              <div className="ml-auto">
                                <ChevronDown className="w-4 h-4 group-data-[state=open]/collapsible:hidden" />
                                <ChevronUp className="w-4 h-4 group-data-[state=closed]/collapsible:hidden" />
                              </div>
                            </div>
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenu>
                            <SidebarMenuItem>
                              <SidebarMenuButton
                                tooltip="Cursos"
                                onClick={() => router.push('/menu/portal-docente/cursos')}
                              >
                                <span>Cursos</span>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                              <SidebarMenuButton
                                tooltip="Evaluaciones"
                                onClick={() => router.push('/menu/portal-docente/evaluaciones')}
                              >
                                <span>Evaluaciones</span>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          </SidebarMenu>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
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
                // Render chats page without additional wrappers to avoid scroll
                <div className="h-screen overflow-hidden">
                  {children}
                </div>
              ) : (
                // Normal layout for other pages
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
      </body>
    </html>
  );
}
