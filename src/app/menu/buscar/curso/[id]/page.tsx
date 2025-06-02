'use client';

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import { useUser } from "@/app/UserContext";
import { toast } from "sonner";

interface Curso {
  id: string;
  nombreCurso: string;
  descripcion: string;
  foto: string;
  nombreUsuarioDocente: string;
  fechaInicio: string;
  fechaFin: string;
  modulos: any[];
}

export default function CursoPublicoDetallePage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useUser();
  const [curso, setCurso] = useState<Curso | null>(null);
  const [loading, setLoading] = useState(true);
  const [openModulo, setOpenModulo] = useState<number | null>(null);
  const [openSubseccion, setOpenSubseccion] = useState<{mod: number, sub: number} | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  const formatNeo4jDate = (dateStr: string) => {
    if (!dateStr) return 'No especificada';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('es-ES');
    } catch {
      return 'Fecha inválida';
    }
  };
  useEffect(() => {
    const fetchCursoDetalle = async () => {
      try {
        setLoading(true);
        const courseId = params?.id;
        if (!courseId) return;
        
        // Fetch course data from MongoDB for public access
        const response = await fetch('/api/mongoDB/cursos/get_cursos');
        if (!response.ok) throw new Error('Error al cargar el curso');
        
        const data = await response.json();
        const foundCurso = data.cursos?.find((c: any) => c._id === courseId);
        
        if (!foundCurso) {
          throw new Error('Curso no encontrado');
        }
        
        // Transform MongoDB data to match our interface
        const cursoData = {
          id: foundCurso._id,
          nombreCurso: foundCurso.nombreCurso,
          descripcion: foundCurso.descripcion,
          foto: foundCurso.foto,
          nombreUsuarioDocente: foundCurso.nombreUsuarioDocente,
          fechaInicio: foundCurso.fechaInicio,
          fechaFin: foundCurso.fechaFin,
          modulos: foundCurso.contenido || []
        };
          setCurso(cursoData);
        
        // Check if user is enrolled in the course
        if (user?._id) {
          try {
            const enrollResponse = await fetch(`/api/neo4jDB/cursos-matriculados?userId=${user._id}`);
            const enrollData = await enrollResponse.json();
            const enrolled = enrollData.cursos?.some((c: any) => c._id === courseId);
            setIsEnrolled(enrolled);
          } catch (e) {
            console.error('Error checking enrollment:', e);
          }
        }
      } catch (error) {
        console.error('Error al cargar curso:', error);
      } finally {
        setLoading(false);
      }
    };    if (params?.id) {
      fetchCursoDetalle();
    }
  }, [params?.id, user?._id]);

  const handleEnrollment = async () => {
    if (!user?._id || !curso?.id) {
      toast.error('Debes iniciar sesión para matricularte');
      return;
    }

    setEnrolling(true);
    try {
      const response = await fetch('/api/neo4jDB/matricular-usuario', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usuarioId: user._id,
          cursoId: curso.id
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        setIsEnrolled(true);
        toast.success('¡Te has matriculado exitosamente!');
      } else {
        toast.error(result.error || 'Error al matricularse');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al procesar la matrícula');
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <Skeleton className="h-10 w-32 mb-4" />
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
          <div className="lg:col-span-2">
            <Skeleton className="h-96 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!curso) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Button 
          onClick={() => router.back()} 
          variant="outline" 
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold mb-2">Curso no encontrado</h2>
          <p className="text-gray-600">No se pudo cargar la información del curso solicitado.</p>
        </div>
      </div>
    );
  }

  const { modulos = [] } = curso;

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Botón para volver */}
      <Button 
        onClick={() => router.back()} 
        variant="outline" 
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Volver a Cursos Publicados
      </Button>

      {/* Header del curso */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">{curso.nombreCurso}</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Información del curso */}
          <div className="lg:col-span-1">
            <Card>
              {curso.foto && (
                <div className="relative h-48 w-full">
                  <Image 
                    src={curso.foto} 
                    alt={curso.nombreCurso} 
                    fill
                    className="rounded-t-lg object-cover" 
                  />
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-lg">Información del Curso</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-600">Descripción:</p>
                  <p className="text-sm">{curso.descripcion}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Docente:</p>
                  <p className="text-sm">{curso.nombreUsuarioDocente}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Fecha de inicio:</p>
                  <p className="text-sm">{formatNeo4jDate(curso.fechaInicio)}</p>
                </div>                <div>
                  <p className="text-sm font-medium text-gray-600">Fecha de fin:</p>
                  <p className="text-sm">{formatNeo4jDate(curso.fechaFin)}</p>
                </div>
                
                {/* Enrollment Button */}
                {user && user.nombreUsuario !== curso.nombreUsuarioDocente && (
                  <div className="pt-4 border-t">
                    {isEnrolled ? (
                      <Button className="w-full bg-green-600 hover:bg-green-700" disabled>
                        ✓ Ya matriculado
                      </Button>
                    ) : (
                      <Button 
                        className="w-full bg-blue-600 hover:bg-blue-700" 
                        onClick={handleEnrollment}
                        disabled={enrolling}
                      >
                        {enrolling ? 'Matriculando...' : 'Matricularse'}
                      </Button>
                    )}
                  </div>
                )}
                
                {!user && (
                  <div className="pt-4 border-t">
                    <Button 
                      className="w-full bg-gray-400 cursor-not-allowed" 
                      disabled
                    >
                      Inicia sesión para matricularte
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Contenido del curso */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-xl">Contenido del Curso</CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <ScrollArea className="h-[70vh] w-full pr-2">
                  {!modulos || modulos.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No hay módulos disponibles en este curso.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {modulos.map((mod: any, i: number) => (
                        <div key={i} className="border rounded-lg">
                          <Collapsible open={openModulo === i} onOpenChange={open => setOpenModulo(open ? i : null)}>
                            <CollapsibleTrigger className="w-full flex justify-between items-center px-4 py-3 cursor-pointer bg-gray-50 hover:bg-gray-100 rounded-t-lg">
                              <span className="font-semibold text-left">{mod.nombre}</span>
                              <span className="text-xs text-gray-500">
                                {openModulo === i ? 'Cerrar' : 'Abrir'}
                              </span>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="p-4 space-y-4 bg-white">
                              {mod.descripcion && (
                                <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                                  {mod.descripcion}
                                </div>
                              )}

                              {/* Contenidos principales del módulo */}
                              {mod.contenidos && mod.contenidos.length > 0 && (
                                <div>
                                  <h4 className="font-medium text-base mb-3 text-gray-800">Contenidos:</h4>
                                  <ScrollArea className="max-h-[200px] w-full pr-2">
                                    <div className="space-y-3">
                                      {mod.contenidos.map((cont: any, j: number) => (
                                        <div key={j} className="border rounded-lg p-3 bg-gray-50">
                                          <div className="font-semibold capitalize mb-2 text-sm text-blue-600">
                                            {cont.tipo === 'texto' ? '📝 Texto' : 
                                             cont.tipo === 'documento' ? '📄 Documento' : 
                                             cont.tipo === 'video' ? '🎥 Video' : 
                                             cont.tipo === 'imagen' ? '🖼️ Imagen' :
                                             cont.tipo === 'comentarios' ? '💬 Comentarios' : 'Desconocido'}
                                          </div>
                                          {cont.titulo && (
                                            <div className="text-sm font-medium text-gray-800 mb-2">{cont.titulo}</div>
                                          )}
                                          {cont.tipo === 'texto' && (
                                            <div className="text-gray-700 whitespace-pre-line text-sm">{cont.valor}</div>
                                          )}
                                          {cont.tipo === 'video' && (
                                            <div className="mt-2">
                                              <video src={cont.valor} controls className="w-full max-h-64 rounded" />
                                            </div>
                                          )}
                                          {cont.tipo === 'imagen' && (
                                            <div className="mt-2 flex justify-center">
                                              <img src={cont.valor} alt="Imagen del curso" className="max-w-full max-h-64 object-contain rounded" />
                                            </div>
                                          )}
                                          {cont.tipo === 'documento' && (
                                            <div className="mt-2">
                                              <a href={cont.valor} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline text-sm">
                                                Ver documento
                                              </a>
                                            </div>
                                          )}
                                          {cont.tipo === 'comentarios' && (
                                            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                                              💬 Sección de comentarios disponible para estudiantes matriculados
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </ScrollArea>
                                </div>
                              )}

                              {/* Subsecciones */}
                              {mod.subsecciones && mod.subsecciones.length > 0 && (
                                <div>
                                  <h4 className="font-medium text-base mb-3 text-gray-800">Subsecciones:</h4>
                                  <ScrollArea className="max-h-[300px] w-full pr-2">
                                    <div className="ml-4 space-y-3">
                                      {mod.subsecciones.map((sub: any, k: number) => (
                                        <div key={k} className="border rounded-lg border-gray-200">
                                          <Collapsible 
                                            open={openSubseccion?.mod === i && openSubseccion?.sub === k} 
                                            onOpenChange={open => setOpenSubseccion(open ? { mod: i, sub: k } : null)}
                                          >
                                            <CollapsibleTrigger className="w-full flex justify-between items-center px-3 py-2 cursor-pointer bg-gray-100 hover:bg-gray-200 rounded-t-lg">
                                              <span className="font-medium text-sm text-left">{sub.nombre}</span>
                                              <span className="text-xs text-gray-600">
                                                {openSubseccion?.mod === i && openSubseccion?.sub === k ? 'Cerrar' : 'Abrir'}
                                              </span>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent className="p-3 bg-white">
                                              {sub.descripcion && (
                                                <div className="mb-3 text-xs text-gray-700 bg-gray-50 p-2 rounded">{sub.descripcion}</div>
                                              )}
                                              <div className="space-y-2 max-h-[150px] overflow-y-auto">
                                                {sub.contenidos && sub.contenidos.map((cont: any, j: number) => (
                                                  <div key={j} className="border rounded-lg p-2 bg-gray-50">
                                                    <div className="font-semibold capitalize mb-1 text-xs text-blue-600">
                                                      {cont.tipo === 'texto' ? '📝 Texto' : 
                                                       cont.tipo === 'documento' ? '📄 Documento' : 
                                                       cont.tipo === 'video' ? '🎥 Video' : 
                                                       cont.tipo === 'imagen' ? '🖼️ Imagen' :
                                                       cont.tipo === 'comentarios' ? '💬 Comentarios' : 'Desconocido'}
                                                    </div>
                                                    {cont.titulo && (
                                                      <div className="text-xs font-medium text-gray-800 mb-1">{cont.titulo}</div>
                                                    )}
                                                    {cont.tipo === 'texto' && (
                                                      <div className="text-gray-700 whitespace-pre-line text-xs">{cont.valor}</div>
                                                    )}
                                                    {cont.tipo === 'video' && (
                                                      <div className="mt-1">
                                                        <video src={cont.valor} controls className="w-full max-h-32 rounded" />
                                                      </div>
                                                    )}
                                                    {cont.tipo === 'imagen' && (
                                                      <div className="mt-1 flex justify-center">
                                                        <img src={cont.valor} alt="Imagen" className="max-w-full max-h-32 object-contain rounded" />
                                                      </div>
                                                    )}
                                                    {cont.tipo === 'documento' && (
                                                      <div className="mt-1">
                                                        <a href={cont.valor} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline text-xs">
                                                          Ver documento
                                                        </a>
                                                      </div>
                                                    )}
                                                    {cont.tipo === 'comentarios' && (
                                                      <div className="mt-1 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                                                        💬 Sección de comentarios disponible para estudiantes matriculados
                                                      </div>
                                                    )}
                                                  </div>
                                                ))}
                                              </div>
                                            </CollapsibleContent>
                                          </Collapsible>
                                        </div>
                                      ))}
                                    </div>
                                  </ScrollArea>
                                </div>
                              )}
                            </CollapsibleContent>
                          </Collapsible>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
