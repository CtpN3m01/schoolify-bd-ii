'use client';

import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext } from "@/components/ui/pagination";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";

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

  // Cargar cursos reales desde la API
  useEffect(() => {
    const fetchCursos = async () => {
      try {
        const response = await fetch('/api/mongoDB/cursos/get_cursos');
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
    </div>
  );
}
