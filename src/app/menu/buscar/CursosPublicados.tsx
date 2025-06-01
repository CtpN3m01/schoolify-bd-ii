"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  const [selectedCurso, setSelectedCurso] = useState<Curso | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [modulos, setModulos] = useState<any[]>([]);
  const [openModulo, setOpenModulo] = useState<number | null>(null);
  const [openSubseccion, setOpenSubseccion] = useState<{ mod: number; sub: number } | null>(null);  const [matriculando, setMatriculando] = useState(false);
  const [matriculaExitosa, setMatriculaExitosa] = useState(false);
  const [enrolledCourses, setEnrolledCourses] = useState<string[]>([]);
  const [loadingModulos, setLoadingModulos] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();  const handleCursoClick = async (curso: Curso) => {
    setSelectedCurso(curso);
    setDetailOpen(true);
    setLoadingModulos(true);
    
    // Verificar si el usuario está matriculado en este curso
    if (user?._id && !enrolledCourses.includes(curso._id)) {
      try {
        const response = await fetch(`/api/neo4jDB/cursos-matriculados?userId=${user._id}`);
        const result = await response.json();
        const enrolledIds = (result.cursos || []).map((c: any) => c._id);
        
        // Actualizar la lista de cursos matriculados
        setEnrolledCourses(enrolledIds);
      } catch (error) {
        console.error('Error checking enrollment:', error);
      }
    }
    
    try {
      const res = await fetch('/api/mongoDB/cursos/get_cursos');
      const data = await res.json();
      const cursoDB = (data.cursos || []).find((c: any) => c._id === curso._id);
      setModulos(cursoDB?.contenido || []);
    } catch (e) {
      setModulos([]);
    } finally {
      setLoadingModulos(false);
    }
  };
  const handleMatricularse = async () => {
    if (!selectedCurso) return;
    setMatriculando(true);
    setMatriculaExitosa(false);
    try {
      // Obtener usuario autenticado
      const userRes = await fetch("/api/auth/me");
      const userData = await userRes.json();
      const userId = userData?.user?._id || userData?.user?.id || userData?.user?.nombreUsuario;
      if (!userId) throw new Error("No autenticado");
      // Obtener límite de usuarios del curso (si existe)
      const limiteUsuarios = (selectedCurso as any).limiteUsuarios || 99999;
      const res = await fetch("/api/neo4jDB/matricular-usuario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, cursoId: selectedCurso._id, limiteUsuarios })
      });
      if (!res.ok) throw new Error((await res.json()).message || "Error al matricularse");
      setMatriculaExitosa(true);
      // Actualizar la lista de cursos matriculados
      await fetchEnrolledCourses();
    } catch (e) {
      const msg = typeof e === 'object' && e && 'message' in e ? (e as any).message : String(e);
      alert(msg || "Error al matricularse");
    } finally {
      setMatriculando(false);
    }
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
  }, [user]);  // Nuevo useEffect para manejar cursoId desde URL
  useEffect(() => {
    if (!searchParams) return;
    const cursoId = searchParams.get('cursoId');
    if (cursoId && cursos.length > 0) {
      const curso = cursos.find(c => c._id === cursoId);
      if (curso) {
        handleCursoClick(curso);
        // Limpiar el parámetro de la URL después de abrir el diálogo
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [cursos, searchParams]);

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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
        {loading ? (
          <div className="col-span-full text-center">Cargando cursos...</div>
        ) : cursosFiltrados.length === 0 ? (
          <div className="col-span-full text-center">No hay cursos publicados.</div>
        ) : (
          cursosFiltrados.map((curso) => (
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
      </div>
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
                  <div className="mb-2 text-gray-700">
                    <span className="font-semibold">Docente:</span>{' '}
                    <button
                      className="text-blue-700 underline hover:text-blue-900"
                      onClick={() => {
                        if (selectedCurso.nombreUsuarioDocente) {
                          router.push(`/menu/perfil?id=${selectedCurso.nombreUsuarioDocente}`);
                        }
                      }}
                    >
                      {selectedCurso.nombreUsuarioDocente}
                    </button>
                  </div>
                  <div className="mb-2 text-gray-700"><span className="font-semibold">Estado:</span> <span className="font-semibold">{selectedCurso.estado || 'Publicado'}</span></div>
                </div>
                {selectedCurso.foto && (
                  <div className="flex items-center justify-center">
                    <Image src={selectedCurso.foto} alt={selectedCurso.nombreCurso} width={320} height={180} className="rounded-md object-cover max-h-40 w-full" />
                  </div>
                )}
              </div>              <div className="flex flex-wrap gap-4 mb-4 items-end">
                {/* No mostrar botón si el usuario es el docente del curso */}
                {user?.nombreUsuario !== selectedCurso.nombreUsuarioDocente && (
                  <>
                    {isEnrolledInCourse(selectedCurso._id) ? (
                      <Button className="bg-green-600 hover:bg-green-700 text-white" disabled>
                        Matriculado
                      </Button>
                    ) : (
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleMatricularse} disabled={matriculando || matriculaExitosa}>
                        {matriculando ? 'Matriculando...' : matriculaExitosa ? '¡Matriculado!' : 'Matricularse'}
                      </Button>
                    )}
                  </>
                )}
                {/* Mostrar mensaje informativo si es el docente */}
                {user?.nombreUsuario === selectedCurso.nombreUsuarioDocente && (
                  <div className="bg-blue-50 border border-blue-200 rounded px-4 py-2">
                    <span className="text-blue-700 font-medium">Eres el docente de este curso</span>
                  </div>
                )}
              </div><ScrollArea className="h-[60vh] w-full pr-2">
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">Módulos/Secciones</h3>
                  {loadingModulos ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="border rounded">
                          <div className="px-4 py-2 bg-gray-100 rounded-t">
                            <Skeleton className="h-5 w-40" />
                          </div>
                          <div className="p-4 space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                            <div className="space-y-1">
                              <Skeleton className="h-3 w-32" />
                              <Skeleton className="h-3 w-48" />
                              <Skeleton className="h-3 w-36" />
                            </div>
                          </div>
                        </div>
                      ))}
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
                          </CollapsibleContent>                        </Collapsible>
                      </li>
                    ))}
                    </ul>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
