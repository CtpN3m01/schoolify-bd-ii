"use client";

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-otp"
import { GraduationCapIcon } from "lucide-react";
import { useState, useEffect } from "react";

export default function ForgotPassword() {
  const [emailSent, setEmailSent] = useState(false);
  const [codeValidated, setCodeValidated] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendTimer]);

  const handleSendCode = () => {
    setEmailSent(true);
    setResendTimer(120);
  };

  return (
    <div className="grid grid-rows-[auto_auto_auto] items-center justify-items-center min-h-screen p-8 pb-20 gap-2 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <div className="flex flex-col items-center w-full max-w-sm">
        <div className="flex justify-center items-center gap-2 px-2 w-full">
          <GraduationCapIcon className="h-10 w-10" />
          <span className="text-4xl font-bold">Schoolify</span>
        </div>
        <div className="text-center mt-4">
          <h2 className="text-3xl font-bold">Olvidó su contraseña?</h2> 
          <p className="text-muted-foreground">Un código numeral se enviará a tu email</p>
        </div>
      </div>

      <div className="w-full max-w-sm space-y-4">
        {!emailSent && (
          <div>
            <label className="block text-sm font-medium text-muted-foreground">Correo Electrónico</label>
            <Input type="email" placeholder="email@domain.com" className="w-full" />
            <Button className="w-full mt-4" onClick={handleSendCode}>Enviar Código</Button>
          </div>
        )}

        {emailSent && !codeValidated && (
          <div className="items-center justify-items-center">
            <label className="block text-sm font-medium text-muted-foreground">Código de Verificación</label>
            <InputOTP className="w-full" containerClassName="justify-center" maxLength={6}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
            <Button className="w-full mt-4" onClick={() => setCodeValidated(true)}>Validar Código</Button>
            <div className="flex justify-between items-center">
              <a
                className={`underline ${resendTimer > 0 ? 'text-muted-foreground cursor-not-allowed' : ''}`}
                onClick={resendTimer > 0 ? undefined : handleSendCode}
                style={{ pointerEvents: resendTimer > 0 ? 'none' : 'auto' }}
              >
                {resendTimer > 0 ? `Reenviar código en ${resendTimer}s` : "Enviar código de nuevo"}
              </a>
            </div>
          </div>
        )}

        {codeValidated && (
          <div>
            <label className="block text-sm font-medium text-muted-foreground">Nueva Contraseña</label>
            <Input type="password" placeholder="Nueva contraseña" className="w-full" />
            <Button className="w-full mt-4">Cambiar Contraseña</Button>
          </div>
        )}

        {!codeValidated && (
          <p className="text-sm text-muted-foreground text-center">
            <a href="/auth/login" className="underline">Volver a login</a>
          </p>
        )}
      </div>

      <p className="text-sm text-muted-foreground text-center">
        Al hacer click en continuar aceptas los <a href="#" className="underline">Terms of Service</a> y <a href="#" className="underline">Privacy Policy</a>
      </p>
    </div>
  );
}