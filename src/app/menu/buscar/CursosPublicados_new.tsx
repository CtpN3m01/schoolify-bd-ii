"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@/app/UserContext";
import { Skeleton } from "@/components/ui/skeleton";

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

export default function CursosPublicados() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [enrolledCourses, setEnrolledCourses] = useState<string[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();

  const handleCursoClick = async (curso: Curso) => {
    // Navigate to the course detail page
    router.push(`/menu/buscar/curso/${curso._id}`);
  };

  const fetchEnrolledCourses = async () => {
    if (!user?._id) return;
    try {
      const response = await fetch(`/api/neo4jDB/cursos-matriculados?userId=${user._id}`);
      const result = await response.json();
      const enrolledIds = (result.cursos || []).map((curso: any) => curso._id);
      setEnrolledCourses(enrolledIds);
    } catch (error) {
      console.error('Error fetching enrolled courses:', error);
    }
  };

  const isEnrolledInCourse = (cursoId: string) => {
    return enrolledCourses.includes(cursoId);
  };

  useEffect(() => {
    const fetchCursos = async () => {
      try {
        const response = await fetch('/api/redisDB/get_cursos_publicados');
        const result = await response.json();
        setCursos(result.cursos || []);
        setLoading(false);
      } catch (error) {
        setLoading(false);
      }
    };
    fetchCursos();
  }, []);

  useEffect(() => {
    if (user?._id) {
      fetchEnrolledCourses();
    }
  }, [user]);

  // Nuevo useEffect para manejar cursoId desde URL
  useEffect(() => {
    if (!searchParams) return;
    const cursoId = searchParams.get('cursoId');
    if (cursoId && cursos.length > 0) {
      const curso = cursos.find(c => c._id === cursoId);
      if (curso) {
        handleCursoClick(curso);
        // Limpiar el parámetro de la URL después de navegar
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [cursos, searchParams]);

  // Utilidad para formatear fechas
  function formatDate(dateString: string) {
    if (!dateString) return "";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  }

  const cursosFiltrados = cursos.filter(curso =>
    curso.nombreCurso.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold">Cursos publicados</h2>
        <div className="relative w-64">
          <Input
            type="text"
            placeholder="Buscar cursos..."
            className="pl-10 pr-4 py-2 rounded-md border border-input bg-background"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          <div className="col-span-full text-center py-12 text-gray-500">
            No se encontraron cursos.
          </div>
        ) : (
          cursosFiltrados.map((curso) => (
            <Card 
              key={curso._id} 
              className="h-full flex flex-col cursor-pointer hover:shadow-lg transition-shadow duration-200"
              onClick={() => handleCursoClick(curso)}
            >
              {curso.foto && (
                <Image 
                  src={curso.foto} 
                  alt={curso.nombreCurso} 
                  width={400} 
                  height={200} 
                  className="rounded-t-md object-cover h-48 w-full" 
                />
              )}
              <CardHeader>
                <CardTitle className="line-clamp-2">{curso.nombreCurso}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between">
                <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                  {curso.descripcion}
                </p>
                <div className="space-y-1 text-xs text-gray-500">
                  <div>Docente: {curso.nombreUsuarioDocente}</div>
                  <div>Inicio: {formatDate(curso.fechaInicio)}</div>
                  <div>Fin: {formatDate(curso.fechaFin)}</div>
                  {isEnrolledInCourse(curso._id) && (
                    <div className="text-green-600 font-medium">✓ Ya matriculado</div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
