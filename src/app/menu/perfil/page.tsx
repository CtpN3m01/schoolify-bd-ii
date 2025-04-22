"use client";
import Image from "next/image";

export default function Perfil() {
  return (
    <div className="flex flex-col min-h-screen px-4 py-8 sm:px-20 sm:py-20 font-sans bg-gray-50">
      {/* Card principal de perfil */}
      <section className="max-w-3xl w-full mx-auto bg-white rounded-2xl shadow-md p-8 flex flex-col sm:flex-row gap-8 mb-16">
        {/* Avatar y acciones */}
        <div className="flex flex-col items-center sm:items-start">
          <div className="w-32 h-32 rounded-full overflow-hidden mb-4 border-4 border-gray-200">
            <Image
              src="/perfil-helena.jpg"
              alt="Avatar"
              width={128}
              height={128}
              className="object-cover w-full h-full"
            />
          </div>
          <span className="text-gray-700 text-base font-medium mb-1">@hills14</span>
          <span className="text-gray-500 text-sm mb-4">12 Amigos</span>
          <button className="bg-black text-white px-5 py-2 rounded-md font-medium text-sm hover:bg-gray-900 transition">
            Editar perfil
          </button>
        </div>
        {/* Info personal */}
        <div className="flex-1 flex flex-col justify-center">
          <h1 className="text-3xl font-bold mb-6">Mi perfil</h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <div className="text-gray-500 text-xs uppercase mb-1">Nombre</div>
              <div className="text-lg font-semibold">Helena Hills</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs uppercase mb-1">Fecha de nacimiento</div>
              <div className="text-lg font-semibold">12/03/2000</div>
            </div>
          </div>
        </div>
      </section>
      {/* Cursos */}
      <section className="max-w-5xl w-full mx-auto">
        <h2 className="text-2xl font-bold mb-8">Cursos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          <div className="flex flex-col items-center bg-white rounded-xl shadow p-4">
            <div className="w-28 h-28 rounded-lg overflow-hidden mb-3">
              <Image
                src="/curso-python.jpg"
                alt="Python"
                width={112}
                height={112}
                className="object-cover w-full h-full"
              />
            </div>
            <span className="text-center text-base font-medium">Python de Cero a Experto</span>
          </div>
          <div className="flex flex-col items-center bg-white rounded-xl shadow p-4">
            <div className="w-28 h-28 rounded-lg overflow-hidden mb-3">
              <Image
                src="/curso-japones.jpg"
                alt="Japonés"
                width={112}
                height={112}
                className="object-cover w-full h-full"
              />
            </div>
            <span className="text-center text-base font-medium">Japonés desde Cero</span>
          </div>
          <div className="flex flex-col items-center bg-white rounded-xl shadow p-4">
            <div className="w-28 h-28 rounded-lg overflow-hidden mb-3">
              <Image
                src="/curso-dj.jpg"
                alt="DJ"
                width={112} 
                height={112}
                className="object-cover w-full h-full"
              />
            </div> 
            <span className="text-center text-base font-medium">DJ y Producción Musical</span>
          </div>
          <div className="flex flex-col items-center bg-white rounded-xl shadow p-4">
            <div className="w-28 h-28 rounded-lg overflow-hidden mb-3">
              <Image
                src="/curso-x.jpg"
                alt="Curso X"
                width={112}
                height={112}
                className="object-cover w-full h-full"
              />
            </div>
            <span className="text-center text-base font-medium">Curso X</span>
          </div>
        </div>
      </section>
    </div>
  );
}
