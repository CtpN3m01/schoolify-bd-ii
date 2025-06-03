'use client';

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, MessageSquare, Users, GraduationCap, Send, Plus, Clock, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Image from "next/image";
import { useUser } from "@/app/UserContext";

interface Curso {
  id: string;
  _id: string;
  nombreCurso: string;
  descripcion: string;
  foto: string;
  nombreUsuarioDocente: string;
  fechaInicio: string;
  fechaFin: string;
  modulos: any[];
  contenido?: any[];
}

export default function CursoDetallePage() {
  // Date handling helpers to avoid timezone issues
  const formatDateForDisplay = (isoString: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${day}/${month}/${year}`;
  };

  const formatNeo4jDate = (dateStr: string) => {
    if (!dateStr) return 'No especificada';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('es-ES');
    } catch {
      return 'Fecha inválida';
    }
  };

  const router = useRouter();
  const params = useParams();
  const { user } = useUser();
  const [curso, setCurso] = useState<Curso | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("modulos");
  const [openModulo, setOpenModulo] = useState<number | null>(null);
  const [openSubseccion, setOpenSubseccion] = useState<{mod: number, sub: number} | null>(null);
  
  // Estados para evaluaciones
  const [evaluaciones, setEvaluaciones] = useState<any[]>([]);
  const [loadingEvaluaciones, setLoadingEvaluaciones] = useState(false);
  const [evaluacionEnCurso, setEvaluacionEnCurso] = useState<any>(null);
  const [respuestasEvaluacion, setRespuestasEvaluacion] = useState<number[]>([]);
  const [loadingRespuesta, setLoadingRespuesta] = useState(false);  const [resultadosEvaluaciones, setResultadosEvaluaciones] = useState<any[]>([]);
  const [evaluacionDialogOpen, setEvaluacionDialogOpen] = useState(false);
  const [modoRevision, setModoRevision] = useState(false);
    // Estados para estudiantes
  const [estudiantes, setEstudiantes] = useState<any[]>([]);
  const [loadingEstudiantes, setLoadingEstudiantes] = useState(false);  // Estados para comentarios
  const [comentarios, setComentarios] = useState<{ [seccionId: string]: any[] }>({});
  const [loadingComentarios, setLoadingComentarios] = useState<{ [seccionId: string]: boolean }>({});
  const [nuevoComentario, setNuevoComentario] = useState<{ [seccionId: string]: string }>({});
  const [enviandoComentario, setEnviandoComentario] = useState<{ [seccionId: string]: boolean }>({});
  // Estados para consultas/mensajes
  const [consultas, setConsultas] = useState<any[]>([]);
  const [loadingConsultas, setLoadingConsultas] = useState(false);
  const [nuevaConsulta, setNuevaConsulta] = useState({ titulo: '', mensaje: '' });
  const [mostrarFormConsulta, setMostrarFormConsulta] = useState(false);
  const [enviandoConsulta, setEnviandoConsulta] = useState(false);
  const [respuestaConsulta, setRespuestaConsulta] = useState<{ [consultaId: string]: string }>({});
  const [loadingRespuestaConsulta, setLoadingRespuestaConsulta] = useState<{ [consultaId: string]: boolean }>({});
  
  // Refs para evitar múltiples ejecuciones
  const comentarioRequestRef = useRef<{ [seccionId: string]: boolean }>({});
  const consultaRequestRef = useRef<boolean>(false);
  const lastCommentTimeRef = useRef<{ [seccionId: string]: number }>({});
  const lastConsultaTimeRef = useRef<number>(0);

  // Función para navegar al chat del docente
  const abrirChatDocente = useCallback(async () => {
    if (!curso?.nombreUsuarioDocente || !user) return;

    try {
      // Navegar al chat con el parámetro del username del docente
      router.push(`/menu/chats?abrir=${encodeURIComponent(curso.nombreUsuarioDocente)}`);
    } catch (error) {
      console.error('Error al abrir chat del docente:', error);
      toast('Error al abrir el chat del docente');
    }
  }, [curso?.nombreUsuarioDocente, user, router]);  // Función para ir al chat del docente (usando la misma lógica que en amigos)
  const irAlChatDocente = async () => {
    if (!curso?.nombreUsuarioDocente || !user?._id) {
      toast('No se pudo encontrar la información del docente o del usuario actual');
      return;
    }
    
    try {
      // Buscar al docente por username para obtener su ObjectId
      const response = await fetch(`/api/neo4jDB/buscar-usuario-por-username?username=${encodeURIComponent(curso.nombreUsuarioDocente)}&userId=${encodeURIComponent(user._id)}`);
      
      if (!response.ok) {
        throw new Error('Error al buscar el docente');
      }

      const data = await response.json();
      
      if (data._id) {
        // Navegar al chat usando el ObjectId del docente (igual que en amigos)
        router.push(`/menu/chats?userId=${data._id}`);
      } else {
        toast('No se encontró el docente en el sistema');
      }
    } catch (error) {
      console.error('Error al buscar el docente:', error);
      toast('Error al abrir el chat del docente');
    }
  };

  // Función para matricular al usuario automáticamente
  const matricularUsuario = useCallback(async (cursoId: string, usuarioId: string) => {
    try {
      console.log('=== MATRICULANDO USUARIO AUTOMÁTICAMENTE ===');
      console.log('Curso ID:', cursoId);
      console.log('Usuario ID:', usuarioId);

      const response = await fetch('/api/neo4jDB/matricular-usuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuarioId: usuarioId,
          cursoId: cursoId
        })
      });

      const data = await response.json();
      console.log('Resultado de matriculación:', data);

      if (response.ok) {
        console.log('Usuario matriculado exitosamente');
        return true;
      } else {
        console.log('Error al matricular:', data.message);
        return false;
      }
    } catch (error) {
      console.error('Error matriculando usuario:', error);
      return false;
    }
  }, []);

  // Funciones para comentarios
  const cargarComentarios = useCallback(async (seccionId: string) => {
    if (!curso) return;
    
    console.log('=== DEBUGGING CARGAR COMENTARIOS ===');
    console.log('Cargando comentarios para sección:', seccionId);
    console.log('Curso ID:', curso._id || curso.id);
    
    setLoadingComentarios(prev => ({ ...prev, [seccionId]: true }));
    try {
      const response = await fetch(`/api/neo4jDB/comentarios-seccion?seccionId=${seccionId}&cursoId=${curso._id || curso.id}`);
      const data = await response.json();
      
      console.log('Respuesta del API:', data);
      
      if (response.ok) {
        console.log('=== DEBUGGING COMENTARIOS CARGADOS ===');
        console.log('Comentarios originales:', data.comentarios);
        if (data.comentarios && data.comentarios.length > 0) {
          console.log('Primer comentario fecha:', data.comentarios[0].fecha);
          console.log('Tipo de fecha:', typeof data.comentarios[0].fecha);
        }        // Procesar comentarios para arreglar las fechas - mantener tanto fecha como hora
        const comentariosProcesados = (data.comentarios || []).map((comentario: any) => {
          // Crear una fecha válida - usar la fecha del comentario o la fecha actual
          let fechaValida = new Date();
          
          // Intentar parsear la fecha del comentario si existe
          if (comentario.fecha) {
            const fechaParsed = new Date(comentario.fecha);
            if (!isNaN(fechaParsed.getTime())) {
              fechaValida = fechaParsed;
            }
          }
          
          return {
            ...comentario,
            fechaCompleta: fechaValida,
            fechaFormateada: fechaValida.toLocaleDateString('es-ES'),
            horaFormateada: fechaValida.toLocaleTimeString('es-ES'),
            epochMillis: comentario.epochMillis || fechaValida.getTime()
          };
        });

        // Deduplicar comentarios por ID o por combinación de autor+texto+fecha
        const comentariosUnicos = comentariosProcesados.filter((comentario: any, index: number, array: any[]) => {
          if (comentario.id) {
            // Si tiene ID, usar ID para deduplicar
            return array.findIndex((c: any) => c.id === comentario.id) === index;
          } else {
            // Si no tiene ID, usar combinación de autor+texto+epochMillis
            return array.findIndex((c: any) => 
              c.autor === comentario.autor && 
              c.texto === comentario.texto && 
              Math.abs((c.epochMillis || 0) - (comentario.epochMillis || 0)) < 1000 // mismo comentario si está dentro de 1 segundo
            ) === index;
          }
        });
        
        console.log('Comentarios procesados:', comentariosUnicos);
        setComentarios(prev => ({ ...prev, [seccionId]: comentariosUnicos }));
      } else if (response.status === 404) {
        // La sección de comentarios no existe aún, crear array vacío
        console.log('Sección de comentarios no encontrada, se creará al agregar el primer comentario');
        setComentarios(prev => ({ ...prev, [seccionId]: [] }));
      } else {
        console.error('Error al cargar comentarios:', data.error);
        setComentarios(prev => ({ ...prev, [seccionId]: [] }));
      }
    } catch (e) {
      console.error('Error cargando comentarios:', e);
      setComentarios(prev => ({ ...prev, [seccionId]: [] }));
    } finally {
      setLoadingComentarios(prev => ({ ...prev, [seccionId]: false }));
    }
  }, [curso]);  const agregarComentario = useCallback(async (seccionId: string) => {
    const texto = nuevoComentario[seccionId]?.trim();
    if (!texto || !user || !curso || enviandoComentario[seccionId] || comentarioRequestRef.current[seccionId]) return;

    // Prevenir envíos muy rápidos (debounce de 1 segundo)
    const now = Date.now();
    if (lastCommentTimeRef.current[seccionId] && now - lastCommentTimeRef.current[seccionId] < 1000) {
      console.log('Comentario bloqueado por debounce');
      return;
    }
    lastCommentTimeRef.current[seccionId] = now;

    // Prevenir múltiples envíos usando ref y estado
    comentarioRequestRef.current[seccionId] = true;
    setEnviandoComentario(prev => ({ ...prev, [seccionId]: true }));

    // Debug: Log what we're sending
    console.log('=== DEBUGGING AGREGAR COMENTARIO ===');
    console.log('Usuario completo:', user);
    console.log('Curso completo:', curso);
    console.log('Datos a enviar:', {
      seccionId,
      cursoId: curso._id || curso.id,
      usuarioId: user._id,
      texto
    });

    try {
      const response = await fetch('/api/neo4jDB/agregar-comentario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seccionId,
          cursoId: curso._id || curso.id,
          usuarioId: user._id,
          texto
        })
      });      if (response.ok) {
        const data = await response.json();
        const nuevoComentario = data.comentario;
        
        console.log('=== DEBUGGING COMENTARIO RECIBIDO ===');
        console.log('Comentario completo:', nuevoComentario);
        console.log('Fecha original:', nuevoComentario?.fecha);
        console.log('Tipo de fecha:', typeof nuevoComentario?.fecha);
        
        // Limpiar el input
        setNuevoComentario(prev => ({ ...prev, [seccionId]: '' }));// En lugar de recargar todos los comentarios, añadir solo el nuevo comentario al final
        // para evitar duplicaciones
        if (nuevoComentario) {
          // Crear una fecha válida - usar la fecha del comentario o la fecha actual
          let fechaValida = new Date();
          
          // Intentar parsear la fecha del comentario si existe
          if (nuevoComentario.fecha) {
            const fechaParsed = new Date(nuevoComentario.fecha);
            if (!isNaN(fechaParsed.getTime())) {
              fechaValida = fechaParsed;
            }
          }
          
          const comentarioProcesado = {
            ...nuevoComentario,
            fechaCompleta: fechaValida,
            fechaFormateada: fechaValida.toLocaleDateString('es-ES'),
            horaFormateada: fechaValida.toLocaleTimeString('es-ES'),
            epochMillis: nuevoComentario.epochMillis || fechaValida.getTime()
          };
          
          setComentarios(prev => {
            const comentariosActuales = prev[seccionId] || [];
            // Verificar que no existe ya este comentario (por ID o por contenido similar)
            const yaExiste = comentariosActuales.some((c: any) => {
              if (c.id && comentarioProcesado.id) {
                return c.id === comentarioProcesado.id;
              }
              return c.autor === comentarioProcesado.autor && 
                     c.texto === comentarioProcesado.texto && 
                     Math.abs((c.epochMillis || 0) - (comentarioProcesado.epochMillis || 0)) < 2000;
            });
            
            if (!yaExiste) {
              return {
                ...prev,
                [seccionId]: [...comentariosActuales, comentarioProcesado]
              };
            }
            return prev; // No añadir si ya existe
          });
        } else {
          // Si no se devolvió el comentario en la respuesta, recargar todos
          await cargarComentarios(seccionId);
        }
        
        toast("Comentario agregado exitosamente");
      } else {
        const data = await response.json();
        console.error('Error al agregar comentario:', data.error);
        toast(`Error al agregar comentario: "${data.error}"`);
      }    } catch (e) {
      console.error('Error agregando comentario:', e);
      toast("Error al agregar el comentario");
    } finally {
      // Liberar el estado de envío y el ref
      comentarioRequestRef.current[seccionId] = false;
      setEnviandoComentario(prev => ({ ...prev, [seccionId]: false }));
    }
  }, [curso, user, nuevoComentario, cargarComentarios, enviandoComentario]);

  useEffect(() => {
    const fetchCursoDetalle = async () => {
      try {
        setLoading(true);
        const courseId = params?.id;
        if (!courseId || !user?._id) return;
          // Cargar información del curso desde Neo4j
        const response = await fetch(`/api/neo4jDB/curso-completo-comentarios?cursoId=${courseId}&usuarioId=${user._id}`);
        if (!response.ok) throw new Error('Error al cargar el curso');
          const data = await response.json();          // Debug: Log the complete course data to see its structure
        console.log('=== DEBUGGING CURSO COMPLETO ===');
        console.log('Datos completos del curso:', JSON.stringify(data.curso, null, 2));
          // Verificar estructura de módulos vs contenido
        if (data.curso.modulos) {
          console.log('=== MÓDULOS ENCONTRADOS ===');
          console.log('Total de módulos:', data.curso.modulos.length);
          
          data.curso.modulos.forEach((mod: any, index: number) => {
            console.log(`\n--- MÓDULO ${index} ---`);
            console.log('Nombre:', mod.nombre);
            console.log('Descripción:', mod.descripcion);
            console.log('Estructura completa:', JSON.stringify(mod, null, 2));
            
            if (mod.subsecciones) {
              console.log(`✅ SUBSECCIONES ENCONTRADAS: ${mod.subsecciones.length}`);
              mod.subsecciones.forEach((sub: any, subIndex: number) => {
                console.log(`  Subsección ${subIndex}:`, JSON.stringify(sub, null, 2));
              });
            } else {
              console.log('❌ NO HAY SUBSECCIONES EN ESTE MÓDULO');
              console.log('Propiedades del módulo:', Object.keys(mod));
            }
          });
        } else {
          console.log('❌ NO HAY MÓDULOS EN EL CURSO - VERIFICANDO CONTENIDO');
        }
        
        // Verificar estructura de contenido
        if (data.curso.contenido) {
          console.log('=== CONTENIDO ENCONTRADO ===');
          console.log('Total de secciones de contenido:', data.curso.contenido.length);
          
          data.curso.contenido.forEach((seccion: any, index: number) => {
            console.log(`\n--- SECCIÓN DE CONTENIDO ${index} ---`);
            console.log('Nombre:', seccion.nombre);
            console.log('Estructura completa:', JSON.stringify(seccion, null, 2));
            
            if (seccion.subsecciones) {
              console.log(`✅ SUBSECCIONES ENCONTRADAS EN CONTENIDO: ${seccion.subsecciones.length}`);
              seccion.subsecciones.forEach((sub: any, subIndex: number) => {
                console.log(`  Subsección ${subIndex}:`, JSON.stringify(sub, null, 2));
              });
            } else {
              console.log('❌ NO HAY SUBSECCIONES EN ESTA SECCIÓN DE CONTENIDO');
            }
          });
        } else {
          console.log('❌ NO HAY CONTENIDO EN EL CURSO');
        }
          // La respuesta tiene la estructura { curso: {...}, seccionesComentarios: [...] }
        setCurso(data.curso);
        
        // Matricular al usuario automáticamente si no está matriculado
        if (user?._id && data.curso?._id) {
          await matricularUsuario(data.curso._id, user._id);
        }
        
        // Ya no necesitamos cargar desde MongoDB separadamente ya que
        // la información del curso viene completa desde Neo4j/MongoDB en el API
          // Cargar evaluaciones
        setLoadingEvaluaciones(true);
        try {
          const res = await fetch(`/api/cassandraDB/evaluaciones?curso=${courseId}`);
          const evalData = await res.json();          // Mapear los campos de la API a los que espera el componente
          const evaluacionesMapeadas = (evalData.evaluaciones || []).map((evaluacion: any) => ({
            ...evaluacion,
            titulo: evaluacion.nombre || evaluacion.titulo,
            descripcion: evaluacion.descripcion || `Evaluación del curso`,
            fechacreacion: evaluacion.fechainicio || evaluacion.fechacreacion,
            tiempolimite: evaluacion.tiempolimite || null
          }));
          setEvaluaciones(evaluacionesMapeadas);
        } catch (e) {
          console.error('Error cargando evaluaciones:', e);
          setEvaluaciones([]);
        } finally {
          setLoadingEvaluaciones(false);
        }// Cargar resultados de evaluaciones del usuario
        try {
          const userId = user._id;
          
          if (userId) {
            const res = await fetch(`/api/cassandraDB/evaluaciones?resultados=1&idEstudiante=${userId}&idCurso=${courseId}`);
            const resultData = await res.json();
            setResultadosEvaluaciones(resultData.resultados || []);
          }
        } catch (e) {
          setResultadosEvaluaciones([]);
        }

        // Cargar estudiantes matriculados
        setLoadingEstudiantes(true);
        try {
          const res = await fetch(`/api/neo4jDB/estudiantes-matriculados?cursoId=${courseId}`);
          const estudiantesData = await res.json();
          setEstudiantes(estudiantesData.estudiantes || []);
        } catch (e) {
          setEstudiantes([]);
        } finally {
          setLoadingEstudiantes(false);
        }
        
      } catch (error) {
        console.error('Error al cargar curso:', error);
      } finally {
        setLoading(false);
      }
    };    if (params?.id && user?._id) {
      fetchCursoDetalle();
    }
  }, [params?.id, user?._id, matricularUsuario]);// Funciones para evaluaciones
  const iniciarEvaluacion = (evaluacion: any) => {
    console.log('Evaluación completa:', evaluacion);
    console.log('Preguntas de la evaluación:', evaluacion.preguntas);
    if (evaluacion.preguntas && evaluacion.preguntas.length > 0) {
      console.log('Primera pregunta:', evaluacion.preguntas[0]);
      console.log('Propiedades de la primera pregunta:', Object.keys(evaluacion.preguntas[0]));
    }
    setModoRevision(false);
    setEvaluacionEnCurso(evaluacion);
    setRespuestasEvaluacion(new Array(evaluacion.preguntas?.length || 0).fill(-1));
    setEvaluacionDialogOpen(true);
  };

  const revisarEvaluacion = (evaluacion: any, resultado: any) => {
    console.log('Revisando evaluación:', evaluacion);
    console.log('Resultado:', resultado);
    setModoRevision(true);
    setEvaluacionEnCurso(evaluacion);
    // Cargar las respuestas que había dado el usuario
    setRespuestasEvaluacion(resultado.respuestas || []);
    setEvaluacionDialogOpen(true);
  };
  const cerrarEvaluacion = () => {
    setEvaluacionEnCurso(null);
    setRespuestasEvaluacion([]);
    setModoRevision(false);
    setEvaluacionDialogOpen(false);
  };

  const seleccionarRespuesta = (preguntaIndex: number, respuestaIndex: number) => {
    setRespuestasEvaluacion(prev => {
      const nuevas = [...prev];
      nuevas[preguntaIndex] = respuestaIndex;
      return nuevas;
    });
  };

  const enviarEvaluacion = async () => {
    if (!evaluacionEnCurso || !curso) return;
    
    setLoadingRespuesta(true);
    
    try {
      const userRes = await fetch("/api/auth/me");
      const userData = await userRes.json();
      const userId = userData?.user?._id || userData?.user?.id || userData?.user?.nombreUsuario;
        if (!userId) {
        toast("Error: No se pudo identificar al usuario");
        return;
      }

      console.log('Datos que se enviarán:');
      console.log('- idEvaluacion:', evaluacionEnCurso.id);
      console.log('- idEstudiante:', userId);
      console.log('- respuestas:', respuestasEvaluacion);
      console.log('- preguntas:', evaluacionEnCurso.preguntas);

      const respuestaData = {
        idEstudiante: userId,
        idCurso: curso._id || curso.id,
        idEvaluacion: evaluacionEnCurso.id,
        fecha: new Date().toISOString(),
        respuestas: respuestasEvaluacion,
        preguntas: evaluacionEnCurso.preguntas
      };      const response = await fetch('/api/cassandraDB/evaluaciones?responder=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idEvaluacion: evaluacionEnCurso.id,
          idEstudiante: userId,
          respuestas: respuestasEvaluacion,
          preguntas: evaluacionEnCurso.preguntas
        })
      });

      if (response.ok) {
        toast("Evaluación enviada exitosamente");
        cerrarEvaluacion();
        
        // Recargar resultados
        const resResultados = await fetch(`/api/cassandraDB/evaluaciones?resultados=1&idEstudiante=${userId}&idCurso=${curso._id || curso.id}`);
        const dataResultados = await resResultados.json();
        setResultadosEvaluaciones(dataResultados.resultados || []);
      } else {
        const errorData = await response.json();
        toast(`Error al enviar evaluación: ${errorData.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error("Error enviando evaluación:", error);
      toast("Error al enviar la evaluación");
    } finally {
      setLoadingRespuesta(false);
    }
  };

  const yaRealizoEvaluacion = (evaluacionId: string) => {
    return resultadosEvaluaciones.some(resultado => resultado.idevaluacion === evaluacionId);
  };  const obtenerResultadoEvaluacion = (evaluacionId: string) => {
    return resultadosEvaluaciones.find(resultado => resultado.idevaluacion === evaluacionId);
  };

  // Funciones para consultas/mensajes
  const cargarConsultas = useCallback(async () => {
    if (!curso) return;
    
    console.log('=== CARGANDO CONSULTAS ===');
    console.log('Curso ID:', curso._id || curso.id);
    
    setLoadingConsultas(true);
    try {
      const response = await fetch(`/api/neo4jDB/consultas-curso?cursoId=${curso._id || curso.id}`);
      const data = await response.json();
      
      console.log('Respuesta de consultas:', data);
      
      if (response.ok) {
        setConsultas(data.consultas || []);
      } else {
        console.error('Error al cargar consultas:', data.error);
        setConsultas([]);
      }
    } catch (e) {
      console.error('Error cargando consultas:', e);
      setConsultas([]);
    } finally {
      setLoadingConsultas(false);
    }
  }, [curso]);  const crearConsulta = useCallback(async () => {
    if (!nuevaConsulta.titulo.trim() || !nuevaConsulta.mensaje.trim() || !user || !curso || enviandoConsulta || consultaRequestRef.current) return;

    // Prevenir envíos muy rápidos (debounce de 1 segundo)
    const now = Date.now();
    if (lastConsultaTimeRef.current && now - lastConsultaTimeRef.current < 1000) {
      console.log('Consulta bloqueada por debounce');
      return;
    }
    lastConsultaTimeRef.current = now;

    // Prevenir múltiples envíos usando ref y estado
    consultaRequestRef.current = true;
    setEnviandoConsulta(true);

    console.log('=== CREANDO NUEVA CONSULTA ===');
    console.log('Datos:', {
      cursoId: curso._id || curso.id,
      estudianteId: user._id,
      titulo: nuevaConsulta.titulo,
      mensaje: nuevaConsulta.mensaje
    });

    try {
      const response = await fetch('/api/neo4jDB/consultas-curso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cursoId: curso._id || curso.id,
          estudianteId: user._id,
          titulo: nuevaConsulta.titulo,
          mensaje: nuevaConsulta.mensaje
        })
      });

      if (response.ok) {
        setNuevaConsulta({ titulo: '', mensaje: '' });
        setMostrarFormConsulta(false);
        await cargarConsultas();
        toast("Consulta enviada exitosamente");      } else {
        const data = await response.json();
        console.error('Error al crear consulta:', data.error);
        toast(`Error al enviar consulta: "${data.error}"`);
      }
    } catch (e) {
      console.error('Error creando consulta:', e);
      toast("Error al enviar la consulta");    } finally {
      // Liberar el estado de envío y el ref
      consultaRequestRef.current = false;
      setEnviandoConsulta(false);
    }
  }, [curso, user, nuevaConsulta, cargarConsultas, enviandoConsulta]);

  const responderConsulta = useCallback(async (consultaId: string) => {
    const mensaje = respuestaConsulta[consultaId]?.trim();
    if (!mensaje || !user || !curso) return;

    console.log('=== RESPONDIENDO CONSULTA ===');
    console.log('Datos:', {
      consultaId,
      docenteId: user._id,
      mensaje
    });

    setLoadingRespuestaConsulta(prev => ({ ...prev, [consultaId]: true }));

    try {
      const response = await fetch('/api/neo4jDB/responder-consulta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultaId,
          docenteId: user._id,
          mensaje
        })
      });

      if (response.ok) {
        setRespuestaConsulta(prev => ({ ...prev, [consultaId]: '' }));
        await cargarConsultas();
        toast("Respuesta enviada exitosamente");
      } else {
        const data = await response.json();
        console.error('Error al responder consulta:', data.error);
        toast(`Error al enviar respuesta: "${data.error}"`);
      }
    } catch (e) {
      console.error('Error respondiendo consulta:', e);
      toast("Error al enviar la respuesta");
    } finally {
      setLoadingRespuestaConsulta(prev => ({ ...prev, [consultaId]: false }));
    }
  }, [curso, user, respuestaConsulta, cargarConsultas]);

  // Cargar consultas cuando se carga el curso
  useEffect(() => {
    if (curso && activeTab === 'consultas') {
      cargarConsultas();
    }
  }, [curso, activeTab, cargarConsultas]);

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

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Botón para volver */}
      <Button 
        onClick={() => router.back()} 
        variant="outline" 
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Volver
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
                </div>                <div>
                  <p className="text-sm font-medium text-gray-600">Docente:</p>
                  <p className="text-sm">{curso.nombreUsuarioDocente}</p>
                </div>
                  {/* Botón para consultar al docente */}
                <div className="pt-3">
                  <Button 
                    onClick={irAlChatDocente}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    size="sm"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Enviar Consulta al Chat
                  </Button>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-600">Fecha de inicio:</p>
                  <p className="text-sm">{formatNeo4jDate(curso.fechaInicio)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Fecha de fin:</p>
                  <p className="text-sm">{formatNeo4jDate(curso.fechaFin)}</p>
                </div>
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
                <Tabs defaultValue="modulos" className="h-full" onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="modulos">
                      <GraduationCap className="w-4 h-4 mr-1" />
                      Módulos
                    </TabsTrigger>
                    <TabsTrigger value="evaluaciones">
                      <MessageSquare className="w-4 h-4 mr-1" />
                      Evaluaciones
                    </TabsTrigger>
                    <TabsTrigger value="estudiantes">
                      <Users className="w-4 h-4 mr-1" />
                      Estudiantes
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="modulos" className="mt-4 h-full">
                    <ScrollArea className="h-[60vh] w-full pr-2">
                      {(!curso.modulos || curso.modulos.length === 0) && (!curso.contenido || curso.contenido.length === 0) ? (
                        <div className="text-center py-8">
                          <p className="text-gray-500">No hay módulos disponibles en este curso.</p>
                        </div>                      ) : (
                        <div className="space-y-4">
                          {/* Indicador de módulos */}
                          {curso.modulos && curso.modulos.length > 0 && (
                            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <h3 className="font-semibold text-blue-800">📚 Módulos del Curso ({curso.modulos.length})</h3>
                              <p className="text-sm text-blue-600">Los módulos pueden contener subsecciones adicionales</p>
                            </div>
                          )}
                          
                          {/* Renderizar módulos de Neo4j si existen */}
                          {curso.modulos && curso.modulos.length > 0 && curso.modulos.map((mod: any, i: number) => (
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
                                                  💬 Sección de comentarios - Puedes participar e interactuar aquí
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </ScrollArea>
                                    </div>
                                  )}                                  {/* Subsecciones */}
                                  <div className="mt-4">
                                    {(() => {
                                      console.log(`Verificando subsecciones para módulo ${i}:`, mod);
                                      return null;
                                    })()}
                                    {mod.subsecciones && Array.isArray(mod.subsecciones) && mod.subsecciones.length > 0 ? (
                                      <div>
                                        <h4 className="font-medium text-base mb-3 text-green-700 bg-green-50 p-2 rounded">
                                          🔹 Subsecciones ({mod.subsecciones.length}):
                                        </h4>
                                        <ScrollArea className="max-h-[400px] w-full pr-2">
                                          <div className="ml-4 space-y-3">
                                            {mod.subsecciones.map((sub: any, k: number) => (
                                              <div key={k} className="border border-green-200 rounded-lg bg-green-50">
                                                <Collapsible 
                                                  open={openSubseccion?.mod === i && openSubseccion?.sub === k} 
                                                  onOpenChange={open => setOpenSubseccion(open ? { mod: i, sub: k } : null)}
                                                >
                                                  <CollapsibleTrigger className="w-full flex justify-between items-center px-3 py-3 cursor-pointer bg-green-100 hover:bg-green-200 rounded-t-lg">
                                                    <span className="font-medium text-sm text-left text-green-800">
                                                      📂 {sub.nombre || `Subsección ${k + 1}`}
                                                    </span>
                                                    <span className="text-xs text-green-600">
                                                      {openSubseccion?.mod === i && openSubseccion?.sub === k ? 'Cerrar' : 'Abrir'}
                                                    </span>
                                                  </CollapsibleTrigger>
                                                  <CollapsibleContent className="p-3 bg-white border-t border-green-200">
                                                    {sub.descripcion && (
                                                      <div className="mb-3 text-xs text-gray-700 bg-gray-50 p-2 rounded">{sub.descripcion}</div>
                                                    )}
                                                    <div className="space-y-2 max-h-[20vh] overflow-y-auto">
                                                      {sub.contenidos && sub.contenidos.length > 0 ? (
                                                        sub.contenidos.map((cont: any, j: number) => (
                                                          <div key={j} className="border rounded-lg p-2 bg-green-50">
                                                            <div className="font-semibold capitalize mb-1 text-xs text-green-600">
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
                                                              </div>                                                            )}
                                                            {cont.tipo === 'comentarios' && (
                                                              <div className="mt-1">
                                                                <div className="bg-blue-50 border border-blue-200 rounded p-2">
                                                                  <div className="flex items-center justify-between mb-2">
                                                                    <h5 className="font-medium text-blue-800 text-xs">💬 {cont.titulo || 'Comentarios'}</h5>
                                                                    <button
                                                                      onClick={() => cargarComentarios(cont.valor)}
                                                                      className="text-xs text-blue-600 hover:text-blue-800"
                                                                    >
                                                                      {comentarios[cont.valor] ? 'Actualizar' : 'Cargar'}
                                                                    </button>
                                                                  </div>
                                                                  
                                                                  {/* Lista de comentarios */}
                                                                  {loadingComentarios[cont.valor] ? (
                                                                    <div className="text-center py-1">
                                                                      <div className="animate-spin inline-block w-3 h-3 border border-blue-600 border-t-transparent rounded-full"></div>
                                                                      <span className="ml-1 text-xs text-blue-600">Cargando...</span>
                                                                    </div>
                                                                  ) : comentarios[cont.valor] && comentarios[cont.valor].length > 0 ? (
                                                                    <div className="space-y-1 mb-2 max-h-24 overflow-y-auto">                                                                      {comentarios[cont.valor].map((comentario: any, idx: number) => (
                                                                        <div key={`main-${comentario.id || comentario.epochMillis || idx}-${cont.valor}`} className="border-l-4 border-blue-200 pl-3 py-2 bg-gray-50 rounded">
                                                                          <div className="flex justify-between items-start">
                                                                            <span className="font-medium text-gray-800">{comentario.autor || comentario.nombreUsuario}</span>
                                                                            <span className="text-xs text-gray-500">
                                                                              {comentario.fechaFormateada || comentario.fecha || 'Sin fecha'} - {comentario.horaFormateada || 'Sin hora'}
                                                                            </span>
                                                                          </div>
                                                                          <p className="text-gray-700">{comentario.texto}</p>
                                                                        </div>
                                                                      ))}
                                                                    </div>
                                                                  ) : comentarios[cont.valor] ? (
                                                                    <div className="text-xs text-gray-500 mb-2 py-1 text-center">
                                                                      ¡Sé el primero en comentar!
                                                                    </div>
                                                                  ) : null}
                                                                  
                                                                  {/* Input para nuevo comentario */}
                                                                  <div className="flex gap-1">
                                                                    <input
                                                                      type="text"
                                                                      placeholder="Escribe tu comentario..."
                                                                      value={nuevoComentario[cont.valor] || ''}
                                                                      onChange={(e) => setNuevoComentario(prev => ({ ...prev, [cont.valor]: e.target.value }))}
                                                                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                                                                      onKeyPress={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                          agregarComentario(cont.valor);
                                                                        }
                                                                      }}
                                                                    />                                                                    <button
                                                                      onClick={() => agregarComentario(cont.valor)}
                                                                      disabled={!nuevoComentario[cont.valor]?.trim() || enviandoComentario[cont.valor]}
                                                                      className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:bg-gray-400"
                                                                    >
                                                                      {enviandoComentario[cont.valor] ? 'Enviando...' : 'Enviar'}
                                                                    </button>
                                                                  </div>
                                                                </div>
                                                              </div>
                                                            )}
                                                          </div>
                                                        ))
                                                      ) : (
                                                        <div className="text-xs text-gray-500 italic">
                                                          No hay contenidos en esta subsección
                                                        </div>
                                                      )}
                                                    </div>
                                                  </CollapsibleContent>
                                                </Collapsible>
                                              </div>
                                            ))}
                                          </div>
                                        </ScrollArea>
                                      </div>
                                    ) : (
                                      <div className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200">
                                        ❌ No se encontraron subsecciones en este módulo.
                                        <br />
                                        <span className="text-xs">
                                          Estado: {mod.subsecciones ? `Array con ${mod.subsecciones.length} elementos` : 'Campo subsecciones no existe'}
                                        </span>
                                        <details className="mt-2">
                                          <summary className="cursor-pointer text-xs font-semibold">🔍 Ver estructura completa del módulo</summary>
                                          <pre className="text-xs bg-gray-100 p-2 mt-1 rounded overflow-auto max-h-32">
                                            {JSON.stringify(mod, null, 2)}
                                          </pre>
                                        </details>
                                      </div>
                                    )}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            </div>
                          ))}
                        </div>
                      )}                          {/* Renderizar contenido de MongoDB si existe */}
                      {curso.contenido && curso.contenido.length > 0 && curso.contenido.map((seccion: any, i: number) => (
                        <div key={`mongo-${i}`} className="border rounded-lg mt-4">
                          <Collapsible open={openModulo === (curso.modulos?.length || 0) + i} onOpenChange={open => setOpenModulo(open ? (curso.modulos?.length || 0) + i : null)}>
                            <CollapsibleTrigger className="w-full flex justify-between items-center px-4 py-3 cursor-pointer bg-gray-50 hover:bg-gray-100 rounded-t-lg">
                              <span className="font-semibold text-left">{seccion.nombre || `Sección ${i + 1}`}</span>
                              <span className="text-xs text-gray-500">
                                {openModulo === (curso.modulos?.length || 0) + i ? 'Cerrar' : 'Abrir'}
                              </span>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="p-4 space-y-4 bg-white">
                              {seccion.descripcion && (
                                <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                                  {seccion.descripcion}
                                </div>
                              )}
                              
                              {seccion.contenidos && seccion.contenidos.length > 0 && (
                                <div>
                                  <h4 className="font-medium text-base mb-3 text-gray-800">Contenidos:</h4>
                                  <div className="space-y-3">
                                    {seccion.contenidos.map((cont: any, j: number) => (
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
                                          <div className="text-gray-700 whitespace-pre-line text-sm">{cont.valor || cont.contenido}</div>
                                        )}
                                        {cont.tipo === 'video' && (
                                          <div className="mt-2">
                                            <video src={cont.valor || cont.url} controls className="w-full max-h-64 rounded" />
                                          </div>
                                        )}
                                        {cont.tipo === 'imagen' && (
                                          <div className="mt-2 flex justify-center">
                                            <img src={cont.valor || cont.url} alt="Imagen del curso" className="max-w-full max-h-64 object-contain rounded" />
                                          </div>
                                        )}                                        {cont.tipo === 'documento' && (
                                          <div className="mt-2">
                                            <a href={cont.valor || cont.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline text-sm">
                                              Ver documento
                                            </a>
                                          </div>
                                        )}
                                        {cont.tipo === 'comentarios' && (
                                          <div className="w-full border rounded-lg bg-white mt-2">
                                            <div className="p-3 border-b bg-gray-50">
                                              <h4 className="font-medium text-gray-800">💬 {cont.titulo}</h4>
                                              <p className="text-sm text-gray-600">Participa en la discusión</p>
                                            </div>
                                            
                                            {/* Área de comentarios con scroll */}                                            <ScrollArea className="h-[300px] p-3">
                                              {loadingComentarios[cont.valor] ? (
                                                <div className="flex justify-center items-center h-20">
                                                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                                </div>
                                              ) : comentarios[cont.valor]?.length > 0 ? (
                                                <div className="space-y-3">
                                                  {comentarios[cont.valor].map((comentario: any, idx: number) => (
                                                    <div key={`main-${comentario.id || comentario.epochMillis || idx}-${cont.valor}`} className="border-l-4 border-blue-200 pl-3 py-2 bg-gray-50 rounded">
                                                      <div className="flex justify-between items-start">
                                                        <span className="font-medium text-gray-800">{comentario.autor || comentario.nombreUsuario}</span>
                                                        <span className="text-xs text-gray-500">
                                                          {comentario.fechaFormateada || comentario.fecha || 'Sin fecha'} - {comentario.horaFormateada || 'Sin hora'}
                                                        </span>
                                                      </div>
                                                      <p className="text-gray-700">{comentario.texto}</p>
                                                    </div>
                                                  ))}
                                                </div>
                                              ) : (
                                                <div className="text-center text-gray-500 py-8">
                                                  <p>No hay comentarios aún</p>
                                                  <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="mt-2"
                                                    onClick={() => cargarComentarios(cont.valor)}
                                                  >
                                                    Cargar comentarios
                                                  </Button>
                                                </div>
                                              )}
                                            </ScrollArea>
                                            
                                            {/* Formulario para agregar comentario */}
                                            <div className="p-3 border-t bg-gray-50">
                                              <div className="flex gap-2">
                                                <input
                                                  type="text"
                                                  placeholder="Escribe un comentario..."
                                                  value={nuevoComentario[cont.valor] || ''}
                                                  onChange={(e) => setNuevoComentario(prev => ({ 
                                                    ...prev, 
                                                    [cont.valor]: e.target.value 
                                                  }))}
                                                  onKeyPress={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                      e.preventDefault();
                                                      agregarComentario(cont.valor);
                                                    }
                                                  }}
                                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />                                                <Button 
                                                  size="sm" 
                                                  onClick={() => agregarComentario(cont.valor)}
                                                  disabled={!nuevoComentario[cont.valor]?.trim() || enviandoComentario[cont.valor]}
                                                >
                                                  {enviandoComentario[cont.valor] ? 'Enviando...' : 'Enviar'}
                                                </Button>
                                              </div>
                                            </div>                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Subsecciones del contenido */}
                              {seccion.subsecciones && Array.isArray(seccion.subsecciones) && seccion.subsecciones.length > 0 && (
                                <div className="mt-4">
                                  <h4 className="font-medium text-base mb-3 text-gray-800">Subsecciones:</h4>
                                  <div className="space-y-3">
                                    {seccion.subsecciones.map((sub: any, k: number) => (
                                      <div key={k} className="border rounded-lg">
                                        <Collapsible 
                                          open={openSubseccion?.mod === (curso.modulos?.length || 0) + i && openSubseccion?.sub === k} 
                                          onOpenChange={open => setOpenSubseccion(open ? { mod: (curso.modulos?.length || 0) + i, sub: k } : null)}
                                        >
                                          <CollapsibleTrigger className="w-full flex justify-between items-center px-4 py-3 cursor-pointer bg-gray-50 hover:bg-gray-100 rounded-t-lg">
                                            <span className="font-semibold text-left">{sub.nombre || `Subsección ${k + 1}`}</span>
                                            <span className="text-xs text-gray-500">
                                              {openSubseccion?.mod === (curso.modulos?.length || 0) + i && openSubseccion?.sub === k ? 'Cerrar' : 'Abrir'}
                                            </span>
                                          </CollapsibleTrigger>
                                          <CollapsibleContent className="p-4 space-y-4 bg-white">
                                            {sub.descripcion && (
                                              <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{sub.descripcion}</div>
                                            )}
                                            {sub.contenidos && sub.contenidos.length > 0 && (
                                              <div className="space-y-3">
                                                {sub.contenidos.map((cont: any, j: number) => (
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
                                                      <div className="text-gray-700 whitespace-pre-line text-sm">{cont.valor || cont.contenido}</div>
                                                    )}
                                                    {cont.tipo === 'video' && (
                                                      <div className="mt-2">
                                                        <video src={cont.valor || cont.url} controls className="w-full max-h-64 rounded" />
                                                      </div>
                                                    )}
                                                    {cont.tipo === 'imagen' && (
                                                      <div className="mt-2 flex justify-center">
                                                        <img src={cont.valor || cont.url} alt="Imagen" className="max-w-full max-h-64 object-contain rounded" />
                                                      </div>
                                                    )}                                                    {cont.tipo === 'documento' && (
                                                      <div className="mt-2">
                                                        <a href={cont.valor || cont.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline text-sm">
                                                          Ver documento
                                                        </a>
                                                      </div>
                                                    )}
                                                    {cont.tipo === 'comentarios' && (
                                                      <div className="w-full border rounded-lg bg-white mt-2">
                                                        <div className="p-3 border-b bg-gray-50">
                                                          <h4 className="font-medium text-gray-800">💬 {cont.titulo}</h4>
                                                          <p className="text-sm text-gray-600">Participa en la discusión</p>
                                                        </div>
                                                        
                                                        {/* Área de comentarios con scroll */}
                                                        <ScrollArea className="h-[250px] p-3">                                                          {loadingComentarios[cont.valor] ? (
                                                            <div className="flex justify-center items-center h-20">
                                                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                                            </div>
                                                          ) : comentarios[cont.valor]?.length > 0 ? (
                                                            <div className="space-y-3">
                                                              {comentarios[cont.valor].map((comentario: any, idx: number) => (
                                                                <div key={`sub-${comentario.id || comentario.epochMillis || idx}-${cont.valor}`} className="border-l-4 border-blue-200 pl-3 py-2 bg-gray-50 rounded">
                                                                  <div className="flex justify-between items-start">
                                                                    <span className="font-medium text-gray-800">{comentario.autor || comentario.nombreUsuario}</span>
                                                                    <span className="text-xs text-gray-500">
                                                                      {comentario.fechaFormateada || comentario.fecha || 'Sin fecha'} - {comentario.horaFormateada || 'Sin hora'}
                                                                    </span>
                                                                  </div>
                                                                  <p className="text-gray-700">{comentario.texto}</p>
                                                                </div>
                                                              ))}
                                                            </div>
                                                          ) : (
                                                            <div className="text-center text-gray-500 py-8">
                                                              <p>No hay comentarios aún</p>
                                                              <Button 
                                                                variant="outline" 
                                                                size="sm" 
                                                                className="mt-2"
                                                                onClick={() => cargarComentarios(cont.valor)}
                                                              >
                                                                Cargar comentarios
                                                              </Button>
                                                            </div>
                                                          )}
                                                        </ScrollArea>
                                                        
                                                        {/* Formulario para agregar comentario */}
                                                        <div className="p-3 border-t bg-gray-50">
                                                          <div className="flex gap-2">
                                                            <input
                                                              type="text"
                                                              placeholder="Escribe un comentario..."
                                                              value={nuevoComentario[cont.valor] || ''}
                                                              onChange={(e) => setNuevoComentario(prev => ({ 
                                                                ...prev, 
                                                                [cont.valor]: e.target.value 
                                                              }))}
                                                              onKeyPress={(e) => {
                                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                                  e.preventDefault();
                                                                  agregarComentario(cont.valor);
                                                                }
                                                              }}
                                                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            />                                                            <Button 
                                                              size="sm" 
                                                              onClick={() => agregarComentario(cont.valor)}
                                                              disabled={!nuevoComentario[cont.valor]?.trim() || enviandoComentario[cont.valor]}
                                                            >
                                                              {enviandoComentario[cont.valor] ? 'Enviando...' : 'Enviar'}
                                                            </Button>
                                                          </div>
                                                        </div>
                                                      </div>
                                                    )}
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </CollapsibleContent>
                                        </Collapsible>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </CollapsibleContent>
                          </Collapsible>
                        </div>
                      ))}
                    </ScrollArea></TabsContent>

                  <TabsContent value="evaluaciones" className="mt-4">
                    <ScrollArea className="h-[60vh] w-full pr-2">
                      {loadingEvaluaciones ? (
                        <div className="space-y-4">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="border rounded-lg p-4">
                              <Skeleton className="h-6 w-48 mb-2" />
                              <Skeleton className="h-4 w-32 mb-2" />
                              <Skeleton className="h-10 w-24" />
                            </div>
                          ))}
                        </div>
                      ) : evaluaciones.length === 0 ? (
                        <div className="text-center py-8">
                          <GraduationCap className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                          <p className="text-gray-600">No hay evaluaciones disponibles para este curso.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {evaluaciones.map((evaluacion: any) => {
                            const yaRealizo = yaRealizoEvaluacion(evaluacion.id);
                            const resultado = yaRealizo ? obtenerResultadoEvaluacion(evaluacion.id) : null;
                            
                            return (
                              <div key={evaluacion.id} className="border rounded-lg p-4 bg-white shadow-sm">
                                <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <h3 className="font-semibold text-lg">{evaluacion.titulo}</h3>
                                    {evaluacion.descripcion && (
                                      <p className="text-sm text-gray-600 mt-1">{evaluacion.descripcion}</p>
                                    )}                                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                      <span>📋 {evaluacion.preguntas?.length || 0} preguntas</span>
                                      {evaluacion.tiempolimite && (
                                        <span>⏱️ {evaluacion.tiempolimite} min</span>
                                      )}
                                      <span>📅 Disponible del {formatDateForDisplay(evaluacion.fechainicio || evaluacion.fechacreacion)} al {formatDateForDisplay(evaluacion.fechafin)}</span>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-2">
                                    {yaRealizo ? (
                                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                                        ✅ Completada
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline">
                                        ⏳ Pendiente
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                  {yaRealizo && resultado ? (                                  <div className="mt-3 p-3 bg-green-50 rounded border border-green-200">
                                    <div className="flex justify-between items-center mb-2">                                      <span className="text-sm font-medium text-green-800">
                                        {(() => {
                                          const totalPreguntas = evaluacion.preguntas?.length || 0;
                                          const calificacion = resultado.calificacion || 0;
                                          const preguntasCorrectas = Math.round((calificacion / 100) * totalPreguntas);
                                          return `Puntaje obtenido: ${Math.round(calificacion)}% (${preguntasCorrectas}/${totalPreguntas})`;
                                        })()}
                                      </span>
                                      <span className="text-xs text-green-600">
                                        Realizada: {resultado.fecharealizada ? formatDateForDisplay(resultado.fecharealizada) : 'Fecha no disponible'}
                                      </span>
                                    </div>
                                    <Button 
                                      onClick={() => revisarEvaluacion(evaluacion, resultado)}
                                      variant="outline"
                                      size="sm"
                                      className="text-xs border-green-300 text-green-700 hover:bg-green-100"
                                    >
                                      👁️ Revisar Respuestas
                                    </Button>
                                  </div>
                                ) : (
                                  <Button 
                                    onClick={() => iniciarEvaluacion(evaluacion)}
                                    className="mt-3"
                                    size="sm"
                                  >
                                    🚀 Iniciar Evaluación
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}                    
                      </ScrollArea>
                  </TabsContent>
                  <TabsContent value="estudiantes" className="mt-4">
                    <ScrollArea className="h-[60vh] w-full pr-2">
                      {loadingEstudiantes ? (
                        <div className="space-y-4">
                          {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center space-x-3 p-3 border rounded">
                              <Skeleton className="h-10 w-10 rounded-full" />
                              <div className="space-y-1 flex-1">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-24" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : estudiantes.length === 0 ? (
                        <div className="text-center py-8">
                          <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                          <p className="text-gray-600">No hay estudiantes matriculados en este curso.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-lg">Estudiantes Matriculados</h3>
                            <Badge variant="outline">
                              {estudiantes.length} estudiante{estudiantes.length !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                          {estudiantes.map((estudiante: any, index: number) => (
                            <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg bg-white hover:bg-gray-50 transition-colors">
                              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <span className="text-blue-600 font-semibold text-sm">
                                  {estudiante.nombreUsuario ? estudiante.nombreUsuario.charAt(0).toUpperCase() : '?'}
                                </span>
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-sm">
                                  {estudiante.nombreUsuario || 'Usuario sin nombre'}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {estudiante.correo || 'Sin correo'}
                                </div>
                              </div>
                              <div className="text-xs text-gray-400">
                                Matriculado: {estudiante.fechaMatricula ? 
                                  new Date(estudiante.fechaMatricula).toLocaleDateString('es-ES') : 
                                  'Fecha no disponible'
                                }
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>          </div>
        </div>
      </div>      {/* Dialog para realizar evaluación */}
      <Dialog open={evaluacionDialogOpen} onOpenChange={setEvaluacionDialogOpen}>
        <DialogContent className="max-w-4xl h-[70vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-4 flex-shrink-0">
            <DialogTitle>
              {modoRevision ? '👁️ Revisión de Respuestas' : evaluacionEnCurso?.titulo || 'Evaluación'}
            </DialogTitle>
            {modoRevision && (
              <div className="text-sm text-gray-600">
                Puedes ver tus respuestas correctas e incorrectas
              </div>
            )}
          </DialogHeader>
            {evaluacionEnCurso && (
            <div className="flex flex-col h-full">
              {/* Información de la evaluación */}
              <div className="pb-4 border-b">
                {evaluacionEnCurso.descripcion && (
                  <p className="text-gray-600 mb-2">{evaluacionEnCurso.descripcion}</p>
                )}
                
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>📋 {evaluacionEnCurso.preguntas?.length || 0} preguntas</span>
                  {evaluacionEnCurso.tiempolimite && (
                    <span>⏱️ {evaluacionEnCurso.tiempolimite} minutos</span>
                  )}
                </div>
              </div>

              {/* Área de preguntas con scroll fijo */}
              <div className="flex-1 my-4 border rounded-lg overflow-hidden bg-gray-50">
                <ScrollArea className="h-[400px]">
                  <div className="p-4 space-y-6">
                    {evaluacionEnCurso.preguntas?.map((pregunta: any, index: number) => {
                      // Intentar diferentes propiedades para el texto de la pregunta
                      const textoPregunta = pregunta.pregunta || pregunta.texto || pregunta.title || pregunta.question || 
                                        pregunta.enunciado || pregunta.descripcion || `Pregunta ${index + 1}`;
                    
                    // Intentar diferentes propiedades para las opciones
                    const opciones = pregunta.opciones || pregunta.options || pregunta.alternativas || pregunta.choices || [];
                    
                    console.log(`Pregunta ${index + 1}:`, pregunta);
                    
                    return (
                      <div key={index} className="border rounded-lg p-4 bg-gray-50">
                        <h3 className="font-medium mb-3">
                          {index + 1}. {textoPregunta}
                        </h3>                          <div className="space-y-2">
                          {opciones.map((opcion: string, opcionIndex: number) => {
                            const esSeleccionado = respuestasEvaluacion[index] === opcionIndex;
                            const esCorrecto = pregunta.respuestaCorrecta === opcionIndex;
                            
                            let className = "flex items-center space-x-3 p-2 rounded transition-colors";
                            let contenidoExtra = null;
                            
                            if (modoRevision) {
                              // En modo revisión, mostrar indicadores visuales
                              if (esCorrecto && esSeleccionado) {
                                                               className += " bg-green-100 border border-green-300"; // Correcto y seleccionado
                                contenidoExtra = <span className="text-green-600 font-semibold ml-2">✓ Correcto</span>;
                              } else if (esCorrecto) {
                                className += " bg-green-50 border border-green-200"; // Respuesta correcta no seleccionada
                                contenidoExtra = <span className="text-green-600 font-semibold ml-2">✓ Respuesta correcta</span>;
                              } else if (esSeleccionado) {
                                className += " bg-red-100 border border-red-300"; // Seleccionado pero incorrecto
                                contenidoExtra = <span className="text-red-600 font-semibold ml-2">✗ Incorrecto</span>;
                              } else {
                                className += " bg-gray-50 border border-gray-200"; // No seleccionado
                              }
                            } else {
                              // Modo normal (tomando evaluación)
                              className += esSeleccionado 
                                ? " bg-blue-50 border border-blue-200" 
                                : " cursor-pointer hover:bg-white";
                            }
                            
                            return (
                              <label 
                                key={opcionIndex}
                                className={className}
                              >
                                <input
                                  type="radio"
                                  name={`pregunta-${index}`}
                                  value={opcionIndex}
                                  checked={esSeleccionado}
                                  onChange={() => !modoRevision && seleccionarRespuesta(index, opcionIndex)}
                                  disabled={modoRevision}
                                  className="w-4 h-4 text-blue-600"
                                />
                                <span className="text-sm flex-1">{opcion}</span>
                                {contenidoExtra}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );                  })}
                  </div>
                </ScrollArea>
              </div>

              {/* Botones de acción - fuera del área de scroll */}
              <div className="pt-4 border-t bg-white">
                <div className="flex justify-between items-center">
                  <Button 
                    variant="outline" 
                    onClick={cerrarEvaluacion}
                    disabled={loadingRespuesta}
                  >
                    {modoRevision ? 'Cerrar Revisión' : 'Cancelar'}
                  </Button>                  
                  {!modoRevision && (
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">
                        Respondidas: {respuestasEvaluacion.filter(r => r !== -1).length}/{evaluacionEnCurso.preguntas?.length || 0}
                      </span>
                      <Button 
                        onClick={enviarEvaluacion}
                        disabled={loadingRespuesta || respuestasEvaluacion.some(r => r === -1)}
                        className="min-w-[120px]"
                      >
                        {loadingRespuesta ? 'Enviando...' : 'Enviar Evaluación'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
