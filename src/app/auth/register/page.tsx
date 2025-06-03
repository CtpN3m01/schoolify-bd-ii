"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { GraduationCapIcon, Upload, X, User } from "lucide-react";
import { useRouter } from 'next/navigation';

export default function Register() {  const [form, setForm] = useState({
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
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const router = useRouter();
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Utilidad para subir archivos al servidor local
  const uploadArchivo = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Error al subir archivo');
    const data = await res.json();
    return data.url;
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona una imagen válida');
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no puede ser mayor a 5MB');
      return;
    }

    try {
      setUploadingPhoto(true);
      setError('');
      
      // Crear vista previa
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Subir archivo
      const url = await uploadArchivo(file);
      setForm({ ...form, foto: url });
    } catch (error: any) {
      setError(error.message);
      setPhotoPreview(null);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removePhoto = () => {
    setForm({ ...form, foto: '' });
    setPhotoPreview(null);
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

      // Sincronizar usuario con Neo4j después de registro exitoso
      try {
        console.log('Sincronizando usuarios con Neo4j...');
        const syncRes = await fetch('/api/neo4jDB/sync-usuarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (syncRes.ok) {
          console.log('Sincronización exitosa');
        } else {
          console.warn('Error en sincronización, pero el usuario se registró correctamente');
        }
      } catch (syncError) {
        console.warn('Error al sincronizar con Neo4j:', syncError);
        // No lanzamos error aquí porque el registro fue exitoso
      }

      setForm({
        nombreUsuario: '', password: '', nombre: '', apellido1: '', apellido2: '', fechaNacimiento: '', foto: ''
      });
      setPhotoPreview(null);
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
        </div>        <div>
          <label className="block text-sm font-medium text-muted-foreground">Fecha de nacimiento</label>
          <Input name="fechaNacimiento" type="date" value={form.fechaNacimiento} onChange={handleChange} required />
        </div>
          <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">Foto de perfil</label>
          
          <div className="flex flex-col items-center space-y-4">
            {/* Vista previa del avatar */}
            <div className="relative">
              <Avatar className="w-24 h-24">
                {photoPreview ? (
                  <AvatarImage src={photoPreview} alt="Vista previa" />
                ) : (
                  <AvatarFallback className="bg-gray-100">
                    <User className="w-8 h-8 text-gray-400" />
                  </AvatarFallback>
                )}
              </Avatar>
              
              {photoPreview && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0"
                  onClick={removePhoto}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Área de subida */}
            <div className="w-full">
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
                id="photo-upload"
                disabled={uploadingPhoto}
              />
              <label
                htmlFor="photo-upload"
                className="w-full h-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors bg-gray-50"
              >
                <Upload className="h-5 w-5 text-gray-400 mb-1" />
                <span className="text-xs text-gray-600">
                  {uploadingPhoto ? 'Subiendo...' : 'Subir foto'}
                </span>
                <span className="text-xs text-gray-400">
                  PNG, JPG hasta 5MB
                </span>
              </label>
            </div>
          </div>
        </div>
        <Button className="w-full" type="submit" disabled={loading || uploadingPhoto}>
          {loading ? 'Registrando...' : 'Continuar'}
        </Button>
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