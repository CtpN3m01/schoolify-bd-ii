"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Image from "next/image";

export default function Evaluaciones() {
  const router = useRouter();
  // Estado del formulario
  const [nombre, setNombre] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [preguntas, setPreguntas] = useState([
    { enunciado: "", opciones: ["", "", "", ""], respuestaCorrecta: 0 }
  ]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Estado para cursos y evaluaciones
  const [cursos, setCursos] = useState<{ _id: string; nombreCurso: string }[]>([]);
  const [cursoSeleccionado, setCursoSeleccionado] = useState<string>("");
  const [evaluaciones, setEvaluaciones] = useState<any[]>([]);
  const [evaluacionSeleccionada, setEvaluacionSeleccionada] = useState<any>(null);
  const [resultados, setResultados] = useState<any[]>([]);
  const [tab, setTab] = useState("crear");
  // Estado para edición
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editEval, setEditEval] = useState<any>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editFechaInicio, setEditFechaInicio] = useState("");
  const [editFechaFin, setEditFechaFin] = useState("");
  const [editPreguntas, setEditPreguntas] = useState<any[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Estado para el dialog de resultados
  const [resultadosDialogOpen, setResultadosDialogOpen] = useState(false);  const [resultadosDetallados, setResultadosDetallados] = useState<any[]>([]);
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState<any>(null);
  const [detalleRespuestasOpen, setDetalleRespuestasOpen] = useState(false);

  // Nuevo estado específico para el dialog de respuestas desde tabla
  const [dialogRespuestasTabla, setDialogRespuestasTabla] = useState({
    open: false,
    estudiante: null as any,
    evaluacion: null as any
  });

  // Estados para el tab de notas de estudiantes
  const [estudiantes, setEstudiantes] = useState<any[]>([]);
  const [loadingEstudiantes, setLoadingEstudiantes] = useState(false);
  const [resultadosCompletos, setResultadosCompletos] = useState<any[]>([]);

  // Cargar cursos donde el usuario es docente (usando el usuario autenticado de la API)
  useEffect(() => {
    async function fetchCursosDocente() {
      try {
        const userRes = await fetch("/api/auth/me");
        const userData = await userRes.json();
        const nombreUsuario = userData?.user?.nombreUsuario;
        if (!nombreUsuario) {
          setCursos([]);
          return;
        }
        const cursosRes = await fetch("/api/mongoDB/cursos/get_cursos");
        const cursosData = await cursosRes.json();
        const cursosDocente = (cursosData.cursos || []).filter((c: any) => c.nombreUsuarioDocente === nombreUsuario);
        setCursos(cursosDocente.map((c: any) => ({ _id: c._id, nombreCurso: c.nombreCurso })));
        if (cursosDocente.length > 0) setCursoSeleccionado(cursosDocente[0]._id);
      } catch {
        setCursos([]);
      }
    }
    fetchCursosDocente();
  }, []);
  // Cargar evaluaciones del curso seleccionado
  useEffect(() => {
    if (!cursoSeleccionado) return;
    fetch(`/api/cassandraDB/evaluaciones?curso=${cursoSeleccionado}`)
      .then(res => res.json())
      .then(data => setEvaluaciones(data.evaluaciones || []));
  }, [cursoSeleccionado, success]);

  // Cargar estudiantes matriculados cuando cambia el curso seleccionado
  useEffect(() => {
    if (!cursoSeleccionado) return;
    setLoadingEstudiantes(true);
    fetch(`/api/neo4jDB/estudiantes-matriculados?cursoId=${cursoSeleccionado}`)
      .then(res => res.json())
      .then(data => {
        setEstudiantes(data.estudiantes || []);
        // Cargar resultados de evaluaciones para todos los estudiantes
        cargarResultadosCompletos(cursoSeleccionado);
      })
      .catch(error => {
        console.error('Error cargando estudiantes:', error);
        setEstudiantes([]);
      })
      .finally(() => setLoadingEstudiantes(false));
  }, [cursoSeleccionado]);

  // Función para cargar todos los resultados de evaluaciones del curso
  const cargarResultadosCompletos = async (cursoId: string) => {
    try {
      const res = await fetch(`/api/cassandraDB/evaluaciones?resultadosCurso=1&cursoId=${cursoId}`);
      const data = await res.json();
      setResultadosCompletos(data.resultados || []);
    } catch (error) {
      console.error('Error cargando resultados completos:', error);
      setResultadosCompletos([]);
    }
  };
  // Cargar resultados de estudiantes para la evaluación seleccionada
  const cargarResultados = async (evaluacion: any) => {
    setEvaluacionSeleccionada(evaluacion);
    setResultados([]);
    try {
      const res = await fetch(`/api/cassandraDB/evaluaciones?resultadosEvaluacion=1&idEvaluacion=${evaluacion.id}`);
      const data = await res.json();
      setResultados(data.resultados || []);
      setResultadosDetallados(data.resultados || []);
      setResultadosDialogOpen(true);
    } catch (error) {
      console.error('Error al cargar resultados:', error);
      setResultados([]);
    }
  };

  const handlePreguntaChange = (idx: number, field: string, value: any) => {
    setPreguntas(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };
  const handleOpcionChange = (idx: number, opIdx: number, value: string) => {
    setPreguntas(prev => prev.map((p, i) => i === idx ? { ...p, opciones: p.opciones.map((op, j) => j === opIdx ? value : op) } : p));
  };
  const handleAgregarPregunta = () => {
    setPreguntas(prev => [...prev, { enunciado: "", opciones: ["", "", "", ""], respuestaCorrecta: 0 }]);
  };
  const handleEliminarPregunta = (idx: number) => {
    setPreguntas(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);
  };
  // Función para crear fecha sin problemas de zona horaria
  const createDateFromString = (dateString: string) => {
    if (!dateString) return null;
    // Agregar la hora local para evitar problemas de UTC
    const [year, month, day] = dateString.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0).toISOString();
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    setSuccess("");
    setError("");
    try {
      const body = {
        idCurso: cursoSeleccionado,
        nombre,
        fechaInicio: createDateFromString(fechaInicio),
        fechaFin: createDateFromString(fechaFin),
        preguntas
      };
      const res = await fetch("/api/cassandraDB/evaluaciones?crear=1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error("Error al crear evaluación");
      setSuccess("¡Evaluación creada correctamente!");
      setNombre("");
      setFechaInicio("");
      setFechaFin("");
      setPreguntas([{ enunciado: "", opciones: ["", "", "", ""], respuestaCorrecta: 0 }]);
    } catch (e: any) {
      setError(e.message || "Error inesperado");
    } finally {
      setSaving(false);
    }
  };
  // Función para convertir ISO date a formato de input date
  const formatDateForInput = (isoString: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Editar evaluación: abrir dialog y cargar datos
  const handleEdit = (ev: any) => {
    setEditEval(ev);
    setEditNombre(ev.nombre);
    setEditFechaInicio(formatDateForInput(ev.fechainicio));
    setEditFechaFin(formatDateForInput(ev.fechafin));
    setEditPreguntas(ev.preguntas || []);
    setEditDialogOpen(true);
  };

  // Guardar cambios de edición
  const handleEditSave = async () => {
    if (!editEval) return;
    setSaving(true);
    setError("");
    try {      const body = {
        id: editEval.id,
        idCurso: cursoSeleccionado,
        nombre: editNombre,
        fechaInicio: createDateFromString(editFechaInicio),
        fechaFin: createDateFromString(editFechaFin),
        preguntas: editPreguntas
      };
      const res = await fetch("/api/cassandraDB/evaluaciones?editar=1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error("Error al editar evaluación");
      setEditDialogOpen(false);
      setSuccess("¡Evaluación editada correctamente!");
    } catch (e: any) {
      setError(e.message || "Error inesperado");
    } finally {
      setSaving(false);
    }
  };

  // Borrar evaluación
  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta evaluación?")) return;
    setDeletingId(id);
    setError("");
    try {
      const res = await fetch(`/api/cassandraDB/evaluaciones?eliminar=1&id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar evaluación");
      setSuccess("¡Evaluación eliminada!");
      setEvaluacionSeleccionada(null);
    } catch (e: any) {
      setError(e.message || "Error inesperado");
    } finally {
      setDeletingId(null);
    }
  };

  // Mostrar detalle de respuestas de un estudiante
  const mostrarDetalleRespuestas = (resultado: any) => {
    setEstudianteSeleccionado(resultado);
    setDetalleRespuestasOpen(true);
  };
  // Verificar si una respuesta es correcta
  const esRespuestaCorrecta = (preguntaIdx: number, respuestaEstudiante: number) => {
    const pregunta = evaluacionSeleccionada?.preguntas?.[preguntaIdx];
    // Si no hay respuesta (undefined, null, -1) se considera incorrecta
    if (respuestaEstudiante === undefined || respuestaEstudiante === null || respuestaEstudiante === -1) {
      return false;
    }
    return pregunta && respuestaEstudiante === pregunta.respuestaCorrecta;
  };

  // Verificar si el estudiante no respondió una pregunta
  const esRespuestaSinResponder = (respuestaEstudiante: number) => {
    return respuestaEstudiante === undefined || respuestaEstudiante === null || respuestaEstudiante === -1;
  };
  // Asegura que el tab inicial sea válido si no hay cursos
  useEffect(() => {
    if (cursos.length === 0 && tab !== "crear") setTab("crear");
  }, [cursos, tab]);

  // Función para obtener la nota de un estudiante en una evaluación específica
  const obtenerNotaEstudiante = (estudianteId: string, evaluacionId: string) => {
    const resultado = resultadosCompletos.find(r => 
      r.idestudiante === estudianteId && r.idevaluacion === evaluacionId
    );
    return resultado ? resultado.calificacion : null;  };
  // Función para calcular el promedio de un estudiante
  const calcularPromedioEstudiante = (estudianteId: string) => {
    if (evaluaciones.length === 0) return null;
    
    const notasConStatus = evaluaciones.map(ev => {
      const nota = obtenerNotaEstudiante(estudianteId, ev.id);
      return { nota, realizada: nota !== null };
    });
    
    // Si el estudiante no ha realizado NINGUNA evaluación, retornar null
    const evaluacionesRealizadas = notasConStatus.filter(n => n.realizada).length;
    if (evaluacionesRealizadas === 0) return null;
    
    // Calcular promedio incluyendo las no realizadas como 0
    const notasParaPromedio = notasConStatus.map(n => n.nota !== null ? n.nota : 0);
    return notasParaPromedio.reduce((sum, nota) => sum + nota, 0) / notasParaPromedio.length;
  };

  // Función para mostrar detalle de respuestas desde la tabla de notas
  const mostrarDetalleDesdeTabla = async (estudianteId: string, evaluacionId: string) => {
    try {
      // Buscar el resultado específico
      const resultado = resultadosCompletos.find(r => 
        r.idestudiante === estudianteId && r.idevaluacion === evaluacionId
      );
      
      if (!resultado) {
        console.error('❌ No se encontró resultado para este estudiante y evaluación');
        return;
      }

      // Buscar los datos del estudiante para obtener el nombre completo
      const estudiante = estudiantes.find(est => 
        (est.id || est.idestudiante) === estudianteId
      );

      // Buscar la evaluación para obtener las preguntas
      let evaluacion = evaluaciones.find(ev => ev.id === evaluacionId);
      
      // Si no tenemos las preguntas, cargar la evaluación completa desde la API
      if (!evaluacion || !evaluacion.preguntas || evaluacion.preguntas.length === 0) {
        const response = await fetch(`/api/cassandraDB/evaluaciones?curso=${cursoSeleccionado}`);
        const data = await response.json();
        const evaluacionCompleta = (data.evaluaciones || []).find((ev: any) => ev.id === evaluacionId);
        
        if (evaluacionCompleta) {
          evaluacion = evaluacionCompleta;
        }
      }
      
      if (!evaluacion) {
        console.error('❌ No se encontró la evaluación');
        return;
      }

      // Enriquecer el resultado con los datos del estudiante
      const resultadoCompleto = {
        ...resultado,
        nombreCompleto: estudiante?.nombreCompleto || estudiante?.nombreUsuario || resultado.idestudiante
      };

      // Usar el nuevo estado
      setDialogRespuestasTabla({
        open: true,
        estudiante: resultadoCompleto,
        evaluacion: evaluacion
      });
      
    } catch (error) {
      console.error('❌ Error al mostrar detalle desde tabla:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow mt-8">
      <Tabs value={tab} onValueChange={setTab} className="w-full">        <TabsList className="mb-6 w-full">
          <TabsTrigger value="crear">Crear evaluación</TabsTrigger>
          <TabsTrigger value="ver">Evaluaciones</TabsTrigger>
          <TabsTrigger value="notas">Notas de estudiantes</TabsTrigger>
        </TabsList>
        <TabsContent value="crear">
          <h1 className="text-2xl font-bold mb-6">Crear evaluación tipo test</h1>
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div>
              <label className="font-medium">Curso</label>
              {cursos.length === 0 ? (
                <div className="text-gray-500">No tienes cursos asignados como docente.</div>
              ) : (
                <select
                  className="border rounded px-2 py-1 w-full mt-1"
                  value={cursoSeleccionado}
                  onChange={e => setCursoSeleccionado(e.target.value)}
                  required
                >
                  {cursos.map(c => (
                    <option key={c._id} value={c._id}>{c.nombreCurso}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="font-medium">Nombre de la evaluación</label>
              <Input value={nombre} onChange={e => setNombre(e.target.value)} required />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="font-medium">Fecha de inicio</label>
                <Input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} required />
              </div>
              <div className="flex-1">
                <label className="font-medium">Fecha de fin</label>
                <Input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} required />
              </div>
            </div>
            <div>
              <label className="font-medium mb-2 block">Preguntas</label>
              {preguntas.map((preg, idx) => (
                <div key={idx} className="border rounded-lg p-4 mb-4 bg-gray-50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold">Pregunta {idx + 1}</span>
                    {preguntas.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => handleEliminarPregunta(idx)} className="text-red-500">Eliminar</Button>
                    )}
                  </div>
                  <Textarea
                    value={preg.enunciado}
                    onChange={e => handlePreguntaChange(idx, "enunciado", e.target.value)}
                    placeholder="Enunciado de la pregunta"
                    required
                    className="mb-2"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                    {preg.opciones.map((op, opIdx) => (
                      <div key={opIdx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`respuestaCorrecta-${idx}`}
                          checked={preg.respuestaCorrecta === opIdx}
                          onChange={() => handlePreguntaChange(idx, "respuestaCorrecta", opIdx)}
                          className="accent-blue-600"
                        />
                        <Input
                          value={op}
                          onChange={e => handleOpcionChange(idx, opIdx, e.target.value)}
                          placeholder={`Opción ${opIdx + 1}`}
                          required
                        />
                      </div>
                    ))}
                  </div>
                  <span className="text-xs text-gray-500">Selecciona la respuesta correcta</span>
                </div>
              ))}
              <Button type="button" onClick={handleAgregarPregunta} className="mt-2">+ Agregar pregunta</Button>
            </div>
            <Button type="submit" disabled={saving || cursos.length === 0}>{saving ? "Guardando..." : "Crear evaluación"}</Button>
            {success && <div className="text-green-600 text-sm mt-2">{success}</div>}
            {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
          </form>
        </TabsContent>
        <TabsContent value="ver">
          <h1 className="text-2xl font-bold mb-6">Evaluaciones creadas</h1>
          <div className="mb-4">
            <label className="font-medium">Curso</label>
            <select
              className="border rounded px-2 py-1 w-full mt-1"
              value={cursoSeleccionado}
              onChange={e => setCursoSeleccionado(e.target.value)}
            >
              {cursos.map(c => (
                <option key={c._id} value={c._id}>{c.nombreCurso}</option>
              ))}
            </select>
          </div>
          <div className="space-y-4">
            {evaluaciones.length === 0 && <div className="text-gray-500">No hay evaluaciones para este curso.</div>}
            {evaluaciones.map(ev => (
              <div key={ev.id} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-center gap-2">                  <div>
                    <div className="font-semibold text-lg">{ev.nombre}</div>
                    <div className="text-xs text-gray-500">{formatDateForInput(ev.fechainicio)} - {formatDateForInput(ev.fechafin)}</div>
                  </div>
                  <div className="flex gap-2">                    <Button size="sm" onClick={() => cargarResultados(ev)}>Ver resultados</Button>
                    <Button size="sm" variant="outline" onClick={() => handleEdit(ev)}>Editar</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(ev.id)} disabled={deletingId === ev.id}>{deletingId === ev.id ? "Eliminando..." : "Eliminar"}</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Dialog de resultados */}
          <Dialog open={resultadosDialogOpen} onOpenChange={setResultadosDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>Resultados de: {evaluacionSeleccionada?.nombre}</DialogTitle>
              </DialogHeader>              <ScrollArea className="max-h-[70vh] pr-4">
                {resultadosDetallados.length === 0 ? (
                  <div className="text-gray-500 text-center py-8">Ningún estudiante ha realizado esta evaluación.</div>
                ) : (
                  <div className="bg-white rounded-lg border overflow-hidden">
                    <table className="min-w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Estudiante
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Calificación
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Aciertos
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Fecha realizada
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {resultadosDetallados
                          .sort((a, b) => b.calificacion - a.calificacion) // Ordenar por calificación descendente
                          .map((resultado, idx) => {
                            const totalPreguntas = evaluacionSeleccionada?.preguntas?.length || 0;
                            const respuestasCorrectas = (resultado.respuestas || []).filter((resp: number, i: number) => 
                              esRespuestaCorrecta(i, resp)
                            ).length;
                            
                            return (
                              <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="text-sm font-medium text-gray-900">
                                      {resultado.nombreCompleto || resultado.idestudiante}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                    resultado.calificacion >= 70 ? 'bg-green-100 text-green-800' :
                                    resultado.calificacion >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {resultado.calificacion.toFixed(1)}%
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                  <div className="text-sm text-gray-900">
                                    {respuestasCorrectas}/{totalPreguntas}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                  <div className="text-sm text-gray-900">
                                    {new Date(resultado.fecharealizada).toLocaleDateString('es-ES', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => mostrarDetalleRespuestas(resultado)}
                                    className="hover:bg-blue-50 hover:text-blue-600"
                                  >
                                    Ver respuestas
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </ScrollArea>
              <DialogFooter>
                <Button onClick={() => setResultadosDialogOpen(false)}>Cerrar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>          {/* Dialog de detalle de respuestas */}
          <Dialog open={detalleRespuestasOpen} onOpenChange={setDetalleRespuestasOpen}>
            <DialogContent className="max-w-5xl max-h-[90vh]"><DialogHeader>
                <DialogTitle>
                  Detalle de respuestas - {estudianteSeleccionado?.nombreCompleto || estudianteSeleccionado?.idestudiante}
                </DialogTitle>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>
                    Evaluación: <span className="font-medium">{evaluacionSeleccionada?.nombre}</span>
                  </div>
                  <div className="flex gap-4">
                    <span>Calificación: <span className={`font-bold ${
                      (estudianteSeleccionado?.calificacion || 0) >= 70 ? 'text-green-600' :
                      (estudianteSeleccionado?.calificacion || 0) >= 50 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>{estudianteSeleccionado?.calificacion?.toFixed(1)}%</span></span>
                    <span>Realizado el: {estudianteSeleccionado?.fecharealizada ? new Date(estudianteSeleccionado.fecharealizada).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'N/A'}</span>
                  </div>
                </div>
              </DialogHeader>              <ScrollArea className="max-h-[70vh] pr-4">
                {evaluacionSeleccionada?.preguntas?.map((pregunta: any, idx: number) => {
                  const respuestaEstudiante = estudianteSeleccionado?.respuestas?.[idx];
                  const esCorrecto = esRespuestaCorrecta(idx, respuestaEstudiante);
                  const sinResponder = esRespuestaSinResponder(respuestaEstudiante);
                  
                  return (
                    <div key={idx} className="border rounded-lg p-4 mb-4 bg-white">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-lg">Pregunta {idx + 1}</h3>
                        <Badge variant={sinResponder ? "outline" : (esCorrecto ? "default" : "destructive")}>
                          {sinResponder ? "Sin respuesta" : (esCorrecto ? "Acertada" : "Fallada")}
                        </Badge>
                      </div>
                      
                      <p className="mb-4 text-gray-700">{pregunta.enunciado}</p>
                      
                      {sinResponder ? (
                        <div className="bg-gray-100 border border-gray-300 p-3 rounded">
                          <div className="flex items-center gap-2 text-gray-600">
                            <span className="font-medium">El estudiante no respondió esta pregunta</span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {pregunta.opciones?.map((opcion: string, opIdx: number) => {
                            const esRespuestaCorrecta = opIdx === pregunta.respuestaCorrecta;
                            const esRespuestaEstudiante = opIdx === respuestaEstudiante;
                            
                            let bgColor = "";
                            if (esRespuestaCorrecta && esRespuestaEstudiante) {
                              bgColor = "bg-green-100 border-green-300"; // Correcto y elegido
                            } else if (esRespuestaCorrecta) {
                              bgColor = "bg-green-50 border-green-200"; // Respuesta correcta
                            } else if (esRespuestaEstudiante) {
                              bgColor = "bg-red-100 border-red-300"; // Elegido pero incorrecto
                            } else {
                              bgColor = "bg-gray-50 border-gray-200"; // No elegido
                            }
                            
                            return (
                              <div key={opIdx} className={`p-3 rounded border ${bgColor}`}>
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-2">
                                    {esRespuestaEstudiante && (
                                      <span className="text-blue-600 font-semibold">→</span>
                                    )}
                                    {esRespuestaCorrecta && (
                                      <span className="text-green-600 font-semibold">✓</span>
                                    )}
                                  </div>
                                  <span className="font-medium">Opción {opIdx + 1}:</span>
                                  <span>{opcion}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </ScrollArea>
              <DialogFooter>
                <Button onClick={() => setDetalleRespuestasOpen(false)}>Cerrar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {/* Dialogo de edición */}          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>Editar evaluación</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[70vh] pr-4">
                <form onSubmit={e => { e.preventDefault(); handleEditSave(); }} className="flex flex-col gap-4">
                  <div>
                    <label className="font-medium">Nombre de la evaluación</label>
                    <Input value={editNombre} onChange={e => setEditNombre(e.target.value)} required />
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="font-medium">Fecha de inicio</label>
                      <Input type="date" value={editFechaInicio} onChange={e => setEditFechaInicio(e.target.value)} required />
                    </div>
                    <div className="flex-1">
                      <label className="font-medium">Fecha de fin</label>
                      <Input type="date" value={editFechaFin} onChange={e => setEditFechaFin(e.target.value)} required />
                    </div>
                  </div>
                  <div>
                    <label className="font-medium mb-2 block">Preguntas</label>
                    {editPreguntas.map((preg, idx) => (
                      <div key={idx} className="border rounded-lg p-4 mb-4 bg-gray-50">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold">Pregunta {idx + 1}</span>
                          {editPreguntas.length > 1 && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => setEditPreguntas(prev => prev.filter((_, i) => i !== idx))} className="text-red-500">Eliminar</Button>
                          )}
                        </div>
                        <Textarea
                          value={preg.enunciado}
                          onChange={e => setEditPreguntas(prev => prev.map((p, i) => i === idx ? { ...p, enunciado: e.target.value } : p))}
                          placeholder="Enunciado de la pregunta"
                          required
                          className="mb-2"
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                          {preg.opciones.map((op: string, opIdx: number) => (
                            <div key={opIdx} className="flex items-center gap-2">
                              <input
                                type="radio"
                                name={`edit-respuestaCorrecta-${idx}`}
                                checked={preg.respuestaCorrecta === opIdx}
                                onChange={() => setEditPreguntas(prev => prev.map((p, i) => i === idx ? { ...p, respuestaCorrecta: opIdx } : p))}
                                className="accent-blue-600"
                              />
                              <Input
                                value={op}
                                onChange={e => setEditPreguntas(prev => prev.map((p, i) => i === idx ? { ...p, opciones: p.opciones.map((o: string, j: number) => j === opIdx ? e.target.value : o) } : p))}
                                placeholder={`Opción ${opIdx + 1}`}
                                required
                              />
                            </div>
                          ))}
                        </div>
                        <span className="text-xs text-gray-500">Selecciona la respuesta correcta</span>
                      </div>
                    ))}
                    <Button type="button" onClick={() => setEditPreguntas(prev => [...prev, { enunciado: "", opciones: ["", "", "", ""], respuestaCorrecta: 0 }])} className="mt-2">+ Agregar pregunta</Button>
                  </div>
                  {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
                </form>
              </ScrollArea>
              <DialogFooter>
                <Button onClick={handleEditSave} disabled={saving}>{saving ? "Guardando..." : "Guardar cambios"}</Button>
                <Button type="button" variant="ghost" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="notas">
          <h1 className="text-2xl font-bold mb-6">Notas de estudiantes</h1>
          <div className="mb-4">
            <label className="font-medium">Curso</label>
            <select
              className="border rounded px-2 py-1 w-full mt-1"
              value={cursoSeleccionado}
              onChange={e => setCursoSeleccionado(e.target.value)}
            >
              {cursos.map(c => (
                <option key={c._id} value={c._id}>{c.nombreCurso}</option>
              ))}
            </select>
          </div>

          {loadingEstudiantes ? (
            <div className="text-center py-8">
              <div className="text-gray-500">Cargando estudiantes y evaluaciones...</div>
            </div>
          ) : estudiantes.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500">No hay estudiantes matriculados en este curso.</div>
            </div>
          ) : evaluaciones.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500">No hay evaluaciones creadas para este curso.</div>
            </div>          ) : (
            <div className="overflow-x-auto">
              <div className="bg-white rounded-lg shadow border">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border-b px-4 py-3 text-left font-semibold text-gray-900">
                        Estudiante
                      </th>
                      {evaluaciones.map(ev => (
                        <th key={ev.id} className="border-b px-4 py-3 text-center font-semibold text-gray-900 min-w-[120px]">
                          <div className="text-sm">{ev.nombre}</div>
                          <div className="text-xs text-gray-500 font-normal">
                            {formatDateForInput(ev.fechainicio)} - {formatDateForInput(ev.fechafin)}
                          </div>
                          <div className="text-xs text-blue-500 font-normal mt-1">
                            (Click para ver respuestas)
                          </div>
                        </th>
                      ))}
                      <th className="border-b px-4 py-3 text-center font-semibold text-gray-900 bg-blue-50">
                        Promedio
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {estudiantes.map((estudiante, idx) => {
                      const promedio = calcularPromedioEstudiante(estudiante.id || estudiante.idestudiante);
                      return (
                        <tr key={estudiante.id || estudiante.idestudiante || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="border-b px-4 py-3">
                            <div 
                              className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 rounded-lg p-2 transition-all duration-200"
                              onClick={() => router.push(`/menu/perfil?username=${estudiante.nombreUsuario}`)}
                            >
                              <Avatar className="h-10 w-10">
                                {estudiante.foto ? (
                                  <AvatarImage 
                                    src={estudiante.foto} 
                                    alt={estudiante.nombreCompleto || estudiante.nombreUsuario || 'Usuario'}
                                    onError={(e) => {
                                      // Si la imagen falla, usar el fallback
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                    }}
                                  />
                                ) : null}
                                <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold">
                                  {estudiante.nombreCompleto && estudiante.nombreCompleto.trim() 
                                    ? estudiante.nombreCompleto.trim().charAt(0).toUpperCase()
                                    : (estudiante.nombreUsuario ? estudiante.nombreUsuario.charAt(0).toUpperCase() : 'U')
                                  }
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <div className="font-medium text-gray-900 hover:text-blue-600 transition-colors">
                                  {estudiante.nombreCompleto && estudiante.nombreCompleto.trim() 
                                    ? estudiante.nombreCompleto.trim() 
                                    : estudiante.nombreUsuario || `Estudiante ${estudiante.id || estudiante.idestudiante}`
                                  }
                                </div>
                                {estudiante.nombreUsuario && (
                                  <div className="text-sm text-gray-500">@{estudiante.nombreUsuario}</div>
                                )}
                              </div>                            </div>
                          </td>
                          {evaluaciones.map(evaluacion => {
                            const nota = obtenerNotaEstudiante(estudiante.id || estudiante.idestudiante, evaluacion.id);
                            return (
                              <td key={evaluacion.id} className="border-b px-4 py-3 text-center">
                                {nota !== null ? (
                                  <div 
                                    className="cursor-pointer hover:scale-105 transition-transform"
                                    onClick={() => mostrarDetalleDesdeTabla(estudiante.id || estudiante.idestudiante, evaluacion.id)}
                                  >
                                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium hover:shadow-md transition-shadow ${
                                      nota >= 70 ? 'bg-green-100 text-green-800 hover:bg-green-200' :
                                      nota >= 50 ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' :
                                      'bg-red-100 text-red-800 hover:bg-red-200'
                                    }`}>
                                      {nota.toFixed(1)}%
                                    </div>
                                  </div>                                ) : (
                                  <div className="text-gray-500 text-sm">
                                    <div className="text-red-600 font-medium">0%</div>
                                    <div className="text-xs text-gray-400">No realizada</div>
                                  </div>
                                )}
                              </td>
                            );
                          })}
                          <td className="border-b px-4 py-3 text-center bg-blue-50">
                            {promedio !== null ? (
                              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                                promedio >= 70 ? 'bg-green-100 text-green-800' :
                                promedio >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {promedio.toFixed(1)}%
                              </div>
                            ) : (
                              <div className="text-gray-400 text-sm">Sin notas</div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Resumen estadístico */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-lg font-semibold text-blue-900">
                    {estudiantes.length}
                  </div>
                  <div className="text-sm text-blue-700">
                    Estudiantes matriculados
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-lg font-semibold text-green-900">
                    {evaluaciones.length}
                  </div>
                  <div className="text-sm text-green-700">
                    Evaluaciones creadas
                  </div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-lg font-semibold text-purple-900">
                    {(() => {
                      const promedios = estudiantes.map(est => 
                        calcularPromedioEstudiante(est.id || est.idestudiante)
                      ).filter(p => p !== null);
                      return promedios.length > 0 ? 
                        (promedios.reduce((sum, p) => sum + p, 0) / promedios.length).toFixed(1) + '%' :
                        'N/A';
                    })()}
                  </div>
                  <div className="text-sm text-purple-700">
                    Promedio general del curso
                  </div>
                </div>
              </div>
            </div>
          )}        </TabsContent>
      </Tabs>      {/* Dialog independiente para respuestas desde tabla */}
      <Dialog 
        open={dialogRespuestasTabla.open} 
        onOpenChange={(open) => setDialogRespuestasTabla(prev => ({ ...prev, open }))}
      >        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              Detalle de respuestas - {dialogRespuestasTabla.estudiante?.nombreCompleto || dialogRespuestasTabla.estudiante?.idestudiante}
            </DialogTitle>
            <DialogDescription>
              Respuestas detalladas del estudiante para esta evaluación
            </DialogDescription>
            <div className="text-sm text-gray-600 space-y-1">
              <div>
                Evaluación: <span className="font-medium">{dialogRespuestasTabla.evaluacion?.nombre}</span>
              </div>
              <div className="flex gap-4">
                <span>Calificación: <span className={`font-bold ${
                  (dialogRespuestasTabla.estudiante?.calificacion || 0) >= 70 ? 'text-green-600' :
                  (dialogRespuestasTabla.estudiante?.calificacion || 0) >= 50 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>{dialogRespuestasTabla.estudiante?.calificacion?.toFixed(1)}%</span></span>
                <span>Realizado el: {dialogRespuestasTabla.estudiante?.fecharealizada ? new Date(dialogRespuestasTabla.estudiante.fecharealizada).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : 'N/A'}</span>
              </div>
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">            {dialogRespuestasTabla.evaluacion?.preguntas?.map((pregunta: any, idx: number) => {
              const respuestaEstudiante = dialogRespuestasTabla.estudiante?.respuestas?.[idx];
              // Verificar si una respuesta es correcta para esta pregunta específica
              const esCorrecto = respuestaEstudiante !== undefined && respuestaEstudiante !== null && respuestaEstudiante !== -1 && respuestaEstudiante === pregunta.respuestaCorrecta;
              // Verificar si el estudiante no respondió una pregunta
              const sinResponder = respuestaEstudiante === undefined || respuestaEstudiante === null || respuestaEstudiante === -1;
              
              return (
                <div key={idx} className="border rounded-lg p-4 mb-4 bg-white">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-lg">Pregunta {idx + 1}</h3>
                    <Badge variant={sinResponder ? "outline" : (esCorrecto ? "default" : "destructive")}>
                      {sinResponder ? "Sin respuesta" : (esCorrecto ? "Acertada" : "Fallada")}
                    </Badge>
                  </div>
                  
                  <p className="mb-4 text-gray-700">{pregunta.enunciado}</p>
                  
                  {sinResponder ? (
                    <div className="bg-gray-100 border border-gray-300 p-3 rounded">
                      <div className="flex items-center gap-2 text-gray-600">
                        <span className="font-medium">El estudiante no respondió esta pregunta</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pregunta.opciones?.map((opcion: string, opIdx: number) => {
                        const esRespuestaCorrecta = opIdx === pregunta.respuestaCorrecta;
                        const esRespuestaEstudiante = opIdx === respuestaEstudiante;
                        
                        let bgColor = "";
                        if (esRespuestaCorrecta && esRespuestaEstudiante) {
                          bgColor = "bg-green-100 border-green-300"; // Correcto y elegido
                        } else if (esRespuestaCorrecta) {
                          bgColor = "bg-green-50 border-green-200"; // Respuesta correcta
                        } else if (esRespuestaEstudiante) {
                          bgColor = "bg-red-100 border-red-300"; // Elegido pero incorrecto
                        } else {
                          bgColor = "bg-gray-50 border-gray-200"; // No elegido
                        }
                        
                        return (
                          <div key={opIdx} className={`p-3 rounded border ${bgColor}`}>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-2">
                                {esRespuestaEstudiante && (
                                  <span className="text-blue-600 font-semibold">→</span>
                                )}
                                {esRespuestaCorrecta && (
                                  <span className="text-green-600 font-semibold">✓</span>
                                )}
                              </div>
                              <span className="font-medium">Opción {opIdx + 1}:</span>
                              <span>{opcion}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </ScrollArea>
          <DialogFooter>
            <Button onClick={() => setDialogRespuestasTabla(prev => ({ ...prev, open: false }))}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
