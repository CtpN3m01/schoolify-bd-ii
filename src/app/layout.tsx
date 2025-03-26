import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
import { HomeIcon, BookOpenIcon, UsersIcon, GraduationCapIcon, UserIcon } from "lucide-react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Schoolify - School Management System",
  description: "A modern school management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SidebarProvider>
          <Sidebar>
            <SidebarHeader>
              <div className="flex items-center gap-2 px-2">
                <GraduationCapIcon className="h-8 w-8" />
                <span className="text-xl font-bold">Schoolify</span>
              </div>
            </SidebarHeader>
            
            <SidebarContent>
              <SidebarMenu>

                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Principal">
                    <HomeIcon />
                    <span>Principal</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Buscar">
                    <BookOpenIcon />
                    <span>Buscar</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Amigos">
                    <UsersIcon />
                    <span>Amigos</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Chats">
                    <BookOpenIcon />
                    <span>Chats</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Perfil">
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
      </body>
    </html>
  );
}
