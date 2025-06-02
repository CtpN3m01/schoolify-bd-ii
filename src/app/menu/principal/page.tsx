'use client';

import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext } from "@/components/ui/pagination";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const cursosPerPage = 6;
  useEffect(() => {
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
        
        // Filtrar cursos duplicados y temporales en el frontend también
        const cursosUnicos = (result.cursos || []).filter((curso: Curso, index: number, self: Curso[]) => {
          return curso._id && 
                 curso.nombreCurso && 
                 curso.nombreCurso !== 'Curso Temporal' &&
                 curso.descripcion !== 'Descripción temporal' &&
                 index === self.findIndex(c => c._id === curso._id);
        });
        
        setCursos(cursosUnicos);
        setLoading(false);
      } catch (error) {
        setCursos([]);
        setLoading(false);
      }
    };
    fetchCursosMatriculados();
  }, []);

  // Efecto para abrir automáticamente el curso si viene de otra página
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
  };

  // Al hacer click en un curso, navegar a la página de detalle
  const handleCursoClick = (curso: Curso) => {
    router.push(`/menu/principal/curso/${curso._id}`);
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
      </header>

      <main className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">        {loading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <Card key={`skeleton-${index}`} className="h-full flex flex-col">
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
          currentCursos.map((curso, index) => (
            <Card key={`curso-${curso._id}-${index}`} className="h-full flex flex-col cursor-pointer" onClick={() => handleCursoClick(curso)}>
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
                <PaginationItem key={`page-${index}`}>
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
    </div>
  );
}
