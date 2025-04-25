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
import { X } from "lucide-react";

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
  const cursosPerPage = 6;
  const [selectedCurso, setSelectedCurso] = useState<Curso | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [modulos, setModulos] = useState<any[]>([]);
  const [openModulo, setOpenModulo] = useState<number | null>(null);
  const [openSubseccion, setOpenSubseccion] = useState<{ mod: number; sub: number } | null>(null);
  const [matriculando, setMatriculando] = useState(false);
  const [matriculaExitosa, setMatriculaExitosa] = useState(false);

  // Cargar cursos publicados desde Redis (con fallback a MongoDB)
  useEffect(() => {
    const fetchCursos = async () => {
      try {
        const response = await fetch('/api/redisDB/get_cursos_publicados');
        const result = await response.json();
        setCursos(result.cursos || []);
        setLoading(false);
      } catch (error) {
        console.error('Error al cargar los cursos:', error);
        setLoading(false);
      }
    };
    fetchCursos();
  }, []);

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
  };

  // Al hacer click en un curso, abrir modal de detalle y cargar módulos desde MongoDB
  const handleCursoClick = async (curso: Curso) => {
    setSelectedCurso(curso);
    setDetailOpen(true);
    // Cargar módulos/secciones desde el campo contenido
    try {
      const res = await fetch('/api/mongoDB/cursos/get_cursos');
      const data = await res.json();
      const cursoDB = (data.cursos || []).find((c: any) => c._id === curso._id);
      setModulos(cursoDB?.contenido || []);
    } catch (e) {
      setModulos([]);
    }
  };

  // Lógica de matrícula (placeholder)
  const handleMatricularse = async () => {
    setMatriculando(true);
    setMatriculaExitosa(false);
    // Aquí iría la llamada real a la API de matrícula
    setTimeout(() => {
      setMatriculando(false);
      setMatriculaExitosa(true);
    }, 1200);
  };

  // Renderizado de los cursos
  return (
    <div className="grid grid-rows-[auto_1fr_auto] items-start min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <header className="flex justify-between items-center">
        <div className="text-left">
          <h1 className="text-2xl font-bold">Cursos</h1>
          <p className="text-muted-foreground">Explora los cursos disponibles</p>
        </div>
        <div className="relative w-64">
          <Input 
            type="text" 
            placeholder="Buscar cursos..." 
            className="pl-10 pr-4 py-2 rounded-md border border-input bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
      </header>
      <main className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
        {loading ? (
          <div className="col-span-full text-center">Cargando cursos...</div>
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
      )}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-full w-[96vw] h-[90vh]">
          <DialogHeader>
            <DialogTitle>Detalle del Curso</DialogTitle>
          </DialogHeader>
          {selectedCurso && (
            <div>
              <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h2 className="text-xl font-bold mb-2">{selectedCurso.nombreCurso}</h2>
                  <p className="mb-2 text-gray-700"><span className="font-semibold">Descripción:</span> {selectedCurso.descripcion}</p>
                  <div className="mb-2 text-gray-700"><span className="font-semibold">Fecha inicio:</span> {selectedCurso.fechaInicio}</div>
                  <div className="mb-2 text-gray-700"><span className="font-semibold">Fecha fin:</span> {selectedCurso.fechaFin}</div>
                  <div className="mb-2 text-gray-700"><span className="font-semibold">Docente:</span> {selectedCurso.nombreUsuarioDocente}</div>
                  <div className="mb-2 text-gray-700"><span className="font-semibold">Estado:</span> <span className="font-semibold">{selectedCurso.estado || 'Publicado'}</span></div>
                </div>
                {selectedCurso.foto && (
                  <div className="flex items-center justify-center">
                    <Image src={selectedCurso.foto} alt={selectedCurso.nombreCurso} width={320} height={180} className="rounded-md object-cover max-h-40 w-full" />
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-4 mb-4 items-end">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleMatricularse} disabled={matriculando || matriculaExitosa}>
                  {matriculando ? 'Matriculando...' : matriculaExitosa ? '¡Matriculado!' : 'Matricularse'}
                </Button>
              </div>
              <ScrollArea className="h-[60vh] w-full pr-2">
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">Módulos/Secciones</h3>
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
                </div>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
