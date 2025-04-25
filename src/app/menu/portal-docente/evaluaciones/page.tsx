"use client";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

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
    const res = await fetch(`/api/cassandraDB/evaluaciones?resultados=1&idEstudiante=&idCurso=${cursoSeleccionado}`);
    const data = await res.json();
    // Filtrar solo los resultados de esta evaluación
    setResultados((data.resultados || []).filter((r: any) => r.idevaluacion === evaluacion.id));
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

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    setSuccess("");
    setError("");
    try {
      const body = {
        idCurso: cursoSeleccionado,
        nombre,
        fechaInicio: fechaInicio ? new Date(fechaInicio).toISOString() : null,
        fechaFin: fechaFin ? new Date(fechaFin).toISOString() : null,
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

  // Editar evaluación: abrir dialog y cargar datos
  const handleEdit = (ev: any) => {
    setEditEval(ev);
    setEditNombre(ev.nombre);
    setEditFechaInicio(ev.fechainicio ? new Date(ev.fechainicio).toISOString().slice(0,10) : "");
    setEditFechaFin(ev.fechafin ? new Date(ev.fechafin).toISOString().slice(0,10) : "");
    setEditPreguntas(ev.preguntas || []);
    setEditDialogOpen(true);
  };

  // Guardar cambios de edición
  const handleEditSave = async () => {
    if (!editEval) return;
    setSaving(true);
    setError("");
    try {
      const body = {
        id: editEval.id,
        idCurso: cursoSeleccionado,
        nombre: editNombre,
        fechaInicio: editFechaInicio ? new Date(editFechaInicio).toISOString() : null,
        fechaFin: editFechaFin ? new Date(editFechaFin).toISOString() : null,
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
                <div className="flex justify-between items-center gap-2">
                  <div>
                    <div className="font-semibold text-lg">{ev.nombre}</div>
                    <div className="text-xs text-gray-500">{new Date(ev.fechainicio).toLocaleDateString()} - {new Date(ev.fechafin).toLocaleDateString()}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => cargarResultados(ev)} variant={evaluacionSeleccionada?.id === ev.id ? "default" : "outline"}>Ver resultados</Button>
                    <Button size="sm" variant="outline" onClick={() => handleEdit(ev)}>Editar</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(ev.id)} disabled={deletingId === ev.id}>{deletingId === ev.id ? "Eliminando..." : "Eliminar"}</Button>
                  </div>
                </div>
                {evaluacionSeleccionada?.id === ev.id && (
                  <div className="mt-4">
                    <h3 className="font-semibold mb-2">Resultados de estudiantes</h3>
                    {resultados.length === 0 ? (
                      <div className="text-gray-500 text-sm">Ningún estudiante ha realizado esta evaluación.</div>
                    ) : (
                      <table className="w-full text-sm border mt-2">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border px-2 py-1">Estudiante</th>
                            <th className="border px-2 py-1">Nota</th>
                            <th className="border px-2 py-1">Respuestas</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resultados.map((r, idx) => (
                            <tr key={idx}>
                              <td className="border px-2 py-1">{r.idestudiante || "-"}</td>
                              <td className="border px-2 py-1">{r.calificacion}</td>
                              <td className="border px-2 py-1">
                                {(r.respuestas || []).map((resp: number, i: number) => (
                                  <div key={i}>
                                    Pregunta {i + 1}: Opción {resp + 1}
                                  </div>
                                ))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          {/* Dialogo de edición */}
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar evaluación</DialogTitle>
              </DialogHeader>
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
                <DialogFooter>
                  <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar cambios"}</Button>
                  <Button type="button" variant="ghost" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
                </DialogFooter>
                {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
