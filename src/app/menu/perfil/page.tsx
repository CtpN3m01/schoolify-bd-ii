"use client";
import { useEffect, useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogClose,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Perfil() {
  const [user, setUser] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => setUser(data.user));
  }, []);

  if (!user) {
    return <div className="flex justify-center items-center min-h-screen">Cargando...</div>;
  }

  const handleEditClick = () => {
    setEditData({ ...user });
    setOpen(true);
    setSuccess("");
    setError("");
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditData({ ...editData, [e.target.name]: e.target.value });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess("");
    setError("");
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
          foto: editData.foto,
        }),
      });
      if (res.ok) {
        setSuccess("Perfil actualizado correctamente");
        setUser({ ...user, ...editData });
        setOpen(false);
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
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="flex flex-col min-h-screen px-4 py-8 sm:px-20 sm:py-20 font-sans bg-gray-50">
      {/* Card principal de perfil */}
      <section className="max-w-3xl w-full mx-auto bg-white rounded-2xl shadow-md p-8 flex flex-col sm:flex-row gap-8 mb-16">
        {/* Avatar y acciones */}
        <div className="flex flex-col items-center sm:items-start">
          <div className="w-32 h-32 rounded-full overflow-hidden mb-4 border-4 border-gray-200 flex items-center justify-center">
            <Avatar className="w-32 h-32">
              {user.foto ? (
                <AvatarImage src={user.foto} alt={user.nombreUsuario} />
              ) : (
                <AvatarFallback>{user.nombreUsuario?.[0]?.toUpperCase() || "U"}</AvatarFallback>
              )}
            </Avatar>
          </div>
          <span className="text-gray-700 text-base font-medium mb-1">@{user.nombreUsuario}</span>
          <span className="text-gray-500 text-sm mb-4">{user.amigos?.length ? `${user.amigos.length} Amigos` : "Sin amigos"}</span>
          <button
            className="bg-black text-white px-5 py-2 rounded-md font-medium text-sm hover:bg-gray-900 transition"
            onClick={handleEditClick}
          >
            Editar perfil
          </button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
              <DialogTitle>Editar perfil</DialogTitle>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs mb-1">Nombre de usuario</label>
                  <input
                    name="nombreUsuario"
                    value={editData?.nombreUsuario || ""}
                    onChange={handleEditChange}
                    className="w-full border rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1">Nombre</label>
                  <input
                    name="nombre"
                    value={editData?.nombre || ""}
                    onChange={handleEditChange}
                    className="w-full border rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1">Primer Apellido</label>
                  <input
                    name="apellido1"
                    value={editData?.apellido1 || ""}
                    onChange={handleEditChange}
                    className="w-full border rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1">Segundo Apellido</label>
                  <input
                    name="apellido2"
                    value={editData?.apellido2 || ""}
                    onChange={handleEditChange}
                    className="w-full border rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1">Fecha de nacimiento</label>
                  <input
                    name="fechaNacimiento"
                    type="date"
                    value={editData?.fechaNacimiento ? editData.fechaNacimiento.slice(0, 10) : ""}
                    onChange={handleEditChange}
                    className="w-full border rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1">Foto (URL)</label>
                  <input
                    name="foto"
                    value={editData?.foto || ""}
                    onChange={handleEditChange}
                    className="w-full border rounded px-2 py-1"
                  />
                </div>
                {error && <div className="text-red-500 text-xs">{error}</div>}
                {success && <div className="text-green-600 text-xs">{success}</div>}
                <div className="flex gap-2 justify-end">
                  <DialogClose asChild>
                    <button type="button" className="px-4 py-2 rounded bg-gray-200">Cancelar</button>
                  </DialogClose>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded bg-black text-white"
                    disabled={loading}
                  >
                    {loading ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        {/* Info personal */}
        <div className="flex-1 flex flex-col justify-center">
          <h1 className="text-3xl font-bold mb-6">Mi perfil</h1>
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
      </section>
      {/* Cursos (puedes completar con info real si la tienes) */}
      <section className="max-w-5xl w-full mx-auto">
        <h2 className="text-2xl font-bold mb-8">Cursos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          <div className="flex flex-col items-center bg-white rounded-xl shadow p-4">
            <div className="w-28 h-28 rounded-lg overflow-hidden mb-3">
              <Avatar className="w-28 h-28">
                <AvatarImage src="/curso-python.jpg" alt="Python" />
                <AvatarFallback>Python</AvatarFallback>
              </Avatar>
            </div>
            <span className="text-center text-base font-medium">Python de Cero a Experto</span>
          </div>
          <div className="flex flex-col items-center bg-white rounded-xl shadow p-4">
            <div className="w-28 h-28 rounded-lg overflow-hidden mb-3">
              <Avatar className="w-28 h-28">
                <AvatarImage src="/curso-japones.jpg" alt="Japonés" />
                <AvatarFallback>Japonés</AvatarFallback>
              </Avatar>
            </div>
            <span className="text-center text-base font-medium">Japonés desde Cero</span>
          </div>
          <div className="flex flex-col items-center bg-white rounded-xl shadow p-4">
            <div className="w-28 h-28 rounded-lg overflow-hidden mb-3">
              <Avatar className="w-28 h-28">
                <AvatarImage src="/curso-dj.jpg" alt="DJ" />
                <AvatarFallback>DJ</AvatarFallback>
              </Avatar>
            </div>
            <span className="text-center text-base font-medium">DJ y Producción Musical</span>
          </div>
          <div className="flex flex-col items-center bg-white rounded-xl shadow p-4">
            <div className="w-28 h-28 rounded-lg overflow-hidden mb-3">
              <Avatar className="w-28 h-28">
                <AvatarImage src="/curso-x.jpg" alt="Curso X" />
                <AvatarFallback>Curso X</AvatarFallback>
              </Avatar>
            </div>
            <span className="text-center text-base font-medium">Curso X</span>
          </div>
        </div>
      </section>
    </div>
  );
}
