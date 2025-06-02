"use client";

import { useRef, useEffect, useState, createRef } from "react";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Search, X, Upload, User, Plus, ChevronDown, ChevronUp, Trash2, Edit, Eye } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction, AlertDialogDescription } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

interface Curso {
  _id: string;
  id?: string; // Para compatibilidad con Neo4j
  nombreCurso: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  foto?: string;
  estado?: string;
  nombreUsuarioDocente: string;
}

export default function Cursos() {
  const [user, setUser] = useState<{ nombreUsuario: string; _id?: string } | null>(null);
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
  });  const [saving, setSaving] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
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
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    
    // Si es el campo foto (URL), actualizar el preview
    if (name === 'foto') {
      setPreviewFoto(value);
    }
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

  const searchParams = useSearchParams();
  const router = useRouter();

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
  // Auto-abrir diálogo del curso si viene cursoId en la URL
  useEffect(() => {
    if (!searchParams) return;
    const cursoId = searchParams.get('cursoId');
    if (cursoId && cursos.length > 0) {
      const curso = cursos.find(c => c._id === cursoId);
      if (curso) {
        handleCursoClick(curso);
        // Limpiar el parámetro de la URL
        const url = new URL(window.location.href);
        url.searchParams.delete('cursoId');
        router.replace(url.pathname + url.search);
      }
    }
  }, [cursos, searchParams, router]);

  const [selectedCurso, setSelectedCurso] = useState<Curso | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  // Estructura de módulos/secciones por curso (en memoria, para demo; en real, vendría de la API)
  const [modulos, setModulos] = useState<{ [cursoId: string]: any[] }>({});  const [loadingModulos, setLoadingModulos] = useState(false);
  const [nuevoModulo, setNuevoModulo] = useState({ nombre: '', descripcion: '', contenidos: [] as any[] });
  const [nuevoContenido, setNuevoContenido] = useState({ tipo: 'texto', valor: '' });
  const [changingState, setChangingState] = useState(false);
  // Al hacer click en un curso, abrir modal de detalle y cargar módulos desde MongoDB
  const handleCursoClick = async (curso: Curso) => {
    setSelectedCurso(curso);
    setDetailOpen(true);
    setLoadingModulos(true);
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
    } finally {
      setLoadingModulos(false);
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
    
    // Para comentarios, no necesitamos valor, solo título
    if (input.tipo === 'comentarios') {
      if (!input.titulo.trim()) return;
      input.valor = `seccion_comentarios_${Date.now()}`; // ID único para la sección de comentarios
    } else {
      if (!input.valor.trim()) return;
    }
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
    }    // Persistir en MongoDB usando el array actualizado
    try {
      await fetch('/api/mongoDB/cursos/actualizar_modulos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cursoId: selectedCurso._id, modulos: limpiarModulosParaMongo(mods) })
      });

      // Si es una sección de comentarios, crear también en Neo4j
      if (input.tipo === 'comentarios') {
        await crearSeccionComentarios(input.titulo, input.valor);
      }

      // Recargar módulos desde la base para evitar duplicados
      const res = await fetch('/api/mongoDB/cursos/get_cursos');
      const data = await res.json();
      const cursoDB = (data.cursos || []).find((c: any) => c._id === selectedCurso._id);
      setModulos((prev) => ({
        ...prev,
        [selectedCurso._id]: cursoDB?.contenido || []
      }));
    } catch (e) {
      console.error('Error al agregar contenido:', e);
    }
    setInputsContenido((prev) => ({ ...prev, [key]: { tipo: 'texto', valor: '', titulo: '' } }));  };

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
  // Estados para comentarios
  const [comentarios, setComentarios] = useState<{ [seccionId: string]: any[] }>({});
  const [loadingComentarios, setLoadingComentarios] = useState<{ [seccionId: string]: boolean }>({});
  const [nuevoComentario, setNuevoComentario] = useState<{ [seccionId: string]: string }>({});

  // Función para cargar comentarios de una sección
  const cargarComentarios = async (seccionId: string) => {
    if (!selectedCurso) return;
    
    setLoadingComentarios(prev => ({ ...prev, [seccionId]: true }));
    try {
      const res = await fetch(`/api/neo4jDB/comentarios-seccion?seccionId=${seccionId}&cursoId=${selectedCurso.id || selectedCurso._id}`);
      const data = await res.json();
      
      if (res.ok) {
        setComentarios(prev => ({ ...prev, [seccionId]: data.comentarios || [] }));
      } else {
        console.error('Error al cargar comentarios:', data.error);
        setComentarios(prev => ({ ...prev, [seccionId]: [] }));
      }
    } catch (e) {
      console.error('Error al cargar comentarios:', e);
      setComentarios(prev => ({ ...prev, [seccionId]: [] }));
    } finally {
      setLoadingComentarios(prev => ({ ...prev, [seccionId]: false }));
    }
  };

  // Función para agregar un comentario
  const agregarComentario = async (seccionId: string) => {
    const texto = nuevoComentario[seccionId]?.trim();
    if (!texto || !user || !selectedCurso) return;

    try {
      const res = await fetch('/api/neo4jDB/agregar-comentario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },        body: JSON.stringify({
          seccionId,
          cursoId: selectedCurso.id || selectedCurso._id,
          usuarioId: user._id || user.nombreUsuario, // Usar nombreUsuario como fallback
          texto
        })
      });

      if (res.ok) {
        // Recargar comentarios
        await cargarComentarios(seccionId);
        // Limpiar input
        setNuevoComentario(prev => ({ ...prev, [seccionId]: '' }));
      } else {
        const data = await res.json();
        console.error('Error al agregar comentario:', data.error);
      }
    } catch (e) {
      console.error('Error al agregar comentario:', e);
    }
  };  // Función para crear una nueva sección de comentarios (solo docentes)
  const crearSeccionComentarios = async (titulo: string, seccionId: string) => {
    if (!user || !selectedCurso) return;

    try {
      const res = await fetch('/api/neo4jDB/gestionar-secciones-comentarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },        body: JSON.stringify({
          seccionId,
          cursoId: selectedCurso.id || selectedCurso._id,
          titulo,
          docenteId: user._id || user.nombreUsuario // Usar nombreUsuario como fallback
        })
      });

      if (res.ok) {
        console.log('Sección de comentarios creada exitosamente');
      } else {
        const data = await res.json();
        console.error('Error al crear sección de comentarios:', data.error);
      }
    } catch (e) {
      console.error('Error al crear sección de comentarios:', e);
    }
  };

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
    foto: '',
    estado: 'Activo'
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
        foto: selectedCurso.foto || '',
        estado: selectedCurso.estado || 'Activo'
      });
      setPreviewEditFoto(selectedCurso.foto || "");
      setFileEditFoto(null);
    }
  }, [selectedCurso]);

  // Estado para preview de imagen de curso
  const [previewFoto, setPreviewFoto] = useState<string>("");  const handleFotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen válida');
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no puede ser mayor a 5MB');
      return;
    }

    try {
      setUploadingFoto(true);
      
      // Crear vista previa
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewFoto(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Subir archivo
      const url = await uploadArchivo(file);
      setForm(f => ({ ...f, foto: url }));
    } catch (error: any) {
      alert(error.message || 'Error al subir la imagen');
      setPreviewFoto("");
    } finally {
      setUploadingFoto(false);
    }
  };

  // Función para obtener el color del badge según el estado
  const getBadgeVariant = (estado: string) => {
    switch (estado) {
      case 'Publicado':
        return 'default'; // Verde
      case 'Activo':
        return 'secondary'; // Gris
      case 'Inactivo':
        return 'destructive'; // Rojo
      default:
        return 'secondary';
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
                </CardHeader>                <CardContent className="flex-1 flex flex-col justify-between">
                  <p className="text-sm text-muted-foreground mb-2">{curso.descripcion}</p>
                  <div className="mt-auto">
                    <Badge variant={getBadgeVariant(curso.estado || 'Activo')}>
                      {curso.estado || 'Edición'}
                    </Badge>
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
            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">              <div>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-xl font-bold">{selectedCurso.nombreCurso}</h2>
                  <Badge variant={getBadgeVariant(selectedCurso.estado || 'Activo')}>
                    {selectedCurso.estado || 'Edición'}
                  </Badge>
                </div>
                <p className="mb-2 text-gray-700"><span className="font-semibold">Descripción:</span> {selectedCurso.descripcion}</p>
                <div className="mb-2 text-gray-700"><span className="font-semibold">Fecha inicio:</span> {selectedCurso.fechaInicio}</div>
                <div className="mb-2 text-gray-700"><span className="font-semibold">Fecha fin:</span> {selectedCurso.fechaFin}</div>
              </div>
              {selectedCurso.foto && (
                <div className="flex items-center justify-center">
                  <Image src={selectedCurso.foto} alt={selectedCurso.nombreCurso} width={320} height={180} className="rounded-md object-cover max-h-40 w-full" />
                </div>
              )}
            </div>            {/* Formulario de edición rápida */}
            <div className="flex flex-wrap gap-4 mb-4 items-end">
              {/* Formulario de edición rápida */}              <form className="flex flex-wrap gap-2 items-end" onSubmit={async e => {
                e.preventDefault();
                if (!selectedCurso) return;
                setChangingState(true);
                try {
                  let fotoUrl = editForm.foto;
                  if (fileEditFoto) {
                    fotoUrl = await uploadArchivo(fileEditFoto);
                  }
                  
                  // Actualizar curso en MongoDB
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
                  
                  // Si el estado cambió, también actualizarlo
                  if (editForm.estado !== selectedCurso.estado) {
                    await fetch(`/api/redisDB/cambiarEstadoCurso/${selectedCurso._id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ estado: editForm.estado }),
                    });
                  }
                  
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
                  <label className="block text-sm font-medium text-muted-foreground mb-1" htmlFor="edit-nombreCurso">Título del curso</label>
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
                  <label className="block text-sm font-medium text-muted-foreground mb-1" htmlFor="edit-descripcion">Descripción</label>
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
                  <label className="block text-sm font-medium text-muted-foreground mb-1" htmlFor="edit-fechaInicio">Fecha de inicio</label>
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
                  <label className="block text-sm font-medium text-muted-foreground mb-1" htmlFor="edit-fechaFin">Fecha de fin</label>
                  <Input
                    id="edit-fechaFin"
                    type="date"
                    className="w-36"
                    value={editForm.fechaFin}
                    onChange={e => setEditForm(f => ({ ...f, fechaFin: e.target.value }))}
                    required
                  />
                </div>                <div className="flex flex-col">
                  <label className="block text-sm font-medium text-muted-foreground mb-1" htmlFor="edit-fechaFin">Fecha de fin</label>
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
                  <label className="block text-sm font-medium text-muted-foreground mb-1" htmlFor="edit-estado">Estado</label>
                  <select
                    id="edit-estado"
                    className="w-32 h-10 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={editForm.estado}
                    onChange={e => setEditForm(f => ({ ...f, estado: e.target.value }))}
                  >
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                    <option value="Publicado">Publicado</option>
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="block text-sm font-medium text-muted-foreground mb-1" htmlFor="edit-foto">Imagen del curso</label>
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
                </div>                <Button type="submit" disabled={changingState} className="bg-blue-600 hover:bg-blue-700 text-white mt-5">
                  {changingState ? 'Guardando...' : 'Guardar cambios'}
                </Button>
              </form>
            </div>
            {/* Scroll para módulos/secciones y subsecciones */}
            <ScrollArea className="h-[60vh] w-full pr-2">
              <div className="mb-4">                <h3 className="font-semibold mb-2">Módulos/Secciones</h3>
                {loadingModulos ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="border rounded p-4">
                        <div className="flex justify-between items-center mb-3">
                          <Skeleton className="h-5 w-1/3" />
                          <Skeleton className="h-4 w-20" />
                        </div>
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-2/3" />
                      </div>
                    ))}
                  </div>
                ) : (
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
                          {mod.descripcion && <div className="mb-2 text-sm text-gray-700">{mod.descripcion}</div>}                          {/* Contenidos de la sección principal primero */}
                          <ul className="space-y-1">
                            {mod.contenidos && mod.contenidos.map((cont: any, j: number) => (
                              <li key={j} className="mb-4">
                                <div className="border rounded-lg p-3 bg-gray-50 flex flex-col items-start gap-2">
                                  <span className="font-semibold capitalize mb-1">
                                    {cont.tipo === 'texto' ? 'Texto' : 
                                     cont.tipo === 'documento' ? 'Documento' : 
                                     cont.tipo === 'video' ? 'Video' : 
                                     cont.tipo === 'imagen' ? 'Imagen' :
                                     cont.tipo === 'comentarios' ? 'Comentarios' : 'Desconocido'}
                                  </span>
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
                                  )}                                  {cont.tipo === 'documento' && (
                                    <>
                                      <a href={cont.valor} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-all block max-w-full border rounded px-2 py-1 bg-white hover:bg-gray-100 transition">Ver documento</a>
                                      <a href={cont.valor} download className="text-blue-600 underline text-xs mt-1" target="_blank" rel="noopener noreferrer">Descargar documento</a>
                                    </>
                                  )}                                  {cont.tipo === 'comentarios' && (
                                    <div className="w-full border rounded-lg bg-white">
                                      <div className="p-3 border-b bg-gray-50">
                                        <h4 className="font-medium text-gray-800">💬 {cont.titulo}</h4>
                                        <p className="text-sm text-gray-600">Los estudiantes pueden comentar aquí</p>
                                      </div>
                                      
                                      {/* Área de comentarios con scroll */}
                                      <ScrollArea className="h-[300px] p-3">
                                        {loadingComentarios[cont.valor] ? (
                                          <div className="flex justify-center items-center h-20">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                          </div>
                                        ) : comentarios[cont.valor]?.length > 0 ? (
                                          <div className="space-y-3">
                                            {comentarios[cont.valor].map((comentario: any, idx: number) => (
                                              <div key={idx} className="border-l-4 border-blue-200 pl-3 py-2 bg-gray-50 rounded">
                                                <div className="flex items-center gap-2 mb-1">
                                                  <span className="font-medium text-sm text-blue-700">{comentario.autor}</span>
                                                  <span className="text-xs text-gray-500">
                                                    {new Date(comentario.fecha).toLocaleDateString()} - {new Date(comentario.fecha).toLocaleTimeString()}
                                                  </span>
                                                </div>
                                                <p className="text-sm text-gray-700">{comentario.texto}</p>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <div className="text-center text-gray-500 py-8">
                                            <p>No hay comentarios aún</p>
                                            <Button 
                                              variant="outline" 
                                              size="sm" 
                                              className="mt-2"
                                              onClick={() => cargarComentarios(cont.valor)}
                                            >
                                              Cargar comentarios
                                            </Button>
                                          </div>
                                        )}
                                      </ScrollArea>
                                      
                                      {/* Formulario para agregar comentario */}
                                      <div className="p-3 border-t bg-gray-50">
                                        <div className="flex gap-2">
                                          <Input
                                            placeholder="Escribe un comentario..."
                                            value={nuevoComentario[cont.valor] || ''}
                                            onChange={(e) => setNuevoComentario(prev => ({ 
                                              ...prev, 
                                              [cont.valor]: e.target.value 
                                            }))}
                                            onKeyPress={(e) => {
                                              if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                agregarComentario(cont.valor);
                                              }
                                            }}
                                          />
                                          <Button 
                                            size="sm" 
                                            onClick={() => agregarComentario(cont.valor)}
                                            disabled={!nuevoComentario[cont.valor]?.trim()}
                                          >
                                            Enviar
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
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
                          <div className="flex gap-2 mt-2">                            <select value={(inputsContenido[getInputKey(i)]?.tipo || 'texto')} onChange={e => handleInputContenidoChange(i, undefined, 'tipo', e.target.value)} className="border rounded px-2">
                              <option value="texto">Texto</option>
                              <option value="documento">Documento</option>
                              <option value="video">Video</option>
                              <option value="imagen">Imagen</option>
                              <option value="comentarios">Comentarios</option>
                            </select>
                            {(inputsContenido[getInputKey(i)]?.tipo === 'imagen' || inputsContenido[getInputKey(i)]?.tipo === 'video' || inputsContenido[getInputKey(i)]?.tipo === 'documento' || inputsContenido[getInputKey(i)]?.tipo === 'comentarios') && (
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
                                              <span className="font-semibold capitalize mb-1">
                                                {cont.tipo === 'texto' ? 'Texto' : 
                                                 cont.tipo === 'documento' ? 'Documento' : 
                                                 cont.tipo === 'video' ? 'Video' : 
                                                 cont.tipo === 'imagen' ? 'Imagen' :
                                                 cont.tipo === 'comentarios' ? 'Comentarios' : 'Desconocido'}
                                              </span>
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
                                              )}                                              {cont.tipo === 'documento' && (
                                                <>
                                                  <a href={cont.valor} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-all block max-w-full border rounded px-2 py-1 bg-white hover:bg-gray-100 transition">Ver documento</a>
                                                  <a href={cont.valor} download className="text-blue-600 underline text-xs mt-1" target="_blank" rel="noopener noreferrer">Descargar documento</a>
                                                </>
                                              )}
                                              {cont.tipo === 'comentarios' && (
                                                <div className="w-full border rounded-lg bg-white">
                                                  <div className="p-3 border-b bg-gray-50">
                                                    <h4 className="font-medium text-gray-800">💬 Sección de Comentarios</h4>
                                                    <p className="text-sm text-gray-600">Los estudiantes pueden comentar aquí</p>
                                                  </div>
                                                  
                                                  {/* Área de comentarios con scroll */}
                                                  <ScrollArea className="h-[300px] p-3">
                                                    {loadingComentarios[cont.valor] ? (
                                                      <div className="flex justify-center items-center h-20">
                                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                                      </div>
                                                    ) : comentarios[cont.valor]?.length > 0 ? (
                                                      <div className="space-y-3">
                                                        {comentarios[cont.valor].map((comentario: any, idx: number) => (
                                                          <div key={idx} className="border-l-4 border-blue-200 pl-3 py-2 bg-gray-50 rounded">
                                                            <div className="flex items-center gap-2 mb-1">
                                                              <span className="font-medium text-sm text-blue-700">{comentario.autor}</span>
                                                              <span className="text-xs text-gray-500">
                                                                {new Date(comentario.fecha).toLocaleDateString()} - {new Date(comentario.fecha).toLocaleTimeString()}
                                                              </span>
                                                            </div>
                                                            <p className="text-sm text-gray-700">{comentario.texto}</p>
                                                          </div>
                                                        ))}
                                                      </div>
                                                    ) : (
                                                      <div className="text-center text-gray-500 py-8">
                                                        <p>No hay comentarios aún</p>
                                                        <Button 
                                                          variant="outline" 
                                                          size="sm" 
                                                          className="mt-2"
                                                          onClick={() => cargarComentarios(cont.valor)}
                                                        >
                                                          Cargar comentarios
                                                        </Button>
                                                      </div>
                                                    )}
                                                  </ScrollArea>
                                                  
                                                  {/* Formulario para agregar comentario */}
                                                  <div className="p-3 border-t bg-gray-50">
                                                    <div className="flex gap-2">
                                                      <Input
                                                        placeholder="Escribe un comentario..."
                                                        value={nuevoComentario[cont.valor] || ''}
                                                        onChange={(e) => setNuevoComentario(prev => ({ 
                                                          ...prev, 
                                                          [cont.valor]: e.target.value 
                                                        }))}
                                                        onKeyPress={(e) => {
                                                          if (e.key === 'Enter' && !e.shiftKey) {
                                                            e.preventDefault();
                                                            agregarComentario(cont.valor);
                                                          }
                                                        }}
                                                      />
                                                      <Button 
                                                        size="sm" 
                                                        onClick={() => agregarComentario(cont.valor)}
                                                        disabled={!nuevoComentario[cont.valor]?.trim()}
                                                      >
                                                        Enviar
                                                      </Button>
                                                    </div>
                                                  </div>
                                                </div>
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
                                      <div className="flex gap-2 mt-2">                                        <select value={(inputsContenido[getInputKey(i, k)]?.tipo || 'texto')} onChange={e => handleInputContenidoChange(i, k, 'tipo', e.target.value)} className="border rounded px-2">
                                          <option value="texto">Texto</option>
                                          <option value="documento">Documento</option>
                                          <option value="video">Video</option>
                                          <option value="imagen">Imagen</option>
                                          <option value="comentarios">Comentarios</option>
                                        </select>                                        {(inputsContenido[getInputKey(i, k)]?.tipo === 'imagen' || inputsContenido[getInputKey(i, k)]?.tipo === 'video' || inputsContenido[getInputKey(i, k)]?.tipo === 'documento' || inputsContenido[getInputKey(i, k)]?.tipo === 'comentarios') && (
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
                      </Collapsible>                    </li>
                  ))}
                </ul>
                )}
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
      </div>      {/* Modal para crear curso */}
      <Dialog open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
          // Reset form and preview when dialog closes
          setForm({
            nombreCurso: '',
            descripcion: '',
            fechaInicio: '',
            fechaFin: '',
            foto: '',
            estado: 'Activo',
          });
          setPreviewFoto("");
          const fileInput = document.getElementById('foto-file') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
        }
      }}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear nuevo curso</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Información básica */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1" htmlFor="nombreCurso">
                  Nombre del curso
                </label>
                <Input 
                  id="nombreCurso" 
                  name="nombreCurso" 
                  value={form.nombreCurso} 
                  onChange={handleChange} 
                  placeholder="Ej: Introducción a JavaScript" 
                  required 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1" htmlFor="descripcion">
                  Descripción
                </label>
                <Textarea 
                  id="descripcion" 
                  name="descripcion" 
                  value={form.descripcion} 
                  onChange={handleChange} 
                  placeholder="Describe de qué trata el curso..." 
                  rows={3}
                  required 
                />
              </div>
              
              {/* Fechas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1" htmlFor="fechaInicio">
                    Fecha de inicio
                  </label>
                  <Input 
                    type="date" 
                    id="fechaInicio" 
                    name="fechaInicio" 
                    value={form.fechaInicio} 
                    onChange={handleChange} 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1" htmlFor="fechaFin">
                    Fecha de fin
                  </label>
                  <Input 
                    type="date" 
                    id="fechaFin" 
                    name="fechaFin" 
                    value={form.fechaFin} 
                    onChange={handleChange} 
                    required 
                  />
                </div>
              </div>
              
              {/* Imagen del curso */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Imagen del curso
                </label>
                
                <div className="flex flex-col items-center space-y-3">
                  {/* Vista previa de la imagen */}
                  <div className="relative">
                    <div className="w-32 h-20 rounded-lg border-2 border-gray-200 overflow-hidden bg-gray-50">
                      {previewFoto ? (
                        <Image 
                          src={previewFoto} 
                          alt="Vista previa" 
                          width={128}
                          height={80}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Upload className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                    
                    {previewFoto && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0"                        onClick={() => {
                          setPreviewFoto("");
                          setForm({ ...form, foto: '' });
                          // Reset file input
                          const fileInput = document.getElementById('foto-file') as HTMLInputElement;
                          if (fileInput) fileInput.value = '';
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>

                  {/* Área de subida */}
                  <div className="w-full space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="foto-file"
                      onChange={handleFotoFileChange}
                      disabled={uploadingFoto}
                    />
                    <label
                      htmlFor="foto-file"
                      className="w-full h-16 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors bg-gray-50 hover:bg-gray-100"
                    >
                      <Upload className="h-4 w-4 text-gray-400 mb-1" />
                      <span className="text-xs text-gray-600">
                        {uploadingFoto ? 'Subiendo...' : 'Subir imagen'}
                      </span>
                      <span className="text-xs text-gray-400">
                        JPG, PNG, WebP (máx. 5MB)
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Botones */}
            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={saving || uploadingFoto}
              >
                {saving ? 'Creando...' : 'Crear curso'}
              </Button>
            </DialogFooter>
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
