"use client";
import React, { createContext, useContext, useState } from "react";

export type UserType = {
  nombreUsuario: string;
  foto?: string;
  nombre?: string;
  apellido1?: string;
  apellido2?: string;
  fechaNacimiento?: string;
  [key: string]: any;
} | null;

export const UserContext = createContext<{
  user: UserType;
  setUser: React.Dispatch<React.SetStateAction<UserType>>;
}>({
  user: null,
  setUser: () => {},
});

export function useUser() {
  return useContext(UserContext);
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserType>(null);
  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}
