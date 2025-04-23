"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Search } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";

interface Curso {
  _id: string;
  nombreCurso: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  foto?: string;
  estado?: string;
  nombreUsuarioDocente: string;
}

export default function Cursos() {
  const [user, setUser] = useState<{ nombreUsuario: string } | null>(null);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    nombreCurso: '',
    descripcion: '',
    fechaInicio: '',
    fechaFin: '',
    foto: '',
    estado: 'Activo',
  });
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // Filtrar cursos según búsqueda
  const filteredCursos = cursos.filter((curso) =>
    curso.nombreCurso.toLowerCase().includes(searchQuery.toLowerCase()) ||
    curso.descripcion.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const totalPages = Math.ceil(filteredCursos.length / itemsPerPage);
  const paginatedCursos = filteredCursos.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const res = await fetch('/api/mongoDB/cursos/crear_curso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, nombreUsuarioDocente: user.nombreUsuario })
      });
      if (res.ok) {
        setOpen(false);
        setForm({ nombreCurso: '', descripcion: '', fechaInicio: '', fechaFin: '', foto: '', estado: 'Activo' });
        // Refrescar cursos
        const response = await fetch('/api/mongoDB/cursos/get_cursos');
        const result = await response.json();
        const cursosDocente = (result.cursos || []).filter((curso: Curso) => curso.nombreUsuarioDocente === user.nombreUsuario);
        setCursos(cursosDocente);
      }
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    // Obtener usuario autenticado
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => setUser(data.user));
  }, []);

  useEffect(() => {
    if (!user) return;
    // Obtener cursos creados por el usuario actual
    const fetchCursos = async () => {
      try {
        const response = await fetch('/api/mongoDB/cursos/get_cursos');
        const result = await response.json();
        const cursosDocente = (result.cursos || []).filter((curso: Curso) => curso.nombreUsuarioDocente === user.nombreUsuario);
        setCursos(cursosDocente);
        setLoading(false);
      } catch (error) {
        setLoading(false);
      }
    };
    fetchCursos();
  }, [user]);


  return (
    <div className="min-h-screen p-4 pb-16 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Mis Cursos como Docente</h1>
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <Input
            type="search"
            placeholder="Buscar cursos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 mb-8">
          {loading ? (
            <div className="col-span-full text-center">Cargando cursos...</div>
          ) : paginatedCursos.length === 0 ? (
            <div className="col-span-full text-center">No se encontraron cursos.</div>
          ) : (
            paginatedCursos.map((curso) => (
              <Card key={curso._id} className="h-full flex flex-col">
                {curso.foto && (
                  <Image src={curso.foto} alt={curso.nombreCurso} width={400} height={200} className="rounded-t-md object-cover h-48 w-full" />
                )}
                <CardHeader>
                  <CardTitle>{curso.nombreCurso}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between">
                  <p className="text-sm text-muted-foreground mb-2">{curso.descripcion}</p>
                  <div className="text-xs text-gray-500 mt-auto">
                    Estado: {curso.estado || 'Activo'}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
        {totalPages > 1 && (
          <Pagination className="mb-8">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  aria-disabled={currentPage === 1}
                  tabIndex={currentPage === 1 ? -1 : 0}
                  style={{ pointerEvents: currentPage === 1 ? 'none' : 'auto', opacity: currentPage === 1 ? 0.5 : 1 }}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => (
                <PaginationItem key={i}>
                  <PaginationLink
                    isActive={currentPage === i + 1}
                    onClick={() => handlePageChange(i + 1)}
                    style={{ cursor: 'pointer' }}
                  >
                    {i + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  aria-disabled={currentPage === totalPages}
                  tabIndex={currentPage === totalPages ? -1 : 0}
                  style={{ pointerEvents: currentPage === totalPages ? 'none' : 'auto', opacity: currentPage === totalPages ? 0.5 : 1 }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
      <div className="fixed bottom-8 right-8 z-50">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setOpen(true)} size="lg" className="rounded-full shadow-lg px-6 py-3">Crear nuevo curso</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear nuevo curso</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input name="nombreCurso" value={form.nombreCurso} onChange={handleChange} placeholder="Nombre del curso" required />
              <Textarea name="descripcion" value={form.descripcion} onChange={handleChange} placeholder="Descripción" required />
              <Input name="fechaInicio" value={form.fechaInicio} onChange={handleChange} type="date" required />
              <Input name="fechaFin" value={form.fechaFin} onChange={handleChange} type="date" required />
              <Input name="foto" value={form.foto} onChange={handleChange} placeholder="URL de la imagen (opcional)" />
              <DialogFooter>
                <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Crear curso'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
