import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { GraduationCapIcon } from "lucide-react";

export default function Login() {
  return (
    <div className="grid grid-rows-[auto_auto_auto] items-center justify-items-center min-h-screen p-8 pb-20 gap-2 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      
      <div className="flex justify-center items-center gap-2 px-2 w-full">
        <GraduationCapIcon className="h-10 w-10" />
        <span className="text-4xl font-bold">Schoolify</span>
      </div>
      <div className="text-center">
        <h2 className="text-3xl font-bold">Inicia Sesión</h2> 
        <p className="text-muted-foreground">Ingresa con tu email y contraseña</p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <Input type="email" placeholder="email@domain.com" className="w-full" />
        <Input type="password" placeholder="password" className="w-full" />
        <Button className="w-full">Continuar</Button>
        <div className="relative">
          <Separator className="my-4" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="bg-background px-2 text-muted-foreground text-sm">o</span>
          </div>
        </div>
        <Button variant="outline" className="w-full">Registrarme</Button>
      </div>

      <p className="text-sm text-muted-foreground text-center">
        Al hacer click en continuar aceptas los <a href="#" className="underline">Terms of Service</a> y <a href="#" className="underline">Privacy Policy</a>
      </p>
    </div>
  );
}
