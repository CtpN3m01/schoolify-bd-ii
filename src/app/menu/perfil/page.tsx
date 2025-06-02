"use client";
import { useEffect, useState, useRef } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogClose,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@/app/UserContext";
import { MessageCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";


export default function Perfil() {
  const [user, setUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [open, setOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showFileInput, setShowFileInput] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const avatarRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);  const router = useRouter();
  const searchParams = useSearchParams();  const [cursos, setCursos] = useState<any[]>([]);
  const [cursosDocente, setCursosDocente] = useState<any[]>([]);
  const [loadingCursos, setLoadingCursos] = useState(true);
  const [loadingCursosDocente, setLoadingCursosDocente] = useState(true);
  const { user: currentUser } = useUser();

  // Mover hooks aquí para asegurar que se usan solo en el cliente  // Permitir ver perfil propio o ajeno (por id o username en query param)
  const perfilId = typeof window !== 'undefined' && searchParams ? searchParams.get("id") : null;
  const perfilUsername = typeof window !== 'undefined' && searchParams ? searchParams.get("username") : null;
  const targetParam = perfilUsername || perfilId;
  const isOwnProfile = !targetParam || (currentUser && currentUser.nombreUsuario === targetParam);  useEffect(() => {
    // Si hay id o username en query param, buscar ese usuario, si no, el propio
    const fetchUser = async () => {
      setLoadingUser(true);
      if (targetParam) {
        // Determinar si es un ID (24 caracteres hex) o username
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(targetParam);
        const isIdFallback = targetParam.startsWith('id_');
        
        if (isObjectId || isIdFallback) {
          // Buscar usuario por ID
          const actualId = isIdFallback ? targetParam.substring(3) : targetParam;
          const res = await fetch(`/api/neo4jDB/buscar-usuario-por-id?userId=${actualId}`);
          if (res.ok) {
            const data = await res.json();
            setUser(data);
          } else {
            setUser(null);
          }        } else {
          // Buscar usuario por username
          const res = await fetch(`/api/neo4jDB/buscar-usuario-por-username?username=${targetParam}&userId=0`);
          if (res.ok) {
            const data = await res.json();
            console.log('Datos del usuario por username:', data);
            setUser({ ...data, nombreUsuario: data.nombreUsuario || targetParam });
          } else {
            setUser(null);
          }
        }
      } else {
        // Perfil propio: obtener usuario autenticado
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.user && (data.user.nombreUsuario || data.user._id || data.user.id)) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      }
      setLoadingUser(false);
    };
    fetchUser();
  }, [targetParam]);useEffect(() => {
    if (!user) return;
    // Obtener cursos matriculados desde Neo4j solo si hay identificador
    const userNeoId = user._id || user.id || user.nombreUsuario;
    if (!userNeoId) return;
    
    setLoadingCursos(true);
    setLoadingCursosDocente(true);
    
    // Cursos matriculados
    fetch(`/api/neo4jDB/cursos-matriculados?userId=${userNeoId}`)
      .then(res => res.json())
      .then(data => setCursos(data.cursos || []))
      .finally(() => setLoadingCursos(false));
    
    // Cursos como docente (buscar en MongoDB)
    fetch(`/api/mongoDB/cursos/obtener-cursos-docente?nombreUsuario=${user.nombreUsuario}`)
      .then(res => res.json())
      .then(data => setCursosDocente(data.cursos || []))
      .catch(() => setCursosDocente([]))
      .finally(() => setLoadingCursosDocente(false));
  }, [user]);

  const handleEditClick = () => {
    setEditData({ ...user });
    setOpen(true);
    setSuccess("");
    setError("");
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditData({ ...editData, [e.target.name]: e.target.value });
  };

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
      setError("");
      try {
        const url = await uploadArchivo(file);
        setPreview(url);
        setEditData((prev: any) => ({ ...prev, foto: url }));
        setError("");
      } catch (err) {
        setError("Error al subir la imagen");
      }
    }
  };

  const handleShowFileInput = () => {
    setShowFileInput(true);
    setTimeout(() => {
      const input = document.getElementById('foto') as HTMLInputElement;
      if (input) input.click();
    }, 100);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess("");
    setError("");
    // Usar la URL de Cloudinary (preview) si existe
    let fotoUrl = preview || editData.foto;
    try {
      const res = await fetch("/api/mongoDB/auth/editarUsuario", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombreUsuario: user.nombreUsuario,
          nuevoNombreUsuario: editData.nombreUsuario,
          nombre: editData.nombre,
          apellido1: editData.apellido1,
          apellido2: editData.apellido2,
          fechaNacimiento: editData.fechaNacimiento,
          foto: fotoUrl,
        }),
      });
      if (res.ok) {
        setSuccess("Perfil actualizado correctamente");
        setUser({ ...user, ...editData, foto: fotoUrl });
        setOpen(false);
        setPreview(null);
      } else {
        const data = await res.json();
        setError(data.message || "Error al actualizar");
      }
    } catch {
      setError("Error de red o del servidor");
    } finally {
      setLoading(false);
    }
  };

  const formatFecha = (fecha: string) => {
    if (!fecha) return "-";
    const [year, month, day] = fecha.split("-");
    return `${day}/${month}/${year}`;  };

  if (loadingUser) {
    return (
      <div className="flex flex-col min-h-screen px-4 py-8 sm:px-20 sm:py-20 font-sans bg-gray-50">
        {/* Skeleton del Card principal de perfil */}
        <section className="max-w-3xl w-full mx-auto bg-white rounded-2xl shadow-md p-8 flex flex-col sm:flex-row gap-8 mb-16">
          {/* Skeleton Avatar y acciones */}
          <div className="flex flex-col items-center sm:items-start">
            <Skeleton className="w-32 h-32 rounded-full mb-4" />
            <Skeleton className="h-4 w-24 mb-1" />
            <Skeleton className="h-3 w-20 mb-4" />
            <Skeleton className="h-10 w-24" />
          </div>
          {/* Skeleton Info personal */}
          <div className="flex-1 flex flex-col justify-center">
            <Skeleton className="h-8 w-48 mb-6" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <Skeleton className="h-3 w-12 mb-1" />
                <Skeleton className="h-6 w-32" />
              </div>
              <div>
                <Skeleton className="h-3 w-20 mb-1" />
                <Skeleton className="h-6 w-28" />
              </div>
            </div>
          </div>
        </section>

        {/* Skeleton Tabs de cursos */}
        <section className="max-w-6xl w-full mx-auto">
          <div className="mb-6">
            <Skeleton className="h-10 w-80" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col items-center bg-white rounded-xl shadow p-4">
                <Skeleton className="w-28 h-28 rounded-lg mb-3" />
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  if (user === null) {
    return <div className="flex justify-center items-center min-h-screen text-lg">No se pudo cargar el perfil o no has iniciado sesión.</div>;
  }

  return (
    <div className="flex flex-col min-h-screen px-4 py-8 sm:px-20 sm:py-20 font-sans bg-gray-50">
      {/* Card principal de perfil */}
      <section className="max-w-3xl w-full mx-auto bg-white rounded-2xl shadow-md p-8 flex flex-col sm:flex-row gap-8 mb-16">
        {/* Avatar y acciones */}
        <div className="flex flex-col items-center sm:items-start">
          <div
            className="w-32 h-32 rounded-full overflow-hidden mb-4 border-4 border-gray-200 flex items-center justify-center relative group"
            ref={avatarRef}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            <Avatar className="w-32 h-32">
              {user.foto ? (
                <AvatarImage src={user.foto} alt={user.nombreUsuario} />
              ) : (
                <AvatarFallback>{user.nombreUsuario?.[0]?.toUpperCase() || "U"}</AvatarFallback>
              )}
            </Avatar>
          </div>          <span className="text-gray-700 text-base font-medium mb-1">@{user.nombreUsuario}</span>
          <span className="text-gray-500 text-sm mb-4">{user.amigos?.length ? `${user.amigos.length} Amigos` : "Sin amigos"}</span>
          {isOwnProfile && (
            <button
              className="bg-black text-white px-5 py-2 rounded-md font-medium text-sm hover:bg-gray-900 transition"
              onClick={handleEditClick}
            >
              Editar perfil
            </button>
          )}
          <Dialog
  open={open}
  onOpenChange={(v) => {
    // Solo cerrar el modal si el usuario realmente lo cierra
    setOpen(v);
  }}
  modal={false}
>
            <DialogContent>
              <DialogTitle>Editar perfil</DialogTitle>
              <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label htmlFor="nombreUsuario" className="font-medium">Nombre de usuario</label>
                  <input
                    type="text"
                    id="nombreUsuario"
                    name="nombreUsuario"
                    value={editData?.nombreUsuario || ''}
                    onChange={handleEditChange}
                    placeholder="Nombre de usuario"
                    className="border rounded px-2 py-1"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="nombre" className="font-medium">Nombre</label>
                  <input
                    type="text"
                    id="nombre"
                    name="nombre"
                    value={editData?.nombre || ''}
                    onChange={handleEditChange}
                    placeholder="Nombre"
                    className="border rounded px-2 py-1"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="apellido1" className="font-medium">Primer apellido</label>
                  <input
                    type="text"
                    id="apellido1"
                    name="apellido1"
                    value={editData?.apellido1 || ''}
                    onChange={handleEditChange}
                    placeholder="Primer apellido"
                    className="border rounded px-2 py-1"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="apellido2" className="font-medium">Segundo apellido</label>
                  <input
                    type="text"
                    id="apellido2"
                    name="apellido2"
                    value={editData?.apellido2 || ''}
                    onChange={handleEditChange}
                    placeholder="Segundo apellido"
                    className="border rounded px-2 py-1"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="fechaNacimiento" className="font-medium">Fecha de nacimiento</label>
                  <input
                    type="date"
                    id="fechaNacimiento"
                    name="fechaNacimiento"
                    value={editData?.fechaNacimiento || ''}
                    onChange={handleEditChange}
                    className="border rounded px-2 py-1"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="foto" className="font-medium">Foto de perfil</label>
                  <input
                    type="file"
                    id="foto"
                    name="foto"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="border rounded px-2 py-1"
                  />
                  {preview && (
                    <img src={preview} alt="Preview" className="w-24 h-24 rounded-full mt-2 object-cover" />
                  )}
                </div>
                <div className="flex gap-2 justify-end mt-4">
                  <button
                    type="button"
                    className="px-4 py-2 rounded bg-muted text-muted-foreground hover:bg-muted/70"
                    onClick={() => setOpen(false)}
                    disabled={loading}
                  >Cancelar</button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded bg-primary text-white hover:bg-primary/90"
                    disabled={loading}
                  >{loading ? 'Guardando...' : 'Guardar'}</button>
                </div>
                {success && <div className="text-green-600 text-sm mt-2">{success}</div>}
                {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
              </form>
            </DialogContent>
          </Dialog>
        </div>
        {/* Info personal */}
        <div className="flex-1 flex flex-col justify-center">
          <h1 className="text-3xl font-bold mb-6">{targetParam ? `Perfil de @${user?.nombreUsuario || targetParam}` : "Mi perfil"}</h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <div className="text-gray-500 text-xs uppercase mb-1">Nombre</div>
              <div className="text-lg font-semibold">{user.nombre} {user.apellido1} {user.apellido2}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs uppercase mb-1">Fecha de nacimiento</div>
              <div className="text-lg font-semibold">{user.fechaNacimiento ? formatFecha(user.fechaNacimiento.slice(0, 10)) : "-"}</div>
            </div>
          </div>
        </div>
      </section>      {/* Cursos con tabs */}
      <section className="max-w-5xl w-full mx-auto">
        <h2 className="text-2xl font-bold mb-8">Cursos</h2>
        <Tabs defaultValue="matriculados" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="matriculados">Cursos Matriculados</TabsTrigger>
            <TabsTrigger value="docente">Cursos como Docente</TabsTrigger>
          </TabsList>
            <TabsContent value="matriculados" className="mt-6">
            {loadingCursos ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex flex-col items-center bg-white rounded-xl shadow p-4">
                    <Skeleton className="w-28 h-28 rounded-lg mb-3" />
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                ))}
              </div>
            ) : cursos.length === 0 ? (
              <div className="text-gray-500">No hay cursos matriculados.</div>
            ) : (<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
                {cursos.map((curso) => (                  <div
                    key={curso._id}
                    className="flex flex-col items-center bg-white rounded-xl shadow p-4 cursor-pointer hover:bg-blue-50 transition"
                    onClick={() => {
                      if (isOwnProfile) {
                        // Perfil propio - cursos matriculados van a principal
                        router.push(`/menu/principal?cursoId=${curso._id}`);
                      } else {
                        // Perfil ajeno - cualquier curso va a buscar
                        router.push(`/menu/buscar?cursoId=${curso._id}`);
                      }
                    }}
                    title={curso.nombreCurso}
                  >
                    <div className="w-28 h-28 rounded-lg overflow-hidden mb-3">
                      <Avatar className="w-28 h-28">
                        {curso.foto ? (
                          <AvatarImage src={curso.foto} alt={curso.nombreCurso} />
                        ) : (
                          <AvatarFallback>{curso.nombreCurso?.[0]?.toUpperCase() || "C"}</AvatarFallback>
                        )}
                      </Avatar>
                    </div>
                    <span className="text-center text-base font-medium line-clamp-2">{curso.nombreCurso}</span>
                    <span className="text-xs text-gray-500 mt-1">{curso.nombreUsuarioDocente && `Docente: ${curso.nombreUsuarioDocente}`}</span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
            <TabsContent value="docente" className="mt-6">
            {loadingCursosDocente ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex flex-col items-center bg-white rounded-xl shadow p-4">
                    <Skeleton className="w-28 h-28 rounded-lg mb-3" />
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                ))}
              </div>
            ) : cursosDocente.length === 0 ? (
              <div className="text-gray-500">No es docente de ningún curso.</div>
            ) : (<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
                {cursosDocente.map((curso) => (                  <div
                    key={curso._id}
                    className="flex flex-col items-center bg-white rounded-xl shadow p-4 cursor-pointer hover:bg-green-50 transition"
                    onClick={() => {
                      if (isOwnProfile) {
                        // Perfil propio - cursos como docente van a portal-docente
                        router.push(`/menu/portal-docente/cursos?cursoId=${curso._id}`);
                      } else {
                        // Perfil ajeno - cualquier curso va a buscar
                        router.push(`/menu/buscar?cursoId=${curso._id}`);
                      }
                    }}
                    title={curso.nombreCurso}
                  >
                    <div className="w-28 h-28 rounded-lg overflow-hidden mb-3">
                      <Avatar className="w-28 h-28">
                        {curso.foto ? (
                          <AvatarImage src={curso.foto} alt={curso.nombreCurso} />
                        ) : (
                          <AvatarFallback>{curso.nombreCurso?.[0]?.toUpperCase() || "C"}</AvatarFallback>
                        )}
                      </Avatar>
                    </div>
                    <span className="text-center text-base font-medium line-clamp-2">{curso.nombreCurso}</span>
                    <span className="text-xs text-green-600 mt-1 font-medium">Docente</span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}
