"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GraduationCapIcon } from "lucide-react";
import { useRouter } from 'next/navigation';

export default function Register() {
  const [form, setForm] = useState({
    nombreUsuario: '',
    password: '',
    nombre: '',
    apellido1: '',
    apellido2: '',
    fechaNacimiento: '',
    foto: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/mongoDB/auth/register/registrarUsuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al registrar');
      setSuccess('¡Registro exitoso!');
      // Guardar el userId en localStorage
      if (data.usuario && data.usuario._id) {
        localStorage.setItem('userId', data.usuario._id);
      }
      setForm({
        nombreUsuario: '', password: '', nombre: '', apellido1: '', apellido2: '', fechaNacimiento: '', foto: ''
      });
      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message);
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
          <h2 className="text-3xl font-bold">Crea una cuenta</h2>
          <p className="text-muted-foreground">Completa todos los campos para registrarte</p>
        </div>
      </div>

      <form className="w-full max-w-sm space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium text-muted-foreground">Nombre de usuario</label>
          <Input name="nombreUsuario" value={form.nombreUsuario} onChange={handleChange} placeholder="Usuario123" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground">Contraseña</label>
          <Input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Contraseña" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground">Nombre</label>
          <Input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Nombre" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground">Primer apellido</label>
          <Input name="apellido1" value={form.apellido1} onChange={handleChange} placeholder="Primer apellido" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground">Segundo apellido</label>
          <Input name="apellido2" value={form.apellido2} onChange={handleChange} placeholder="Segundo apellido" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground">Fecha de nacimiento</label>
          <Input name="fechaNacimiento" type="date" value={form.fechaNacimiento} onChange={handleChange} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground">Foto (URL)</label>
          <Input name="foto" value={form.foto} onChange={handleChange} placeholder="https://..." />
        </div>
        <Button className="w-full" type="submit" disabled={loading}>{loading ? 'Registrando...' : 'Continuar'}</Button>
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        {success && <p className="text-green-600 text-sm text-center">{success}</p>}
        <p className="text-sm text-muted-foreground text-center">
          <a href="/auth/login" className="underline">Volver a login</a>
        </p>
      </form>

      <p className="text-sm text-muted-foreground text-center">
        Al hacer click en continuar aceptas los <a href="#" className="underline">Terms of Service</a> y <a href="#" className="underline">Privacy Policy</a>
      </p>
    </div>
  );
}