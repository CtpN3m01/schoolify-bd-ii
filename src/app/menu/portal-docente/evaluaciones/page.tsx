"use client";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export default function Evaluaciones() {
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
  const [resultadosDialogOpen, setResultadosDialogOpen] = useState(false);
  const [resultadosDetallados, setResultadosDetallados] = useState<any[]>([]);
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState<any>(null);
  const [detalleRespuestasOpen, setDetalleRespuestasOpen] = useState(false);

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

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow mt-8">
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="mb-6 w-full">
          <TabsTrigger value="crear">Crear evaluación</TabsTrigger>
          <TabsTrigger value="ver">Evaluaciones</TabsTrigger>
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
              </DialogHeader>
              <ScrollArea className="max-h-[70vh] pr-4">
                {resultadosDetallados.length === 0 ? (
                  <div className="text-gray-500 text-center py-8">Ningún estudiante ha realizado esta evaluación.</div>
                ) : (
                  <div className="space-y-4">
                    {resultadosDetallados.map((resultado, idx) => {
                      const totalPreguntas = evaluacionSeleccionada?.preguntas?.length || 0;
                      const respuestasCorrectas = (resultado.respuestas || []).filter((resp: number, i: number) => 
                        esRespuestaCorrecta(i, resp)
                      ).length;
                      
                      return (                        <div key={idx} className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                             onClick={() => mostrarDetalleRespuestas(resultado)}>
                          <div className="flex justify-between items-center">
                            <div className="flex-1">
                              <div className="font-semibold text-lg">{resultado.nombreCompleto || resultado.idestudiante}</div>
                              <div className="text-sm text-gray-600">
                                Realizado el: {new Date(resultado.fecharealizada).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-blue-600">{resultado.calificacion.toFixed(1)}%</div>
                              <div className="text-sm text-gray-600">
                                {respuestasCorrectas}/{totalPreguntas} aciertos
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
              <DialogFooter>
                <Button onClick={() => setResultadosDialogOpen(false)}>Cerrar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Dialog de detalle de respuestas */}
          <Dialog open={detalleRespuestasOpen} onOpenChange={setDetalleRespuestasOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh]">              <DialogHeader>
                <DialogTitle>
                  Detalle de respuestas - {estudianteSeleccionado?.nombreCompleto || estudianteSeleccionado?.idestudiante}
                </DialogTitle>
                <div className="text-sm text-gray-600">
                  Calificación: {estudianteSeleccionado?.calificacion?.toFixed(1)}% | 
                  Realizado el: {estudianteSeleccionado?.fecharealizada ? new Date(estudianteSeleccionado.fecharealizada).toLocaleDateString() : 'N/A'}
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
      </Tabs>
    </div>
  );
}
