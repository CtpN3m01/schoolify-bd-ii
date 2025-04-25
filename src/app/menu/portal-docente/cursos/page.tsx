"use client";

import { useRef, useEffect, useState, createRef } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Search, X } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";

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
    // Obtener todos los cursos creados por el docente, sin importar el estado
    const fetchCursos = async () => {
      try {
        const response = await fetch('/api/mongoDB/cursos/get_cursos');
        const result = await response.json();
        // Filtrar solo los cursos donde el usuario es el docente
        const cursosDocente = (result.cursos || []).filter((curso: Curso) => curso.nombreUsuarioDocente === user.nombreUsuario);
        setCursos(cursosDocente);
        setLoading(false);
      } catch (error) {
        setLoading(false);
      }
    };
    fetchCursos();
  }, [user]);

  const [selectedCurso, setSelectedCurso] = useState<Curso | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  // Estructura de módulos/secciones por curso (en memoria, para demo; en real, vendría de la API)
  const [modulos, setModulos] = useState<{ [cursoId: string]: any[] }>({});
  const [nuevoModulo, setNuevoModulo] = useState({ nombre: '', descripcion: '', contenidos: [] as any[] });
  const [nuevoContenido, setNuevoContenido] = useState({ tipo: 'texto', valor: '' });
  const [changingState, setChangingState] = useState(false);
  const [nuevoEstado, setNuevoEstado] = useState('');

  // Al hacer click en un curso, abrir modal de detalle y cargar módulos desde MongoDB
  const handleCursoClick = async (curso: Curso) => {
    setSelectedCurso(curso);
    setDetailOpen(true);
    // Cargar módulos/secciones desde el campo contenido
    try {
      const res = await fetch('/api/mongoDB/cursos/get_cursos');
      const data = await res.json();
      const cursoDB = (data.cursos || []).find((c: any) => c._id === curso._id);
      setModulos((prev) => ({
        ...prev,
        [curso._id]: cursoDB?.contenido || []
      }));
    } catch (e) {
      // Si falla, dejar vacío
      setModulos((prev) => ({ ...prev, [curso._id]: [] }));
    }
  };

  // Agregar sección (módulo) al curso seleccionado y persistir en MongoDB
  const handleAgregarModulo = async () => {
    if (!selectedCurso) return;
    const nuevo = {
      nombre: nuevoModulo.nombre,
      contenidos: [],
      subsecciones: []
    };
    // Guardar en MongoDB
    try {
      await fetch('/api/mongoDB/cursos/agregar_modulo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cursoId: selectedCurso._id, modulo: nuevo })
      });
      // Recargar módulos desde la base
      const res = await fetch('/api/mongoDB/cursos/get_cursos');
      const data = await res.json();
      const cursoDB = (data.cursos || []).find((c: any) => c._id === selectedCurso._id);
      setModulos((prev) => ({
        ...prev,
        [selectedCurso._id]: cursoDB?.contenido || []
      }));
    } catch (e) {
      // Si falla, solo actualizar local
      setModulos((prev) => ({
        ...prev,
        [selectedCurso._id]: [...(prev[selectedCurso._id] || []), nuevo]
      }));
    }
    setNuevoModulo({ nombre: '', descripcion: '', contenidos: [] });
  };

  // Estado para inputs individuales de contenido (ahora incluye titulo)
  const [inputsContenido, setInputsContenido] = useState<{ [key: string]: { tipo: string; valor: string; titulo?: string } }>({});

  // Eliminar sección (módulo)
  const handleEliminarModulo = async (modIndex: number) => {
    if (!selectedCurso) return;
    setModulos((prev) => {
      const mods = [...(prev[selectedCurso._id] || [])];
      mods.splice(modIndex, 1);
      // Persistir en MongoDB
      fetch('/api/mongoDB/cursos/actualizar_modulos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cursoId: selectedCurso._id, modulos: limpiarModulosParaMongo(mods) })
      });
      return { ...prev, [selectedCurso._id]: mods };
    });
  };

  // Eliminar contenido de sección o subsección
  const handleEliminarContenido = async (modIndex: number, contIndex: number, subIndex?: number) => {
    if (!selectedCurso) return;
    setModulos((prev) => {
      const mods = [...(prev[selectedCurso._id] || [])];
      if (subIndex !== undefined) {
        mods[modIndex].subsecciones[subIndex].contenidos.splice(contIndex, 1);
      } else {
        mods[modIndex].contenidos.splice(contIndex, 1);
      }
      // Persistir en MongoDB
      fetch('/api/mongoDB/cursos/actualizar_modulos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cursoId: selectedCurso._id, modulos: limpiarModulosParaMongo(mods) })
      });
      return { ...prev, [selectedCurso._id]: mods };
    });
  };

  // Inputs individuales para agregar contenido
  const getInputKey = (modIndex: number, subIndex?: number) =>
    subIndex !== undefined ? `mod${modIndex}-sub${subIndex}` : `mod${modIndex}`;

  const handleInputContenidoChange = (modIndex: number, subIndex: number | undefined, field: 'tipo' | 'valor' | 'titulo', value: string) => {
    setInputsContenido((prev) => {
      const key = getInputKey(modIndex, subIndex);
      return { ...prev, [key]: { ...prev[key], [field]: value } };
    });
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

  const handleAgregarContenido = async (modIndex: number, subIndex?: number) => {
    if (!selectedCurso) return;
    const key = getInputKey(modIndex, subIndex);
    const input = {
      tipo: (inputsContenido[key]?.tipo || 'texto'),
      valor: (inputsContenido[key]?.valor || ''),
      titulo: (inputsContenido[key]?.titulo || '')
    };
    if (!input.valor.trim()) return;
    // Obtener copia de los módulos actuales
    const mods = [...(modulos[selectedCurso._id] || [])];
    if (subIndex !== undefined) {
      mods[modIndex].subsecciones = mods[modIndex].subsecciones || [];
      mods[modIndex].subsecciones[subIndex] = {
        ...mods[modIndex].subsecciones[subIndex],
        contenidos: [...(mods[modIndex].subsecciones[subIndex].contenidos || []), { ...input }],
      };
    } else {
      mods[modIndex] = {
        ...mods[modIndex],
        contenidos: [...(mods[modIndex].contenidos || []), { ...input }],
      };
    }
    // Persistir en MongoDB usando el array actualizado
    try {
      await fetch('/api/mongoDB/cursos/actualizar_modulos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cursoId: selectedCurso._id, modulos: limpiarModulosParaMongo(mods) })
      });
      // Recargar módulos desde la base para evitar duplicados
      const res = await fetch('/api/mongoDB/cursos/get_cursos');
      const data = await res.json();
      const cursoDB = (data.cursos || []).find((c: any) => c._id === selectedCurso._id);
      setModulos((prev) => ({
        ...prev,
        [selectedCurso._id]: cursoDB?.contenido || []
      }));
    } catch (e) {}
    setInputsContenido((prev) => ({ ...prev, [key]: { tipo: 'texto', valor: '', titulo: '' } }));
  };

  // Cambiar estado del curso (asegurar que esté definida)
  const handleCambiarEstado = async () => {
    if (!selectedCurso || !nuevoEstado) return;
    setChangingState(true);
    try {
      // Llamada a la API de Redis para cambiar estado y sincronizar con Mongo
      await fetch(`/api/redisDB/cambiarEstadoCurso/${selectedCurso._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      // Refrescar cursos
      const response = await fetch('/api/mongoDB/cursos/get_cursos');
      const result = await response.json();
      const cursosDocente = (result.cursos || []).filter((curso: Curso) => curso.nombreUsuarioDocente === user?.nombreUsuario);
      setCursos(cursosDocente);
      setDetailOpen(false);
    } finally {
      setChangingState(false);
      setNuevoEstado('');
    }
  };

  // Utilidad para limpiar _id y campos temporales de módulos, subsecciones y contenidos
  function limpiarModulosParaMongo(modulos: any[]) {
    return modulos.map(mod => {
      const modCpy = { ...mod };
      delete modCpy._id;
      delete modCpy.nuevaSubseccionNombre;
      delete modCpy.nuevaSubseccionDescripcion;
      if (modCpy.subsecciones) {
        modCpy.subsecciones = modCpy.subsecciones.map((sub: any) => {
          const subCpy = { ...sub };
          delete subCpy._id;
          delete subCpy.nuevaSubseccionNombre;
          delete subCpy.nuevaSubseccionDescripcion;
          if (subCpy.contenidos) {
            subCpy.contenidos = subCpy.contenidos.map((cont: any) => {
              const contCpy = { ...cont };
              delete contCpy._id;
              return contCpy;
            });
          }
          return subCpy;
        });
      }
      if (modCpy.contenidos) {
        modCpy.contenidos = modCpy.contenidos.map((cont: any) => {
          const contCpy = { ...cont };
          delete contCpy._id;
          return contCpy;
        });
      }
      return modCpy;
    });
  }

  // Estado para input individual de subsección
  const [inputsSubseccion, setInputsSubseccion] = useState<{ [key: string]: string }>({});

  const handleAgregarSubseccion = async (modIndex: number) => {
    if (!selectedCurso) return;
    const nombre = inputsSubseccion[`mod${modIndex}`] || '';
    if (!nombre.trim()) return;
    // Clona el módulo actual y agrega la subsección SOLO para enviar a la API
    const nuevosModulos = [...(modulos[selectedCurso._id] || [])];
    nuevosModulos[modIndex].subsecciones = nuevosModulos[modIndex].subsecciones || [];
    nuevosModulos[modIndex].subsecciones.push({ nombre, contenidos: [] });
    setInputsSubseccion((prev) => ({ ...prev, [`mod${modIndex}`]: '' }));
    try {
      await fetch('/api/mongoDB/cursos/actualizar_modulos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cursoId: selectedCurso._id, modulos: limpiarModulosParaMongo(nuevosModulos) })
      });
      // Recarga los módulos desde la base para evitar duplicados
      const res = await fetch('/api/mongoDB/cursos/get_cursos');
      const data = await res.json();
      const cursoDB = (data.cursos || []).find((c: any) => c._id === selectedCurso._id);
      setModulos((prev) => ({
        ...prev,
        [selectedCurso._id]: cursoDB?.contenido || []
      }));
    } catch (e) {
      // Si falla, solo actualiza localmente
      setModulos((prev) => ({
        ...prev,
        [selectedCurso._id]: nuevosModulos
      }));
    }
  };

  // Eliminar subsección
  const handleEliminarSubseccion = async (modIndex: number, subIndex: number) => {
    if (!selectedCurso) return;
    setModulos((prev) => {
      const mods = [...(prev[selectedCurso._id] || [])];
      mods[modIndex].subsecciones.splice(subIndex, 1);
      // Persistir en MongoDB
      fetch('/api/mongoDB/cursos/actualizar_modulos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cursoId: selectedCurso._id, modulos: limpiarModulosParaMongo(mods) })
      });
      return { ...prev, [selectedCurso._id]: mods };
    });
  };

  // Estado para controlar qué módulo y subsección están abiertos
  const [openModulo, setOpenModulo] = useState<number | null>(null);
  const [openSubseccion, setOpenSubseccion] = useState<{ mod: number; sub: number } | null>(null);

  // Refs para scroll automático
  const moduloRefs = useRef<(HTMLLIElement | null)[]>([]);
  const subseccionRefs = useRef<{ [key: string]: HTMLLIElement | null }>({});

  // Efecto para hacer scroll al abrir módulo
  useEffect(() => {
    if (openModulo !== null && moduloRefs.current[openModulo]) {
      moduloRefs.current[openModulo]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [openModulo]);

  // Efecto para hacer scroll al abrir subsección
  useEffect(() => {
    if (openSubseccion) {
      const key = `${openSubseccion.mod}-${openSubseccion.sub}`;
      subseccionRefs.current[key]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [openSubseccion]);

  // Estado para control de diálogos de confirmación
  const [confirmDialog, setConfirmDialog] = useState<{ type: null | 'modulo' | 'subseccion' | 'contenido', modIndex?: number, subIndex?: number, contIndex?: number }>({ type: null });

  // Cambia los handlers para abrir el dialog en vez de eliminar directamente
  const pedirConfirmarEliminarModulo = (modIndex: number) => setConfirmDialog({ type: 'modulo', modIndex });
  const pedirConfirmarEliminarSubseccion = (modIndex: number, subIndex: number) => setConfirmDialog({ type: 'subseccion', modIndex, subIndex });
  const pedirConfirmarEliminarContenido = (modIndex: number, contIndex: number, subIndex?: number) => setConfirmDialog({ type: 'contenido', modIndex, contIndex, subIndex });

  // Estado para edición rápida del curso seleccionado
  const [editForm, setEditForm] = useState({
    nombreCurso: '',
    descripcion: '',
    fechaInicio: '',
    fechaFin: '',
    foto: ''
  });
  // Estados para archivo y preview de imagen en edición de curso
  const [fileEditFoto, setFileEditFoto] = useState<File | null>(null);
  const [previewEditFoto, setPreviewEditFoto] = useState<string>("");

  // Sincronizar editForm y preview al seleccionar curso
  useEffect(() => {
    if (selectedCurso) {
      setEditForm({
        nombreCurso: selectedCurso.nombreCurso || '',
        descripcion: selectedCurso.descripcion || '',
        fechaInicio: selectedCurso.fechaInicio || '',
        fechaFin: selectedCurso.fechaFin || '',
        foto: selectedCurso.foto || ''
      });
      setPreviewEditFoto(selectedCurso.foto || "");
      setFileEditFoto(null);
    }
  }, [selectedCurso]);

  // Estado para preview de imagen de curso
  const [previewFoto, setPreviewFoto] = useState<string>("");
  const handleFotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadArchivo(file);
      setForm(f => ({ ...f, foto: url }));
      setPreviewFoto(url);
    } catch {
      // Manejo de error opcional
    }
  };

  // Para inputs de contenido tipo archivo
  const [fileInputsContenido, setFileInputsContenido] = useState<{ [key: string]: File | null }>({});
  const [previewInputsContenido, setPreviewInputsContenido] = useState<{ [key: string]: string }>({});
  const handleFileInputContenido = async (modIndex: number, subIndex: number | undefined, file: File) => {
    const key = getInputKey(modIndex, subIndex);
    setFileInputsContenido(prev => ({ ...prev, [key]: file }));
    try {
      const url = await uploadArchivo(file);
      setInputsContenido(prev => ({ ...prev, [key]: { ...prev[key], valor: url } }));
      setPreviewInputsContenido(prev => ({ ...prev, [key]: url }));
    } catch {
      // Manejo de error opcional
    }
  };

  return (
    <div className="min-h-screen p-4 pb-16 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Mis Cursos como Docente</h1>
          <Button onClick={() => setOpen(true)} variant="default">+ Crear curso</Button>
        </div>
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
              <Card key={curso._id} className="h-full flex flex-col cursor-pointer" onClick={() => handleCursoClick(curso)}>
                {curso.foto && (
                  <Image src={curso.foto} alt={curso.nombreCurso} width={400} height={200} className="rounded-t-md object-cover h-48 w-full" />
                )}
                <CardHeader>
                  <CardTitle>{curso.nombreCurso}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between">
                  <p className="text-sm text-muted-foreground mb-2">{curso.descripcion}</p>
                  <div className="text-xs text-gray-500 mt-auto">
                    Estado: {curso.estado || 'Edición'}
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
        {/* Mostrar info y edición del curso seleccionado directamente aquí */}
        {selectedCurso && (
          <div className="mt-8 border-4 border-blue-600 rounded-2xl shadow-2xl bg-white p-8 mb-8 transition-all duration-200">
            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h2 className="text-xl font-bold mb-2">{selectedCurso.nombreCurso}</h2>
                <p className="mb-2 text-gray-700"><span className="font-semibold">Descripción:</span> {selectedCurso.descripcion}</p>
                <div className="mb-2 text-gray-700"><span className="font-semibold">Fecha inicio:</span> {selectedCurso.fechaInicio}</div>
                <div className="mb-2 text-gray-700"><span className="font-semibold">Fecha fin:</span> {selectedCurso.fechaFin}</div>
                <div className="mb-2 text-gray-700"><span className="font-semibold">Estado actual:</span> <span className="font-semibold">{selectedCurso.estado || 'Edición'}</span></div>
              </div>
              {selectedCurso.foto && (
                <div className="flex items-center justify-center">
                  <Image src={selectedCurso.foto} alt={selectedCurso.nombreCurso} width={320} height={180} className="rounded-md object-cover max-h-40 w-full" />
                </div>
              )}
            </div>
            {/* Botón para publicar curso y editar info */}
            <div className="flex flex-wrap gap-4 mb-4 items-end">
              {/* Botón publicar */}
              {selectedCurso.estado !== 'Publicado' && (
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={changingState}
                  onClick={async () => {
                    setChangingState(true);
                    try {
                      await fetch(`/api/redisDB/cambiarEstadoCurso/${selectedCurso._id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ estado: 'Publicado' }),
                      });
                      // Refrescar cursos
                      const response = await fetch('/api/mongoDB/cursos/get_cursos');
                      const result = await response.json();
                      const cursosDocente = (result.cursos || []).filter((curso: any) => curso.nombreUsuarioDocente === user?.nombreUsuario);
                      setCursos(cursosDocente);
                      setSelectedCurso(cursosDocente.find((c: any) => c._id === selectedCurso._id) || null);
                    } finally {
                      setChangingState(false);
                    }
                  }}
                >
                  {changingState ? 'Publicando...' : 'Publicar curso'}
                </Button>
              )}
              {/* Formulario de edición rápida */}
              <form className="flex flex-wrap gap-2 items-end" onSubmit={async e => {
                e.preventDefault();
                if (!selectedCurso) return;
                setChangingState(true);
                try {
                  let fotoUrl = editForm.foto;
                  if (fileEditFoto) {
                    fotoUrl = await uploadArchivo(fileEditFoto);
                  }
                  await fetch(`/api/mongoDB/cursos/editar_curso/${selectedCurso._id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      nombreCurso: editForm.nombreCurso,
                      descripcion: editForm.descripcion,
                      fechaInicio: editForm.fechaInicio,
                      fechaFin: editForm.fechaFin,
                      foto: fotoUrl
                    })
                  });
                  // Refrescar cursos
                  const response = await fetch('/api/mongoDB/cursos/get_cursos');
                  const result = await response.json();
                  const cursosDocente = (result.cursos || []).filter((curso: any) => curso.nombreUsuarioDocente === user?.nombreUsuario);
                  setCursos(cursosDocente);
                  setSelectedCurso(cursosDocente.find((c: any) => c._id === selectedCurso._id) || null);
                  setFileEditFoto(null);
                  setPreviewEditFoto("");
                } finally {
                  setChangingState(false);
                }
              }}>
                <div className="flex flex-col">
                  <label className="font-medium" htmlFor="edit-nombreCurso">Título del curso</label>
                  <Input
                    id="edit-nombreCurso"
                    className="w-40"
                    value={editForm.nombreCurso}
                    onChange={e => setEditForm(f => ({ ...f, nombreCurso: e.target.value }))}
                    placeholder="Título del curso"
                    required
                  />
                </div>
                <div className="flex flex-col">
                  <label className="font-medium" htmlFor="edit-descripcion">Descripción</label>
                  <Input
                    id="edit-descripcion"
                    className="w-40"
                    value={editForm.descripcion}
                    onChange={e => setEditForm(f => ({ ...f, descripcion: e.target.value }))}
                    placeholder="Descripción"
                    required
                  />
                </div>
                <div className="flex flex-col">
                  <label className="font-medium" htmlFor="edit-fechaInicio">Fecha de inicio</label>
                  <Input
                    id="edit-fechaInicio"
                    type="date"
                    className="w-36"
                    value={editForm.fechaInicio}
                    onChange={e => setEditForm(f => ({ ...f, fechaInicio: e.target.value }))}
                    required
                  />
                </div>
                <div className="flex flex-col">
                  <label className="font-medium" htmlFor="edit-fechaFin">Fecha de fin</label>
                  <Input
                    id="edit-fechaFin"
                    type="date"
                    className="w-36"
                    value={editForm.fechaFin}
                    onChange={e => setEditForm(f => ({ ...f, fechaFin: e.target.value }))}
                    required
                  />
                </div>
                <div className="flex flex-col">
                  <label className="font-medium" htmlFor="edit-foto">Imagen del curso</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="file"
                      accept="image/*"
                      id="edit-foto-file"
                      style={{ display: 'none' }}
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setFileEditFoto(file);
                          setPreviewEditFoto(URL.createObjectURL(file));
                        }
                      }}
                    />
                    <Button type="button" onClick={() => document.getElementById('edit-foto-file')?.click()} className="w-36">Subir imagen</Button>
                    {previewEditFoto ? (
                      <img src={previewEditFoto} alt="Preview" className="h-12 w-20 object-cover rounded ml-2 border" />
                    ) : editForm.foto ? (
                      <img src={editForm.foto} alt="Preview" className="h-12 w-20 object-cover rounded ml-2 border" />
                    ) : null}
                  </div>
                </div>
                <Button type="submit" disabled={changingState} className="bg-blue-600 hover:bg-blue-700 text-white mt-5">
                  {changingState ? 'Guardando...' : 'Guardar cambios'}
                </Button>
              </form>
              {/* Cambiar estado */}
              <div className="flex items-end gap-2">
                <div>
                  <label className="block mb-1 font-medium">Cambiar estado:</label>
                  <select
                    className="border rounded px-2 py-1"
                    value={nuevoEstado}
                    onChange={e => setNuevoEstado(e.target.value)}
                    disabled={changingState}
                  >
                    <option value="">Selecciona estado</option>
                    <option value="Edición">Edición</option>
                    {selectedCurso.estado === 'Edición' && <option value="Publicado">Publicar</option>}
                    {['Publicado', 'Activo'].includes(selectedCurso.estado || '') && <option value="Cancelado">Cancelar</option>}
                    {selectedCurso.estado === 'Publicado' && <option value="Activo">Activar</option>}
                  </select>
                </div>
                <Button onClick={handleCambiarEstado} disabled={!nuevoEstado || changingState} className="ml-2">
                  {changingState ? 'Cambiando...' : 'Cambiar'}
                </Button>
              </div>
            </div>
            {/* Scroll para módulos/secciones y subsecciones */}
            <ScrollArea className="h-[60vh] w-full pr-2">
              <div className="mb-4">
                <h3 className="font-semibold mb-2">Módulos/Secciones</h3>
                <ul className="mb-2 space-y-2">
                  {(modulos[selectedCurso._id] || []).map((mod, i) => (
                    <li
                      key={i}
                      className="border rounded"
                      ref={el => { moduloRefs.current[i] = el; }}
                    >
                      <Collapsible open={openModulo === i} onOpenChange={open => setOpenModulo(open ? i : null)}>
                        <CollapsibleTrigger className="w-full flex justify-between items-center px-4 py-2 cursor-pointer bg-gray-100 rounded-t">
                          <span className="font-medium">{mod.nombre}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Abrir/Cerrar</span>
                            <span
                              role="button"
                              tabIndex={0}
                              className="text-red-500 hover:bg-red-100 rounded-full p-1 ml-1 focus:outline-none focus:ring-2 focus:ring-red-400"
                              title="Eliminar sección"
                              onClick={e => { e.stopPropagation(); pedirConfirmarEliminarModulo(i); }}
                              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); pedirConfirmarEliminarModulo(i); } }}
                            >
                              <X className="w-5 h-5" />
                            </span>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="p-4 space-y-2 bg-white">
                          {mod.descripcion && <div className="mb-2 text-sm text-gray-700">{mod.descripcion}</div>}
                          {/* Contenidos de la sección principal primero */}
                          <ul className="space-y-1">
                            {mod.contenidos && mod.contenidos.map((cont: any, j: number) => (
                              <li key={j} className="mb-4">
                                <div className="border rounded-lg p-3 bg-gray-50 flex flex-col items-start gap-2">
                                  <span className="font-semibold capitalize mb-1">{cont.tipo === 'texto' ? 'Texto' : cont.tipo === 'documento' ? 'Documento' : cont.tipo === 'video' ? 'Video' : 'Imagen'}</span>
                                  {cont.titulo && <span className="text-sm font-medium text-blue-700">{cont.titulo}</span>}
                                  {cont.tipo === 'texto' && (
                                    <span className="text-gray-800 whitespace-pre-line">{cont.valor}</span>
                                  )}
                                  {cont.tipo === 'video' && (
                                    <>
                                      <video src={cont.valor} controls className="w-full max-w-lg max-h-60 object-contain rounded shadow border" style={{ background: '#000' }} />
                                      <a href={cont.valor} download className="text-blue-600 underline text-xs mt-1" target="_blank" rel="noopener noreferrer">Descargar video</a>
                                    </>
                                  )}
                                  {cont.tipo === 'imagen' && (
                                    <>
                                      <div className="w-full flex justify-center">
                                        <img src={cont.valor} alt="Imagen" className="w-full max-w-lg max-h-60 object-contain rounded shadow border" style={{ background: '#fff' }} />
                                      </div>
                                      <a href={cont.valor} download className="text-blue-600 underline text-xs mt-1" target="_blank" rel="noopener noreferrer">Descargar imagen</a>
                                    </>
                                  )}
                                  {cont.tipo === 'documento' && (
                                    <>
                                      <a href={cont.valor} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-all block max-w-full border rounded px-2 py-1 bg-white hover:bg-gray-100 transition">Ver documento</a>
                                      <a href={cont.valor} download className="text-blue-600 underline text-xs mt-1" target="_blank" rel="noopener noreferrer">Descargar documento</a>
                                    </>
                                  )}
                                  {/* Botón eliminar contenido */}
                                  <Button variant="ghost" size="icon" className="ml-auto text-red-500 hover:bg-red-100" onClick={() => pedirConfirmarEliminarContenido(i, j)} title="Eliminar contenido">
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              </li>
                            ))}
                          </ul>
                          {/* Formulario para agregar contenido principal SIEMPRE visible */}
                          <div className="flex gap-2 mt-2">
                            <select value={(inputsContenido[getInputKey(i)]?.tipo || 'texto')} onChange={e => handleInputContenidoChange(i, undefined, 'tipo', e.target.value)} className="border rounded px-2">
                              <option value="texto">Texto</option>
                              <option value="documento">Documento</option>
                              <option value="video">Video</option>
                              <option value="imagen">Imagen</option>
                            </select>
                            {(inputsContenido[getInputKey(i)]?.tipo === 'imagen' || inputsContenido[getInputKey(i)]?.tipo === 'video' || inputsContenido[getInputKey(i)]?.tipo === 'documento') && (
                              <Input
                                value={inputsContenido[getInputKey(i)]?.titulo || ''}
                                onChange={e => handleInputContenidoChange(i, undefined, 'titulo', e.target.value)}
                                placeholder="Título del archivo"
                                className="w-40"
                              />
                            )}
                            {(inputsContenido[getInputKey(i)]?.tipo === 'imagen' || inputsContenido[getInputKey(i)]?.tipo === 'video' || inputsContenido[getInputKey(i)]?.tipo === 'documento') ? (
                              <>
                                <input type="file"
                                  accept={inputsContenido[getInputKey(i)]?.tipo === 'imagen' ? 'image/*' : inputsContenido[getInputKey(i)]?.tipo === 'video' ? 'video/*' : '*'}
                                  onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) handleFileInputContenido(i, undefined, file);
                                  }}
                                />
                                {previewInputsContenido[getInputKey(i)] && inputsContenido[getInputKey(i)]?.tipo === 'imagen' && (
                                  <img src={previewInputsContenido[getInputKey(i)]} alt="Preview" className="h-10 w-16 object-cover rounded" />
                                )}
                                {previewInputsContenido[getInputKey(i)] && inputsContenido[getInputKey(i)]?.tipo === 'video' && (
                                  <video src={previewInputsContenido[getInputKey(i)]} className="h-10 w-16 object-cover rounded" controls />
                                )}
                                {previewInputsContenido[getInputKey(i)] && inputsContenido[getInputKey(i)]?.tipo === 'documento' && (
                                  <a href={previewInputsContenido[getInputKey(i)]} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline ml-2">Ver archivo</a>
                                )}
                              </>
                            ) : (
                              <Input
                                value={inputsContenido[getInputKey(i)]?.valor || ''}
                                onChange={e => handleInputContenidoChange(i, undefined, 'valor', e.target.value)}
                                placeholder={`Agregar ${(inputsContenido[getInputKey(i)]?.tipo || 'texto')}`}
                              />
                            )}
                            <Button type="button" onClick={() => handleAgregarContenido(i)}>
                              Agregar
                            </Button>
                          </div>
                          {/* Sub-secciones después */}
                          {mod.subsecciones && mod.subsecciones.length > 0 && (
                            <ul className="mb-2 ml-4 space-y-2">
                              {mod.subsecciones.map((sub: any, k: number) => (
                                <li
                                  key={k}
                                  className="border rounded"
                                  ref={el => { subseccionRefs.current[`${i}-${k}`] = el; }}
                                >
                                  <Collapsible open={openSubseccion?.mod === i && openSubseccion?.sub === k} onOpenChange={open => setOpenSubseccion(open ? { mod: i, sub: k } : null)}>
                                    <CollapsibleTrigger className="w-full flex justify-between items-center px-3 py-1 cursor-pointer bg-gray-50 rounded-t">
                                      <span className="font-medium">{sub.nombre}</span>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500">Abrir/Cerrar</span>
                                        <span
                                          role="button"
                                          tabIndex={0}
                                          className="text-red-500 hover:bg-red-100 rounded-full p-1 ml-1 focus:outline-none focus:ring-2 focus:ring-red-400"
                                          title="Eliminar subsección"
                                          onClick={e => { e.stopPropagation(); pedirConfirmarEliminarSubseccion(i, k); }}
                                          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); pedirConfirmarEliminarSubseccion(i, k); } }}
                                        >
                                          <X className="w-4 h-4" />
                                        </span>
                                      </div>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="p-3 bg-white">
                                      {sub.descripcion && <div className="mb-2 text-xs text-gray-700">{sub.descripcion}</div>}
                                      {/* Contenidos de la subsección */}
                                      <ul className="space-y-1">
                                        {sub.contenidos && sub.contenidos.map((cont: any, j: number) => (
                                          <li key={j} className="mb-1">
                                            <div className="border rounded-lg p-3 bg-gray-50 flex flex-col items-start gap-2">
                                              <span className="font-semibold capitalize mb-1">{cont.tipo === 'texto' ? 'Texto' : cont.tipo === 'documento' ? 'Documento' : cont.tipo === 'video' ? 'Video' : 'Imagen'}</span>
                                              {cont.titulo && <span className="text-sm font-medium text-blue-700">{cont.titulo}</span>}
                                              {cont.tipo === 'texto' && (
                                                <span className="text-gray-800 whitespace-pre-line">{cont.valor}</span>
                                              )}
                                              {cont.tipo === 'video' && (
                                                <>
                                                  <video src={cont.valor} controls className="w-full max-w-lg max-h-60 object-contain rounded shadow border" style={{ background: '#000' }} />
                                                  <a href={cont.valor} download className="text-blue-600 underline text-xs mt-1" target="_blank" rel="noopener noreferrer">Descargar video</a>
                                                </>
                                              )}
                                              {cont.tipo === 'imagen' && (
                                                <>
                                                  <div className="w-full flex justify-center">
                                                    <img src={cont.valor} alt="Imagen" className="w-full max-w-lg max-h-60 object-contain rounded shadow border" style={{ background: '#fff' }} />
                                                  </div>
                                                  <a href={cont.valor} download className="text-blue-600 underline text-xs mt-1" target="_blank" rel="noopener noreferrer">Descargar imagen</a>
                                                </>
                                              )}
                                              {cont.tipo === 'documento' && (
                                                <>
                                                  <a href={cont.valor} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-all block max-w-full border rounded px-2 py-1 bg-white hover:bg-gray-100 transition">Ver documento</a>
                                                  <a href={cont.valor} download className="text-blue-600 underline text-xs mt-1" target="_blank" rel="noopener noreferrer">Descargar documento</a>
                                                </>
                                              )}
                                              {/* Botón eliminar contenido */}
                                              <Button variant="ghost" size="icon" className="ml-auto text-red-500 hover:bg-red-100" onClick={() => pedirConfirmarEliminarContenido(i, j, k)} title="Eliminar contenido">
                                                <X className="w-4 h-4" />
                                              </Button>
                                            </div>
                                          </li>
                                        ))}
                                      </ul>
                                      {/* Formulario para agregar contenido a la subsección */}
                                      <div className="flex gap-2 mt-2">
                                        <select value={(inputsContenido[getInputKey(i, k)]?.tipo || 'texto')} onChange={e => handleInputContenidoChange(i, k, 'tipo', e.target.value)} className="border rounded px-2">
                                          <option value="texto">Texto</option>
                                          <option value="documento">Documento</option>
                                          <option value="video">Video</option>
                                          <option value="imagen">Imagen</option>
                                        </select>
                                        {(inputsContenido[getInputKey(i, k)]?.tipo === 'imagen' || inputsContenido[getInputKey(i, k)]?.tipo === 'video' || inputsContenido[getInputKey(i, k)]?.tipo === 'documento') && (
                                          <Input
                                            value={inputsContenido[getInputKey(i, k)]?.titulo || ''}
                                            onChange={e => handleInputContenidoChange(i, k, 'titulo', e.target.value)}
                                            placeholder="Título del archivo"
                                            className="w-40"
                                          />
                                        )}
                                        {(inputsContenido[getInputKey(i, k)]?.tipo === 'imagen' || inputsContenido[getInputKey(i, k)]?.tipo === 'video' || inputsContenido[getInputKey(i, k)]?.tipo === 'documento') ? (
                                          <>
                                            <input type="file"
                                              accept={inputsContenido[getInputKey(i, k)]?.tipo === 'imagen' ? 'image/*' : inputsContenido[getInputKey(i, k)]?.tipo === 'video' ? 'video/*' : '*'}
                                              onChange={e => {
                                                const file = e.target.files?.[0];
                                                if (file) handleFileInputContenido(i, k, file);
                                              }}
                                            />
                                            {previewInputsContenido[getInputKey(i, k)] && inputsContenido[getInputKey(i, k)]?.tipo === 'imagen' && (
                                              <img src={previewInputsContenido[getInputKey(i, k)]} alt="Preview" className="h-10 w-16 object-cover rounded" />
                                            )}
                                            {previewInputsContenido[getInputKey(i, k)] && inputsContenido[getInputKey(i, k)]?.tipo === 'video' && (
                                              <video src={previewInputsContenido[getInputKey(i, k)]} className="h-10 w-16 object-cover rounded" controls />
                                            )}
                                            {previewInputsContenido[getInputKey(i, k)] && inputsContenido[getInputKey(i, k)]?.tipo === 'documento' && (
                                              <a href={previewInputsContenido[getInputKey(i, k)]} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline ml-2">Ver archivo</a>
                                            )}
                                          </>
                                        ) : (
                                          <Input
                                            value={inputsContenido[getInputKey(i, k)]?.valor || ''}
                                            onChange={e => handleInputContenidoChange(i, k, 'valor', e.target.value)}
                                            placeholder={`Agregar ${(inputsContenido[getInputKey(i, k)]?.tipo || 'texto')}`}
                                          />
                                        )}
                                        <Button type="button" onClick={() => handleAgregarContenido(i, k)}>
                                          Agregar
                                        </Button>
                                      </div>
                                    </CollapsibleContent>
                                  </Collapsible>
                                </li>
                              ))}
                            </ul>
                          )}
                          {/* Formulario para agregar subsección SIEMPRE visible al final del módulo */}
                          <div className="flex gap-2 mt-2">
                            <Input
                              value={inputsSubseccion[`mod${i}`] || ''}
                              onChange={e => setInputsSubseccion(prev => ({ ...prev, [`mod${i}`]: e.target.value }))}
                              placeholder="Nombre de la nueva subsección"
                            />
                            <Button type="button" onClick={() => handleAgregarSubseccion(i)}>
                              Agregar subsección
                            </Button>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </li>
                  ))}
                </ul>
                {/* Formulario para agregar módulo/sección */}
                <div className="flex gap-2 mt-4">
                  <Input
                    value={nuevoModulo.nombre}
                    onChange={e => setNuevoModulo({ ...nuevoModulo, nombre: e.target.value })}
                    placeholder="Nombre del módulo/sección"
                  />
                  <Button type="button" onClick={handleAgregarModulo}>
                    Agregar módulo
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
      {/* Modal para crear curso */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear nuevo curso</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="font-medium" htmlFor="nombreCurso">Nombre del curso</label>
            <Input id="nombreCurso" name="nombreCurso" value={form.nombreCurso} onChange={handleChange} placeholder="Nombre del curso" required />
            <label className="font-medium" htmlFor="descripcion">Descripción</label>
            <Textarea id="descripcion" name="descripcion" value={form.descripcion} onChange={handleChange} placeholder="Descripción" required />
            <div className="flex gap-2">
              <div className="flex-1 flex flex-col">
                <label className="font-medium" htmlFor="fechaInicio">Fecha de inicio</label>
                <Input type="date" id="fechaInicio" name="fechaInicio" value={form.fechaInicio} onChange={handleChange} required />
              </div>
              <div className="flex-1 flex flex-col">
                <label className="font-medium" htmlFor="fechaFin">Fecha de fin</label>
                <Input type="date" id="fechaFin" name="fechaFin" value={form.fechaFin} onChange={handleChange} required />
              </div>
            </div>
            <label className="font-medium" htmlFor="foto">Imagen del curso (opcional)</label>
            <div className="flex gap-2 items-center">
              <Input id="foto" name="foto" value={form.foto} onChange={handleChange} placeholder="URL de la imagen (opcional)" className="w-full" />
              <input type="file" accept="image/*" style={{ display: 'none' }} id="foto-file" onChange={handleFotoFileChange} />
              <Button type="button" onClick={() => document.getElementById('foto-file')?.click()}>Subir archivo</Button>
              {previewFoto && <img src={previewFoto} alt="Preview" className="h-12 w-20 object-cover rounded ml-2" />}
            </div>
            <Button type="submit" disabled={saving}>{saving ? 'Creando...' : 'Crear curso'}</Button>
          </form>
        </DialogContent>
      </Dialog>
      {/* Mueve el AlertDialog fuera del Dialog para evitar cierre inesperado del modal principal */}
      <AlertDialog open={!!confirmDialog.type} onOpenChange={open => {
        // Solo cerrar el AlertDialog, nunca el Dialog principal
        if (!open) setTimeout(() => setConfirmDialog({ type: null }), 0);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.type === 'modulo' && '¿Eliminar sección y todo su contenido?'}
              {confirmDialog.type === 'subseccion' && '¿Eliminar subsección y todo su contenido?'}
              {confirmDialog.type === 'contenido' && '¿Eliminar este contenido?'}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              autoFocus
              tabIndex={0}
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                setTimeout(() => setConfirmDialog({ type: null }), 0);
              }}
            >Cancelar</AlertDialogCancel>
            <AlertDialogAction
              tabIndex={0}
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                if (confirmDialog.type === 'modulo' && confirmDialog.modIndex !== undefined) handleEliminarModulo(confirmDialog.modIndex);
                if (confirmDialog.type === 'subseccion' && confirmDialog.modIndex !== undefined && confirmDialog.subIndex !== undefined) handleEliminarSubseccion(confirmDialog.modIndex, confirmDialog.subIndex);
                if (confirmDialog.type === 'contenido' && confirmDialog.modIndex !== undefined && confirmDialog.contIndex !== undefined) handleEliminarContenido(confirmDialog.modIndex, confirmDialog.contIndex, confirmDialog.subIndex);
                setTimeout(() => setConfirmDialog({ type: null }), 0);
              }}
            >Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
