import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GraduationCapIcon } from "lucide-react";

export default function Register() {
  return (
    <div className="grid grid-rows-[auto_auto_auto] items-center justify-items-center min-h-screen p-8 pb-20 gap-2 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <div className="flex flex-col items-center w-full max-w-sm">
        <div className="flex justify-center items-center gap-2 px-2 w-full">
          <GraduationCapIcon className="h-10 w-10" />
          <span className="text-4xl font-bold">Schoolify</span>
        </div>
        <div className="text-center mt-4">
          <h2 className="text-3xl font-bold">Crea una cuenta</h2> 
          <p className="text-muted-foreground">Ingresa con tu email y contraseña</p>
        </div>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-muted-foreground">Correo Electrónico</label>
          <Input type="email" placeholder="email@domain.com" className="w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground">Contraseña</label>
          <Input type="password" placeholder="password" className="w-full" />
        </div>
        <Button className="w-full">Continuar</Button>
        <p className="text-sm text-muted-foreground text-center">
          <a href="/auth/login" className="underline">Volver a login</a>
        </p>
      </div>

      <p className="text-sm text-muted-foreground text-center">
        Al hacer click en continuar aceptas los <a href="#" className="underline">Terms of Service</a> y <a href="#" className="underline">Privacy Policy</a>
      </p>
    </div>
  );
}