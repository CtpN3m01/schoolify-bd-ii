"use client";

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { GraduationCapIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from 'react';

export default function Login() {
  const router = useRouter();
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await fetch('/api/mongoDB/auth/login/loginUsuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombreUsuario, password })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('¡Login exitoso!');
        // Guardar el userId en localStorage
        if (data.usuario && data.usuario._id) {
          localStorage.setItem('userId', data.usuario._id);
        }
        setTimeout(() => router.push('/menu/principal'), 1200);
      } else {
        setError(data.message || 'Error al iniciar sesión');
      }
    } catch (err) {
      setError('Error de red o del servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-rows-[auto_auto_auto] items-center justify-items-center min-h-screen p-8 pb-20 gap-2 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <div className="flex flex-col items-center w-full max-w-sm">
        <div className="flex justify-center items-center gap-2 px-2 w-full">
          <GraduationCapIcon className="h-10 w-10" />
          <span className="text-4xl font-bold">Schoolify</span>
        </div>
        <div className="text-center mt-4">
          <h2 className="text-3xl font-bold">Inicia Sesión</h2> 
          <p className="text-muted-foreground">Ingresa con tu email y contraseña</p>
        </div>
      </div>

      <form className="w-full max-w-sm space-y-4" onSubmit={handleLogin}>
        <div>
          <label className="block text-sm font-medium text-muted-foreground">Correo Electrónico o Usuario</label>
          <Input type="text" placeholder="usuario o email" className="w-full" value={nombreUsuario} onChange={e => setNombreUsuario(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground">Contraseña</label>
          <Input type="password" placeholder="password" className="w-full" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        {success && <p className="text-sm text-green-600 text-center">{success}</p>}
        <p className="text-sm text-muted-foreground text-right">
          <a href="/auth/forgot-password" className="underline">¿Olvidaste tu contraseña?</a>
        </p>
        <Button className="w-full" type="submit" disabled={loading}>{loading ? 'Ingresando...' : 'Continuar'}</Button>
        <div className="relative">
          <Separator className="my-4" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="bg-background px-2 text-muted-foreground text-sm">o</span>
          </div>
        </div>
        <Button variant="outline" className="w-full" type="button" onClick={() => router.push('/auth/register')}>Registrarme</Button>
      </form>

      <p className="text-sm text-muted-foreground text-center">
        Al hacer click en continuar aceptas los <a href="#" className="underline">Terms of Service</a> y <a href="#" className="underline">Privacy Policy</a>
      </p>
    </div>
  );
}
