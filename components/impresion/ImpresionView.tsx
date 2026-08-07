// components/impresion/ImpresionView.tsx
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Printer, CheckCircle2, XCircle, Loader2, Usb, Wifi, Download } from 'lucide-react';
import { B } from '@/lib/brand';
import { PageHeader, Card, Btn } from '@/components/ui';
import {
  agenteDisponible,
  listarImpresoras,
  setImpresoraPredeterminada,
  imprimirTicketPrueba,
  configurarAgente,
  getTokenGuardado,
  getPortGuardado,
} from '@/utils/print-agent/printAgentClient';
import type { PrintTarget } from '@/utils/print-agent/printAgentClient';

// URL donde publiques el instalador compilado (PrintAgentSetup.exe).
// Cámbiala cuando subas el instalador a tu propio hosting/CDN.
const URL_INSTALADOR = 'https://tu-sistema-restaurante.vercel.app/descargas/PrintAgentSetup.exe';

type EstadoConexion = 'verificando' | 'conectado' | 'desconectado';

interface ImpresoraDetectada {
  name: string;
  status?: string;
  isDefault?: boolean;
}

export function ImpresionView() {
  const [estado, setEstado] = useState<EstadoConexion>('verificando');
  const [tokenInput, setTokenInput] = useState('');
  const [puertoInput, setPuertoInput] = useState('4321');
  const [impresoras, setImpresoras] = useState<ImpresoraDetectada[]>([]);
  const [predeterminada, setPredeterminada] = useState<PrintTarget | null>(null);
  const [ipRed, setIpRed] = useState('');
  const [puertoRed, setPuertoRed] = useState('9100');
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const revisarConexion = useCallback(async () => {
    setEstado('verificando');
    const ok = await agenteDisponible();
    setEstado(ok ? 'conectado' : 'desconectado');
    if (ok) {
      try {
        const data = await listarImpresoras();
        setImpresoras(data.printers ?? []);
        setPredeterminada(data.defaultPrinter ?? null);
      } catch {
        // Token todavía no emparejado o inválido: se queda "conectado" pero
        // sin poder listar; el usuario debe pegar el token de abajo.
      }
    }
  }, []);

  useEffect(() => {
    setTokenInput(getTokenGuardado() ?? '');
    setPuertoInput(String(getPortGuardado()));
    revisarConexion();
  }, [revisarConexion]);

  const handleEmparejar = useCallback(async () => {
    if (!tokenInput.trim()) {
      setMensaje('Pega el token que aparece en el agente (icono de la bandeja del sistema → Configurar impresora).');
      return;
    }
    configurarAgente(tokenInput.trim(), Number(puertoInput) || 4321);
    setMensaje(null);
    await revisarConexion();
  }, [tokenInput, puertoInput, revisarConexion]);

  const handleUsarUsb = useCallback(async (name: string) => {
    setCargando(true);
    setMensaje(null);
    try {
      await setImpresoraPredeterminada({ interface: 'usb', name, width: 48 });
      await revisarConexion();
      setMensaje(`"${name}" configurada como impresora predeterminada.`);
    } catch (err) {
      setMensaje(err instanceof Error ? err.message : 'No se pudo configurar la impresora.');
    } finally {
      setCargando(false);
    }
  }, [revisarConexion]);

  const handleUsarRed = useCallback(async () => {
    if (!ipRed.trim()) {
      setMensaje('Ingresa la IP de la impresora de red.');
      return;
    }
    setCargando(true);
    setMensaje(null);
    try {
      await setImpresoraPredeterminada({
        interface: 'network',
        ip: ipRed.trim(),
        port: Number(puertoRed) || 9100,
        width: 48,
      });
      await revisarConexion();
      setMensaje(`Impresora de red ${ipRed}:${puertoRed} configurada como predeterminada.`);
    } catch (err) {
      setMensaje(err instanceof Error ? err.message : 'No se pudo configurar la impresora de red.');
    } finally {
      setCargando(false);
    }
  }, [ipRed, puertoRed, revisarConexion]);

  const handlePrueba = useCallback(async () => {
    setCargando(true);
    setMensaje(null);
    try {
      await imprimirTicketPrueba();
      setMensaje('Ticket de prueba enviado. Revisa la impresora.');
    } catch (err) {
      setMensaje(err instanceof Error ? err.message : 'No se pudo imprimir el ticket de prueba.');
    } finally {
      setCargando(false);
    }
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Impresión"
        subtitle="Conecta el Agente de Impresión de este equipo para imprimir tickets automáticamente, sin diálogo del navegador."
      />

      {/* ── Estado de conexión ────────────────────────────────────────── */}
      <Card>
        <div className="flex items-center gap-3">
          {estado === 'verificando' && <Loader2 className="animate-spin" size={20} color={B.muted} />}
          {estado === 'conectado' && <CheckCircle2 size={20} color={B.green} />}
          {estado === 'desconectado' && <XCircle size={20} color={B.terra} />}
          <div>
            <p className="font-semibold" style={{ color: B.charcoal }}>
              {estado === 'verificando' && 'Verificando agente de impresión en este equipo...'}
              {estado === 'conectado' && 'Agente de impresión conectado en este equipo'}
              {estado === 'desconectado' && 'No se detectó el agente de impresión en este equipo'}
            </p>
            {estado === 'desconectado' && (
              <p className="text-sm" style={{ color: B.muted }}>
                Instálalo una sola vez por caja/computadora. Los tickets se imprimirán con el
                diálogo del navegador mientras tanto.
              </p>
            )}
          </div>
        </div>

        {estado === 'desconectado' && (
          <div className="mt-4">
            <Btn onClick={() => window.open(URL_INSTALADOR, '_blank')}>
              <Download size={16} /> Descargar agente de impresión
            </Btn>
            <p className="text-xs mt-2" style={{ color: B.muted }}>
              Nota del navegador: la primera vez que este sitio intente hablar con el agente,
              Chrome/Edge pueden mostrar un permiso &quot;quiere acceder a dispositivos en tu
              red local&quot; — hay que presionar &quot;Permitir&quot; una sola vez.
            </p>
          </div>
        )}
      </Card>

      {/* ── Emparejamiento por token ─────────────────────────────────── */}
      <Card>
        <h3 className="font-semibold mb-2" style={{ color: B.charcoal }}>Emparejar con este equipo</h3>
        <p className="text-sm mb-3" style={{ color: B.muted }}>
          En el ícono del agente (bandeja del sistema, junto al reloj de Windows) → &quot;Configurar
          impresora...&quot; verás un token. Pégalo aquí una sola vez por caja.
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="Token del agente"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            className="flex-1 min-w-[220px] px-3 py-2 rounded-lg border"
            style={{ borderColor: B.creamDark }}
          />
          <input
            type="number"
            placeholder="Puerto"
            value={puertoInput}
            onChange={(e) => setPuertoInput(e.target.value)}
            className="w-28 px-3 py-2 rounded-lg border"
            style={{ borderColor: B.creamDark }}
          />
          <Btn onClick={handleEmparejar}>Emparejar</Btn>
        </div>
      </Card>

      {/* ── Selección de impresora ───────────────────────────────────── */}
      {estado === 'conectado' && (
        <>
          <Card>
            <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: B.charcoal }}>
              <Usb size={18} /> Impresoras USB detectadas
            </h3>
            {impresoras.length === 0 && (
              <p className="text-sm" style={{ color: B.muted }}>
                No se detectaron impresoras instaladas en Windows en este equipo.
              </p>
            )}
            <div className="space-y-2">
              {impresoras.map((p) => (
                <div key={p.name} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: B.pageBg }}>
                  <span>{p.name}</span>
                  <Btn onClick={() => handleUsarUsb(p.name)} disabled={cargando}>
                    Usar como predeterminada
                  </Btn>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: B.charcoal }}>
              <Wifi size={18} /> Impresora de red (Ethernet)
            </h3>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                placeholder="IP, ej. 192.168.1.50"
                value={ipRed}
                onChange={(e) => setIpRed(e.target.value)}
                className="flex-1 min-w-[180px] px-3 py-2 rounded-lg border"
                style={{ borderColor: B.creamDark }}
              />
              <input
                type="number"
                placeholder="Puerto"
                value={puertoRed}
                onChange={(e) => setPuertoRed(e.target.value)}
                className="w-28 px-3 py-2 rounded-lg border"
                style={{ borderColor: B.creamDark }}
              />
              <Btn onClick={handleUsarRed} disabled={cargando}>Usar como predeterminada</Btn>
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold mb-2 flex items-center gap-2" style={{ color: B.charcoal }}>
              <Printer size={18} /> Impresora predeterminada actual
            </h3>
            <p className="text-sm mb-3" style={{ color: B.muted }}>
              {predeterminada ? JSON.stringify(predeterminada) : 'Ninguna configurada aún.'}
            </p>
            <Btn onClick={handlePrueba} disabled={cargando || !predeterminada}>
              {cargando ? <Loader2 className="animate-spin" size={16} /> : null} Imprimir ticket de prueba
            </Btn>
          </Card>
        </>
      )}

      {mensaje && (
        <Card>
          <p className="text-sm" style={{ color: B.charcoal }}>{mensaje}</p>
        </Card>
      )}
    </div>
  );
}
