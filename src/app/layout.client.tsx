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
import { HomeIcon, Search, UsersIcon, GraduationCapIcon, UserIcon, MessageSquareText } from "lucide-react";

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

                </SidebarMenu>
              </SidebarContent>

              <SidebarFooter>
                <div className="px-2 text-xs text-muted-foreground">
                  Schoolify v1.0.0
                </div>
              </SidebarFooter>
            </Sidebar>

            <SidebarInset>
              <div className="relative flex min-h-screen flex-col">
                <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6">
                  <SidebarTrigger />
                  <div className="flex-1" />
                </header>
                <main className="flex-1 p-6">
                  {children}
                </main>
              </div>
            </SidebarInset>
          </SidebarProvider>
        )}
      </body>
    </html>
  );
}
