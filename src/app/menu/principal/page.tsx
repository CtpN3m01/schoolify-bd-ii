'use client';

import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext } from "@/components/ui/pagination";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

// Tipo para los cursos
// Adaptado a los datos reales de la base
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

export default function Principal() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const cursosPerPage = 6;  const [selectedCurso, setSelectedCurso] = useState<Curso | null>(null);  const [detailOpen, setDetailOpen] = useState(false);
  const [modulos, setModulos] = useState<any[]>([]);
  const [loadingModulos, setLoadingModulos] = useState(false);
  const [evaluaciones, setEvaluaciones] = useState<any[]>([]);
  const [loadingEvaluaciones, setLoadingEvaluaciones] = useState(false);
  const [estudiantes, setEstudiantes] = useState<any[]>([]);
  const [loadingEstudiantes, setLoadingEstudiantes] = useState(false);  const [activeTab, setActiveTab] = useState('modulos');
  const [evaluacionEnCurso, setEvaluacionEnCurso] = useState<any>(null);
  const [respuestasEvaluacion, setRespuestasEvaluacion] = useState<number[]>([]);
  const [loadingRespuesta, setLoadingRespuesta] = useState(false);
  const [resultadosEvaluaciones, setResultadosEvaluaciones] = useState<any[]>([]);
  const [openModulo, setOpenModulo] = useState<number | null>(null);
  const [openSubseccion, setOpenSubseccion] = useState<{ mod: number; sub: number } | null>(null);
  const [evaluacionDialogOpen, setEvaluacionDialogOpen] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();useEffect(() => {
    const fetchCursosMatriculados = async () => {
      try {
        const userRes = await fetch("/api/auth/me");
        const userData = await userRes.json();
        const userId = userData?.user?._id || userData?.user?.id || userData?.user?.nombreUsuario;
        if (!userId) {
          setCursos([]);
          setLoading(false);
          return;
        }
        const response = await fetch(`/api/neo4jDB/cursos-matriculados?userId=${userId}`);
        const result = await response.json();
        setCursos(result.cursos || []);
        setLoading(false);
      } catch (error) {
        setCursos([]);
        setLoading(false);
      }
    };
    fetchCursosMatriculados();
  }, []);  // Efecto para abrir automáticamente el diálogo del curso si viene de otra página
  useEffect(() => {
    if (!searchParams) return;
    const cursoId = searchParams.get('cursoId');
    console.log('Curso ID from URL:', cursoId); // Debug log
    if (cursoId && cursos.length > 0) {
      const curso = cursos.find(c => c._id === cursoId);
      console.log('Found curso:', curso); // Debug log
      if (curso) {
        handleCursoClick(curso);
        // Limpiar el parámetro de la URL
        const url = new URL(window.location.href);
        url.searchParams.delete('cursoId');
        window.history.replaceState({}, '', url);
      }
    }
  }, [cursos, searchParams]);

  // Filtrar cursos según término de búsqueda
  const cursosFiltrados = cursos.filter(curso =>
    curso.nombreCurso.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Cálculo para la paginación
  const indexOfLastCurso = currentPage * cursosPerPage;
  const indexOfFirstCurso = indexOfLastCurso - cursosPerPage;
  const currentCursos = cursosFiltrados.slice(indexOfFirstCurso, indexOfLastCurso);
  const totalPages = Math.ceil(cursosFiltrados.length / cursosPerPage);

  // Cambiar página
  const goToPage = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };  // Al hacer click en un curso, abrir modal de detalle y cargar módulos, evaluaciones y estudiantes
  const handleCursoClick = async (curso: Curso) => {
    setSelectedCurso(curso);
    setDetailOpen(true);
    setLoadingModulos(true);
    setLoadingEvaluaciones(true);
    setLoadingEstudiantes(true);
    
    // Cargar módulos/secciones desde el campo contenido
    try {
      const res = await fetch('/api/mongoDB/cursos/get_cursos');
      const data = await res.json();
      const cursoDB = (data.cursos || []).find((c: any) => c._id === curso._id);
      setModulos(cursoDB?.contenido || []);
    } catch (e) {
      setModulos([]);
    } finally {
      setLoadingModulos(false);
    }    // Cargar evaluaciones del curso
    try {
      const res = await fetch(`/api/cassandraDB/evaluaciones?curso=${curso._id}`);
      const data = await res.json();
      setEvaluaciones(data.evaluaciones || []);
    } catch (e) {
      setEvaluaciones([]);
    } finally {
      setLoadingEvaluaciones(false);
    }

    // Cargar resultados de evaluaciones del usuario
    try {
      const userRes = await fetch("/api/auth/me");
      const userData = await userRes.json();
      const userId = userData?.user?._id || userData?.user?.id || userData?.user?.nombreUsuario;
      
      if (userId) {
        const res = await fetch(`/api/cassandraDB/evaluaciones?resultados=1&idEstudiante=${userId}&idCurso=${curso._id}`);
        const data = await res.json();
        setResultadosEvaluaciones(data.resultados || []);
      }
    } catch (e) {
      setResultadosEvaluaciones([]);
    }

    // Cargar estudiantes matriculados
    try {
      const res = await fetch(`/api/neo4jDB/estudiantes-matriculados?cursoId=${curso._id}`);
      const data = await res.json();
      setEstudiantes(data.estudiantes || []);
    } catch (e) {
      setEstudiantes([]);
    } finally {
      setLoadingEstudiantes(false);
    }
  };
  // Utilidad para formatear fechas Neo4j o string
  function formatNeo4jDate(date: any) {
    if (!date) return "";
    if (typeof date === "string") return date;
    if (typeof date === "object" && 'year' in date && 'month' in date && 'day' in date) {
      // Neo4j date object: {year, month, day} (could be integers or objects)
      const getVal = (v: any) => (typeof v === 'object' && v !== null && 'low' in v) ? v.low : v;
      const year = getVal(date.year);
      const month = String(getVal(date.month)).padStart(2, "0");
      const day = String(getVal(date.day)).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
    return "";
  }
  // Funciones para manejar evaluaciones
  const iniciarEvaluacion = (evaluacion: any) => {
    setEvaluacionEnCurso(evaluacion);
    setRespuestasEvaluacion(new Array(evaluacion.preguntas?.length || 0).fill(-1));
    setEvaluacionDialogOpen(true);
  };

  const cerrarEvaluacion = () => {
    setEvaluacionEnCurso(null);
    setRespuestasEvaluacion([]);
    setEvaluacionDialogOpen(false);
  };

  const seleccionarRespuesta = (preguntaIndex: number, respuesta: number) => {
    setRespuestasEvaluacion(prev => {
      const nuevas = [...prev];
      nuevas[preguntaIndex] = respuesta;
      return nuevas;
    });
  };
  const enviarEvaluacion = async () => {
    if (!evaluacionEnCurso || !selectedCurso) return;
    
    setLoadingRespuesta(true);
    try {
      // Obtener datos del usuario actual
      const userRes = await fetch("/api/auth/me");
      const userData = await userRes.json();
      const userId = userData?.user?._id || userData?.user?.id || userData?.user?.nombreUsuario;
      
      const res = await fetch('/api/cassandraDB/evaluaciones?responder=1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idEvaluacion: evaluacionEnCurso.id,
          idEstudiante: userId,
          respuestas: respuestasEvaluacion,
          preguntas: evaluacionEnCurso.preguntas
        })
      });

      if (res.ok) {
        const data = await res.json();
        
        // Recargar resultados
        try {
          const resResultados = await fetch(`/api/cassandraDB/evaluaciones?resultados=1&idEstudiante=${userId}&idCurso=${selectedCurso._id}`);
          const dataResultados = await resResultados.json();
          setResultadosEvaluaciones(dataResultados.resultados || []);
        } catch (e) {
          console.error('Error al recargar resultados:', e);
        }
          cerrarEvaluacion();
        // Mostrar toast de éxito
        toast.success(`¡Evaluación enviada exitosamente!`, {
          description: `Calificación obtenida: ${data.calificacion?.toFixed(2)}%`,
          duration: 5000,
        });
      } else {
        toast.error('Error al enviar la evaluación');
      }
    } catch (error) {
      toast.error('Error al procesar la evaluación');
    } finally {
      setLoadingRespuesta(false);
    }
  };

  // Función para verificar si una evaluación ya fue realizada
  const evaluacionYaRealizada = (evaluacionId: string) => {
    return resultadosEvaluaciones.some(resultado => resultado.idevaluacion === evaluacionId);
  };

  // Función para obtener el resultado de una evaluación
  const obtenerResultadoEvaluacion = (evaluacionId: string) => {
    return resultadosEvaluaciones.find(resultado => resultado.idevaluacion === evaluacionId);
  };

  // Renderizado de los cursos
  return (
    <div className="grid grid-rows-[auto_1fr_auto] items-start min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <header className="flex justify-between items-center">
        <div className="text-left">
          <h1 className="text-2xl font-bold">Mis cursos</h1>
          <p className="text-muted-foreground">Estos son los cursos en los que estás matriculado</p>
        </div>
        <div className="relative w-64">
          <Input 
            type="text" 
            placeholder="Buscar en mis cursos..." 
            className="pl-10 pr-4 py-2 rounded-md border border-input bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
      </header>      <main className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
        {loading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="h-full flex flex-col">
              <Skeleton className="h-48 w-full rounded-t-md" />
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between">
                <div className="space-y-2 mb-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : cursosFiltrados.length === 0 ? (
          <div className="col-span-full text-center">No hay cursos disponibles.</div>
        ) : (
          currentCursos.map((curso) => (
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
                  Docente: {curso.nombreUsuarioDocente}
                </div>
                <div className="text-xs text-gray-500">Inicio: {formatNeo4jDate(curso.fechaInicio)}</div>
                <div className="text-xs text-gray-500">Fin: {formatNeo4jDate(curso.fechaFin)}</div>
              </CardContent>
            </Card>
          ))
        )}
      </main>
      {cursosFiltrados.length > 0 && (
        <footer className="w-full flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationPrevious 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage > 1) goToPage(currentPage - 1);
                }}
                className={currentPage === 1 ? "opacity-50 pointer-events-none" : ""}
              />
              
              {Array.from({ length: totalPages }).map((_, index) => (
                <PaginationItem key={index}>
                  <PaginationLink 
                    href="#" 
                    isActive={currentPage === index + 1}
                    onClick={(e) => {
                      e.preventDefault();
                      goToPage(index + 1);
                    }}
                  >
                    {index + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}
              
              <PaginationNext 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage < totalPages) goToPage(currentPage + 1);
                }}
                className={currentPage === totalPages ? "opacity-50 pointer-events-none" : ""}
              />
            </PaginationContent>
          </Pagination>
        </footer>
      )}      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-full w-[96vw] h-[90vh]">
          <DialogHeader>
            <DialogTitle>Detalle del Curso</DialogTitle>
          </DialogHeader>
          {selectedCurso && (
            <div className="flex flex-col h-full">
              {/* Información básica del curso */}
              <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h2 className="text-xl font-bold mb-2">{selectedCurso.nombreCurso}</h2>
                  <p className="mb-2 text-gray-700"><span className="font-semibold">Descripción:</span> {selectedCurso.descripcion}</p>
                  <div className="mb-2 text-gray-700"><span className="font-semibold">Fecha inicio:</span> {formatNeo4jDate(selectedCurso.fechaInicio)}</div>
                  <div className="mb-2 text-gray-700"><span className="font-semibold">Fecha fin:</span> {formatNeo4jDate(selectedCurso.fechaFin)}</div>
                  <div className="mb-2 text-gray-700"><span className="font-semibold">Docente:</span> {selectedCurso.nombreUsuarioDocente}</div>
                  <div className="mb-2 text-gray-700"><span className="font-semibold">Estado:</span> <span className="font-semibold">{selectedCurso.estado || 'Publicado'}</span></div>
                </div>
                {selectedCurso.foto && (
                  <div className="flex items-center justify-center">
                    <Image src={selectedCurso.foto} alt={selectedCurso.nombreCurso} width={320} height={180} className="rounded-md object-cover max-h-40 w-full" />
                  </div>
                )}
              </div>

              {/* Estado de matrícula */}
              <div className="flex flex-wrap gap-4 mb-4 items-end">
                <Button className="bg-green-600 hover:bg-green-700 text-white" disabled>
                  Matriculado
                </Button>
              </div>

              {/* Interfaz con tabs */}
              <Tabs defaultValue="modulos" className="flex-1 flex flex-col" onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="modulos">Módulos/Secciones</TabsTrigger>
                  <TabsTrigger value="evaluaciones">Evaluaciones</TabsTrigger>
                  <TabsTrigger value="estudiantes">Estudiantes</TabsTrigger>
                </TabsList>

                {/* Tab de Módulos/Secciones */}
                <TabsContent value="modulos" className="flex-1 mt-4">
                  <ScrollArea className="h-full w-full pr-2">
                    <div className="mb-4">
                      <h3 className="font-semibold mb-2">Contenido del Curso</h3>
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
                      ) : modulos.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          No hay módulos disponibles para este curso.
                        </div>
                      ) : (
                        <ul className="mb-2 space-y-2">
                          {modulos.map((mod, i) => (
                            <li key={i} className="border rounded">
                              <Collapsible open={openModulo === i} onOpenChange={open => setOpenModulo(open ? i : null)}>
                                <CollapsibleTrigger className="w-full flex justify-between items-center px-4 py-2 cursor-pointer bg-gray-100 rounded-t">
                                  <span className="font-medium">{mod.nombre}</span>
                                  <span className="text-xs text-gray-500">Abrir/Cerrar</span>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="p-4 space-y-2 bg-white">
                                  {mod.descripcion && <div className="mb-2 text-sm text-gray-700">{mod.descripcion}</div>}
                                  <ScrollArea className="max-h-[20vh] w-full pr-2">
                                    <ul className="space-y-1">
                                      {mod.contenidos && mod.contenidos.map((cont: any, j: number) => (
                                        <li key={j} className="mb-1">
                                          <span className="font-semibold capitalize">{cont.tipo}:</span> {cont.valor}
                                          {cont.tipo === 'video' && (
                                            <div className="mt-1"><video src={cont.valor} controls className="w-full max-h-48" /></div>
                                          )}
                                          {cont.tipo === 'imagen' && (
                                            <div className="mt-1"><img src={cont.valor} alt="Imagen" className="w-full max-h-48 object-contain" /></div>
                                          )}
                                          {cont.tipo === 'documento' && (
                                            <div className="mt-1"><a href={cont.valor} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Ver documento</a></div>
                                          )}
                                        </li>
                                      ))}
                                    </ul>
                                  </ScrollArea>
                                  {mod.subsecciones && mod.subsecciones.length > 0 && (
                                    <ScrollArea className="max-h-[30vh] w-full pr-2">
                                      <ul className="mb-2 ml-4 space-y-2">
                                        {mod.subsecciones.map((sub: any, k: number) => (
                                          <li key={k} className="border rounded">
                                            <Collapsible open={openSubseccion?.mod === i && openSubseccion?.sub === k} onOpenChange={open => setOpenSubseccion(open ? { mod: i, sub: k } : null)}>
                                              <CollapsibleTrigger className="w-full flex justify-between items-center px-3 py-1 cursor-pointer bg-gray-50 rounded-t">
                                                <span className="font-medium">{sub.nombre}</span>
                                                <span className="text-xs text-gray-500">Abrir/Cerrar</span>
                                              </CollapsibleTrigger>
                                              <CollapsibleContent className="p-3 bg-white">
                                                {sub.descripcion && <div className="mb-2 text-xs text-gray-700">{sub.descripcion}</div>}
                                                <ScrollArea className="max-h-[20vh] w-full pr-2">
                                                  <ul className="space-y-1">
                                                    {sub.contenidos && sub.contenidos.map((cont: any, j: number) => (
                                                      <li key={j} className="mb-1">
                                                        <span className="font-semibold capitalize">{cont.tipo}:</span> {cont.valor}
                                                        {cont.tipo === 'video' && (
                                                          <div className="mt-1"><video src={cont.valor} controls className="w-full max-h-48" /></div>
                                                        )}
                                                        {cont.tipo === 'imagen' && (
                                                          <div className="mt-1"><img src={cont.valor} alt="Imagen" className="w-full max-h-48 object-contain" /></div>
                                                        )}
                                                        {cont.tipo === 'documento' && (
                                                          <div className="mt-1"><a href={cont.valor} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Ver documento</a></div>
                                                        )}
                                                      </li>
                                                    ))}
                                                  </ul>
                                                </ScrollArea>
                                              </CollapsibleContent>
                                            </Collapsible>
                                          </li>
                                        ))}
                                      </ul>
                                    </ScrollArea>
                                  )}
                                </CollapsibleContent>
                              </Collapsible>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>                {/* Tab de Evaluaciones */}
                <TabsContent value="evaluaciones" className="flex-1 mt-4">
                  <ScrollArea className="h-full w-full pr-2">
                    <div className="mb-4">
                      <h3 className="font-semibold mb-2">Evaluaciones Disponibles</h3>
                      {loadingEvaluaciones ? (
                        <div className="space-y-3">
                          {Array.from({ length: 2 }).map((_, index) => (
                            <div key={index} className="border rounded p-4">
                              <Skeleton className="h-6 w-1/2 mb-2" />
                              <Skeleton className="h-4 w-full mb-2" />
                              <Skeleton className="h-4 w-1/3" />
                            </div>
                          ))}
                        </div>
                      ) : evaluaciones.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          No hay evaluaciones disponibles para este curso.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {evaluaciones.map((evaluacion: any, index: number) => {
                            const fechaInicio = new Date(evaluacion.fechainicio);
                            const fechaFin = new Date(evaluacion.fechafin);
                            const ahora = new Date();
                            const disponible = ahora >= fechaInicio && ahora <= fechaFin;
                            const yaRealizada = evaluacionYaRealizada(evaluacion.id);
                            const resultado = obtenerResultadoEvaluacion(evaluacion.id);
                            
                            return (
                              <div key={index} className="border rounded p-4 bg-white shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                  <h4 className="font-medium text-lg">{evaluacion.nombre}</h4>
                                  {yaRealizada && (
                                    <div className="text-right">
                                      <span className="text-sm text-green-600 bg-green-100 px-2 py-1 rounded">
                                        Completada
                                      </span>
                                      <div className="text-lg font-bold text-green-600 mt-1">
                                        {resultado?.calificacion?.toFixed(1)}%
                                      </div>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="text-sm text-gray-600 mb-2">
                                  <div>Fecha inicio: {fechaInicio.toLocaleDateString()}</div>
                                  <div>Fecha fin: {fechaFin.toLocaleDateString()}</div>
                                </div>
                                
                                <div className="text-sm text-gray-600 mb-3">
                                  Preguntas: {evaluacion.preguntas?.length || 0}
                                </div>
                                
                                {yaRealizada && resultado && (
                                  <div className="mb-3 p-2 bg-green-50 rounded border-l-4 border-green-400">
                                    <div className="text-sm text-green-700">
                                      <div><strong>Calificación:</strong> {resultado.calificacion?.toFixed(1)}%</div>
                                      <div><strong>Fecha realizada:</strong> {new Date(resultado.fecharealizada).toLocaleDateString()}</div>
                                    </div>
                                  </div>
                                )}
                                
                                <div className="mb-3">
                                  {yaRealizada ? (
                                    <span className="text-sm text-green-600 bg-green-100 px-2 py-1 rounded">
                                      Ya realizada
                                    </span>
                                  ) : !disponible && ahora < fechaInicio ? (
                                    <span className="text-sm text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
                                      Aún no disponible
                                    </span>
                                  ) : !disponible && ahora > fechaFin ? (
                                    <span className="text-sm text-red-600 bg-red-100 px-2 py-1 rounded">
                                      Expirada
                                    </span>
                                  ) : (
                                    <span className="text-sm text-green-600 bg-green-100 px-2 py-1 rounded">
                                      Disponible
                                    </span>
                                  )}
                                </div>
                                
                                <Button 
                                  className="w-full" 
                                  disabled={!disponible || yaRealizada}
                                  onClick={() => iniciarEvaluacion(evaluacion)}
                                >
                                  {yaRealizada ? 'Ya Realizada' : disponible ? 'Realizar Evaluación' : 'No Disponible'}
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* Tab de Estudiantes */}
                <TabsContent value="estudiantes" className="flex-1 mt-4">
                  <ScrollArea className="h-full w-full pr-2">
                    <div className="mb-4">
                      <h3 className="font-semibold mb-2">Estudiantes Matriculados</h3>
                      {loadingEstudiantes ? (
                        <div className="space-y-3">
                          {Array.from({ length: 4 }).map((_, index) => (
                            <div key={index} className="border rounded p-3 flex items-center space-x-3">
                              <Skeleton className="h-10 w-10 rounded-full" />
                              <div className="flex-1">
                                <Skeleton className="h-4 w-1/3 mb-1" />
                                <Skeleton className="h-3 w-1/2" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : estudiantes.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          No hay estudiantes matriculados en este curso.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {estudiantes.map((estudiante: any, index: number) => (
                            <div key={index} className="border rounded p-3 bg-white shadow-sm flex items-center space-x-3">
                              <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium">
                                  {estudiante.nombreUsuario?.charAt(0).toUpperCase() || 'E'}
                                </span>
                              </div>
                              <div className="flex-1">
                                <div className="font-medium">{estudiante.nombreUsuario}</div>
                                <div className="text-sm text-gray-600">{estudiante.email}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>          )}
        </DialogContent>
      </Dialog>      {/* Diálogo para realizar evaluación */}
      <Dialog open={evaluacionDialogOpen} onOpenChange={setEvaluacionDialogOpen}>
        <DialogContent className="max-w-4xl w-[90vw] h-[85vh] flex flex-col p-0">          <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4">
            <DialogTitle>{evaluacionEnCurso?.nombre}</DialogTitle>
          </DialogHeader>
          
          {evaluacionEnCurso && (
            <div className="flex flex-col h-full min-h-0 px-6">
              <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200 flex-shrink-0">
                <div className="text-sm text-blue-700">
                  <div><strong>Preguntas:</strong> {evaluacionEnCurso.preguntas?.length || 0}</div>
                  <div><strong>Instrucciones:</strong> Selecciona la respuesta correcta para cada pregunta. Todas las preguntas son obligatorias.</div>
                </div>
              </div>
              
              <ScrollArea className="flex-1 pr-2 min-h-0">
                <div className="space-y-6 pb-4">
                  {evaluacionEnCurso.preguntas?.map((pregunta: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4 bg-white shadow-sm">
                      <h4 className="font-medium mb-3 text-lg">
                        {index + 1}. {pregunta.enunciado}
                      </h4>
                      <div className="space-y-3">
                        {pregunta.opciones?.map((opcion: string, opcionIndex: number) => (
                          <label key={opcionIndex} className="flex items-center space-x-3 cursor-pointer p-2 rounded hover:bg-gray-50 transition-colors">
                            <input
                              type="radio"
                              name={`pregunta-${index}`}
                              value={opcionIndex}
                              checked={respuestasEvaluacion[index] === opcionIndex}
                              onChange={() => seleccionarRespuesta(index, opcionIndex)}
                              className="text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm">{opcion}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              <div className="flex justify-between items-center pt-4 mt-4 border-t bg-white flex-shrink-0 pb-6">
                <div className="text-sm text-gray-600">
                  Progreso: {respuestasEvaluacion.filter(r => r !== -1).length} / {evaluacionEnCurso.preguntas?.length || 0} preguntas respondidas
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={cerrarEvaluacion}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={enviarEvaluacion}
                    disabled={loadingRespuesta || respuestasEvaluacion.includes(-1)}
                    className="px-8"
                  >
                    {loadingRespuesta ? 'Enviando...' : 'Enviar Evaluación'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
