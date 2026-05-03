'use client';

import { useState } from 'react';
import {
  AlertTriangle, Shield, Download, Upload,
  CheckCircle, Clock,
} from 'lucide-react';
import { B } from '@/lib/brand';
import { PageHeader, Card } from '@/components/ui';

export function RespaldoView() {
  const [archivoSeleccionado, setArchivo] = useState<string | null>(null);
  const [descargando, setDescargando]     = useState(false);
  const [exito, setExito]                 = useState(false);

  const handleDescargar = async () => {
    setDescargando(true);
    await new Promise(r => setTimeout(r, 1500));
    setDescargando(false);
    setExito(true);
    setTimeout(() => setExito(false), 3000);
  };

  return (
    <div>
      <PageHeader title="Respaldo y Restauración" subtitle="Exporta o importa copias de seguridad de tu sistema" />

      {/* Info */}
      <div className="flex items-start gap-3 p-4 rounded-2xl mb-5" style={{ background: `${B.green}12`, border: `1px solid ${B.green}30` }}>
        <Shield className="w-5 h-5 shrink-0 mt-0.5" style={{ color: B.green }} />
        <div className="text-sm" style={{ color: B.charcoal }}>
          <p className="font-bold mb-0.5" style={{ color: B.green }}>¿Qué se guarda en el backup?</p>
          <p style={{ color: B.charcoal }}>
            Se guarda toda la información operativa: productos, clientes, usuarios, cajas, ventas y compras.
            Esta copia permite <strong>restaurar el sistema completo</strong> al momento del respaldo.
            Se permiten <strong>2 descargas y 2 restauraciones por día</strong>.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Descargar */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: B.green, color: B.cream }}>
                <Download className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: B.charcoal }}>Descargar Copia de Seguridad</p>
                <p className="text-xs" style={{ color: B.muted }}>Genera un archivo .json con todos los datos</p>
              </div>
            </div>
            <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: `${B.green}18`, color: B.green }}>
              2 restantes hoy
            </span>
          </div>

          <div className="rounded-xl p-3 mb-4 flex items-start gap-2" style={{ background: B.cream }}>
            <Clock className="w-4 h-4 shrink-0 mt-0.5" style={{ color: B.muted }} />
            <p className="text-xs" style={{ color: B.muted }}>
              Al descargar, los datos actuales se guardan en el archivo. <strong>La descarga puede tardar según la cantidad de datos.</strong>
            </p>
          </div>

          {exito && (
            <div className="rounded-xl p-3 mb-4 flex items-center gap-2" style={{ background: '#e8f5e2' }}>
              <CheckCircle className="w-4 h-4" style={{ color: B.green }} />
              <p className="text-sm font-semibold" style={{ color: B.green }}>¡Backup descargado correctamente!</p>
            </div>
          )}

          <button
            onClick={handleDescargar}
            disabled={descargando}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all"
            style={{ background: B.green, color: B.cream, opacity: descargando ? 0.7 : 1 }}
          >
            <Download className="w-4 h-4" />
            {descargando ? 'Generando backup...' : 'Descargar Backup'}
          </button>
        </Card>

        {/* Restaurar */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: B.terra, color: B.cream }}>
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: B.charcoal }}>Restaurar desde Backup</p>
                <p className="text-xs" style={{ color: B.muted }}>Sube un archivo .json para restaurar</p>
              </div>
            </div>
            <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: `${B.terra}18`, color: B.terra }}>
              2 restantes hoy
            </span>
          </div>

          <div className="rounded-xl p-3 mb-4 flex items-start gap-2" style={{ background: '#fef0e6' }}>
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: B.terra }} />
            <p className="text-xs" style={{ color: B.terra }}>
              <strong>Atención:</strong> Al restaurar, los datos actuales serán reemplazados por los del backup. Se recomienda descargar una copia antes de restaurar.
            </p>
          </div>

          <label className="block">
            <div
              className="w-full border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all"
              style={{
                borderColor: archivoSeleccionado ? B.green : B.creamDark,
                background: archivoSeleccionado ? `${B.green}08` : 'transparent',
              }}>
              <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: archivoSeleccionado ? B.green : B.muted }} />
              <p className="text-sm font-semibold" style={{ color: archivoSeleccionado ? B.green : B.muted }}>
                {archivoSeleccionado ?? 'Seleccionar archivo .json de backup'}
              </p>
            </div>
            <input type="file" accept=".json" className="hidden"
              onChange={e => setArchivo(e.target.files?.[0]?.name ?? null)} />
          </label>

          {archivoSeleccionado && (
            <button className="w-full mt-3 py-3 rounded-xl text-sm font-bold"
              style={{ background: B.terra, color: B.cream }}>
              Restaurar ahora
            </button>
          )}
        </Card>
      </div>

      {/* Consejos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
        {[
          { icon: Clock,  title: 'Recomendación', text: 'Descarga una copia cada semana o antes de hacer cambios importantes.', color: B.gold },
          { icon: Shield, title: 'Seguridad',     text: 'El archivo contiene datos sensibles. Guárdalo en un lugar seguro.',  color: B.terra },
        ].map(({ icon: Icon, title, text, color }) => (
          <div key={title} className="flex items-start gap-3 p-4 rounded-2xl"
            style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: color }}>
              <Icon className="w-4 h-4" style={{ color: B.cream }} />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: B.charcoal }}>{title}</p>
              <p className="text-xs mt-0.5" style={{ color: B.muted }}>{text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}