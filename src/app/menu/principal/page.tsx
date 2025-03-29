'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext } from "@/components/ui/pagination";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";

// Tipo para los cursos
type Curso = {
  id: string;
  titulo: string;
  imagenUrl: string;
};

export default function Principal() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const cursosPerPage = 6;

  // Función para cargar los cursos desde la base de datos
  useEffect(() => {
    const fetchCursos = async () => {
      try {
        // Aquí iría la llamada a la api para obtener los cursos
        // const response = await fetch('/api/cursos');
        // Simulamos datos de ejemplo
        const data: Curso[] = [
          { id: '1', titulo: 'Python de Cero a Experto', imagenUrl: '/assets/TempCursosImg/PythonDeCeroAExperto.jpg' },
          { id: '2', titulo: 'JavaScript Moderno', imagenUrl: '/assets/TempCursosImg/JavaScriptModerno.jpg' },
          { id: '3', titulo: 'React Avanzado', imagenUrl: '/assets/TempCursosImg/ReactAvanzado.jpg' },
          { id: '4', titulo: 'Curso de Node.js', imagenUrl: '/assets/TempCursosImg/NodeJS.jpg' },
          { id: '5', titulo: 'Curso de TypeScript', imagenUrl: '/assets/TempCursosImg/TypeScript.jpg' },
          { id: '6', titulo: 'Curso de Angular', imagenUrl: '/assets/TempCursosImg/Angular.jpg' },
          { id: '7', titulo: 'Curso de Vue.js', imagenUrl: '/assets/TempCursosImg/VueJS.jpg' },
          { id: '8', titulo: 'Curso de Django', imagenUrl: '/assets/TempCursosImg/Django.jpg' },
          { id: '9', titulo: 'Curso de Flask', imagenUrl: '/assets/TempCursosImg/Flask.jpg' },
          { id: '10', titulo: 'Curso de Java', imagenUrl: '/assets/TempCursosImg/Java.jpg' },
          { id: '11', titulo: 'Curso de C#', imagenUrl: '/assets/TempCursosImg/CSharp.jpg' },
          { id: '12', titulo: 'Curso de PHP', imagenUrl: '/assets/TempCursosImg/PHP.jpg' },
          { id: '13', titulo: 'Curso de Ruby on Rails', imagenUrl: '/assets/TempCursosImg/RubyOnRails.jpg' },
          { id: '14', titulo: 'Curso de Swift', imagenUrl: '/assets/TempCursosImg/Swift.jpg' },
          { id: '15', titulo: 'Curso de Kotlin', imagenUrl: '/assets/TempCursosImg/Kotlin.jpg' },
          { id: '16', titulo: 'Curso de Go', imagenUrl: '/assets/TempCursosImg/Go.jpg' },
          { id: '17', titulo: 'Curso de Rust', imagenUrl: '/assets/TempCursosImg/Rust.jpg' },
          { id: '18', titulo: 'Curso de SQL', imagenUrl: '/assets/TempCursosImg/SQL.jpg' },
        ];
        
        // Simula un pequeño retraso como en una petición real
        setTimeout(() => {
          setCursos(data);
          setLoading(false);
        }, 500);
      } catch (error) {
        console.error('Error al cargar los cursos:', error);
        setLoading(false);
      }
    };

    fetchCursos();
  }, []);

  // Filtrar cursos según término de búsqueda
  const cursosFiltrados = cursos.filter(curso =>
    curso.titulo.toLowerCase().includes(searchTerm.toLowerCase())
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

  return (
    <div className="grid grid-rows-[auto_1fr_auto] items-start min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <header className="flex justify-between items-center">
        <div className="text-left">
          <h1 className="text-2xl font-bold">Mis Cursos</h1>
          <p className="text-muted-foreground">Explora tus cursos</p>
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

      <main className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 items-start justify-start">
        {loading ? (
          <div className="col-span-full text-center py-10">
            <p>Cargando cursos...</p>
          </div>
        ) : cursosFiltrados.length > 0 ? (
          currentCursos.map((curso) => (
            <Card 
              key={curso.id} 
              className="transition-all duration-300 ease-in-out hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-1 cursor-pointer group rounded-lg border border-gray-200"
            >
              <CardHeader>
                <div className="overflow-hidden rounded-t-lg">
                  <img
                    src={curso.imagenUrl}
                    alt={curso.titulo}
                    className="w-full h-48 object-contain bg-gray-100 p-4 transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="group-hover:text-primary transition-colors duration-300 text-center text-lg font-medium">{curso.titulo}</CardTitle>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-10">
            <h3 className="text-xl font-semibold mb-2">Aún no eres miembro de ningún curso</h3>
            <p className="text-muted-foreground">Buscá un curso de tu interés e inscríbete</p>
          </div>
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
