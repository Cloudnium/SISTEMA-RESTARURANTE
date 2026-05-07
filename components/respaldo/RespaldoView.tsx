'use client';

import React, { useState, useCallback } from 'react';
import {
  Download, Upload, Shield, Clock, AlertTriangle,
  CheckCircle, Loader2, FileJson,
} from 'lucide-react';
import { B } from '@/lib/brand';
import { PageHeader, Card } from '@/components/ui';
import { supabase } from '@/lib/supabase/client';

// ─── Tipos ────────────────────────────────────────────────────────────────────
type EstadoOp = 'idle' | 'loading' | 'success' | 'error';

interface LimitesBackup {
  descargasHoy:        number;
  restauracionesHoy:   number;
  descargasRestantes:  number;
  restauracionesRest:  number;
  limite:              number;
}

interface BackupData {
  version:   string;
  fecha:     string;
  sistema:   string;
  tablas:    Record<string, unknown[]>;
}

// ─── Tablas a exportar/importar ───────────────────────────────────────────────
const TABLAS_BACKUP = [
  'productos', 'categorias_producto', 'clientes', 'mesas',
  'cajas', 'usuarios', 'ventas', 'venta_items',
  'comprobantes', 'compras', 'compra_items',
  'movimientos_caja', 'produccion_cocina', 'recetas',
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getClaveBackup() {
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  return `madre_backup_${hoy}`;
}

function obtenerContadores(): LimitesBackup {
  const clave  = getClaveBackup();
  const datos  = JSON.parse(localStorage.getItem(clave) ?? '{}');
  const limite = 2;
  return {
    descargasHoy:       datos.descargas       ?? 0,
    restauracionesHoy:  datos.restauraciones  ?? 0,
    descargasRestantes: Math.max(0, limite - (datos.descargas      ?? 0)),
    restauracionesRest: Math.max(0, limite - (datos.restauraciones ?? 0)),
    limite,
  };
}

function incrementarContador(tipo: 'descargas' | 'restauraciones') {
  const clave  = getClaveBackup();
  const datos  = JSON.parse(localStorage.getItem(clave) ?? '{}');
  datos[tipo]  = (datos[tipo] ?? 0) + 1;
  localStorage.setItem(clave, JSON.stringify(datos));
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function RespaldoView() {
  // obtenerContadores como lazy initializer (sin invocar) — evita setState en efecto
  const [limites,     setLimites]     = useState<LimitesBackup>(obtenerContadores);
  const [estadoDesc,  setEstadoDesc]  = useState<EstadoOp>('idle');
  const [estadoRest,  setEstadoRest]  = useState<EstadoOp>('idle');
  const [archivo,     setArchivo]     = useState<File | null>(null);
  const [progreso,    setProgreso]    = useState('');
  const [errorMsg,    setErrorMsg]    = useState('');
  const [confirmando, setConfirmando] = useState(false);

  const recargarLimites = useCallback(() => setLimites(obtenerContadores()), []);

  // ── Descargar Backup ────────────────────────────────────────────────────────
  const handleDescargar = async () => {
    if (limites.descargasRestantes <= 0) {
      setErrorMsg('Ya alcanzaste el límite de 2 descargas por día.');
      return;
    }

    setEstadoDesc('loading');
    setProgreso('Conectando con Supabase...');

    try {
      const backup: BackupData = {
        version: '1.0.0',
        fecha:   new Date().toISOString(),
        sistema: 'MADRE · Postres y Café',
        tablas:  {},
      };

      for (const tabla of TABLAS_BACKUP) {
        setProgreso(`Exportando ${tabla}...`);
        const { data, error } = await supabase.from(tabla).select('*');
        if (error) {
          console.warn(`Error en tabla ${tabla}:`, error.message);
          backup.tablas[tabla] = [];
        } else {
          backup.tablas[tabla] = data ?? [];
        }
      }

      setProgreso('Generando archivo...');
      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);

      const fecha     = new Date().toLocaleDateString('es-PE', { timeZone: 'America/Lima' }).replace(/\//g, '-');
      const link      = document.createElement('a');
      link.href       = url;
      link.download   = `madre_backup_${fecha}.json`;
      link.click();
      URL.revokeObjectURL(url);

      incrementarContador('descargas');
      recargarLimites();
      setEstadoDesc('success');
      setProgreso('');
      setTimeout(() => setEstadoDesc('idle'), 3000);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Error al generar el backup');
      setEstadoDesc('error');
      setProgreso('');
    }
  };

  // ── Restaurar Backup ────────────────────────────────────────────────────────
  const validarBackup = (data: unknown): data is BackupData => {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return typeof d.version === 'string' &&
           typeof d.fecha   === 'string' &&
           typeof d.tablas  === 'object';
  };

  const handleRestaurar = async () => {
    if (!archivo) return;
    if (limites.restauracionesRest <= 0) {
      setErrorMsg('Ya alcanzaste el límite de 2 restauraciones por día.');
      return;
    }

    setEstadoRest('loading');
    setConfirmando(false);
    setErrorMsg('');

    try {
      setProgreso('Leyendo archivo...');
      const texto = await archivo.text();
      const data  = JSON.parse(texto);

      if (!validarBackup(data)) {
        throw new Error('El archivo no es un backup válido de MADRE.');
      }

      // Restaurar tabla por tabla
      for (const [tabla, filas] of Object.entries(data.tablas)) {
        if (!TABLAS_BACKUP.includes(tabla as typeof TABLAS_BACKUP[number])) continue;
        if (!Array.isArray(filas) || filas.length === 0) continue;

        setProgreso(`Restaurando ${tabla} (${filas.length} registros)...`);

        // Upsert en lotes de 100
        const LOTE = 100;
        for (let i = 0; i < filas.length; i += LOTE) {
          const lote = filas.slice(i, i + LOTE);
          const { error } = await supabase
            .from(tabla)
            .upsert(lote as Parameters<typeof supabase.from>[0][], { onConflict: 'id' });
          if (error) {
            console.warn(`Error restaurando ${tabla}:`, error.message);
          }
        }
      }

      incrementarContador('restauraciones');
      recargarLimites();
      setEstadoRest('success');
      setArchivo(null);
      setProgreso('');
      setTimeout(() => { setEstadoRest('idle'); }, 2000);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Error al restaurar el backup');
      setEstadoRest('error');
      setProgreso('');
    }
  };

  return (
    <div>
      <PageHeader title="Respaldo y Restauración" subtitle="Exporta o importa copias de seguridad del sistema" />

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-2xl mb-5"
        style={{ background: `${B.green}10`, border: `1px solid ${B.green}30` }}>
        <Shield className="w-5 h-5 shrink-0 mt-0.5" style={{ color: B.green }} />
        <div className="text-sm" style={{ color: B.charcoal }}>
          <p className="font-bold mb-0.5" style={{ color: B.green }}>¿Qué se guarda en el backup?</p>
          <p>
            Se exportan todos los datos del sistema: productos, clientes, ventas, compras, mesas,
            cajas, usuarios y comprobantes. Esta copia permite{' '}
            <strong>restaurar el sistema completo</strong> al estado del momento del respaldo.
            Se permiten <strong>2 descargas y 2 restauraciones por día</strong>.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── Descargar ────────────────────────────────────────────────────── */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: B.green, color: B.cream }}>
                <Download className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: B.charcoal }}>Descargar Copia de Seguridad</p>
                <p className="text-xs" style={{ color: B.muted }}>Genera un archivo .json con todos los datos</p>
              </div>
            </div>
            <span className="text-xs font-bold px-2 py-1 rounded-full"
              style={{
                background: limites.descargasRestantes > 0 ? `${B.green}18` : '#fee2e2',
                color:      limites.descargasRestantes > 0 ? B.green : B.terra,
              }}>
              {limites.descargasRestantes} restantes hoy
            </span>
          </div>

          {/* Info */}
          <div className="rounded-xl p-3 mb-4 flex items-start gap-2"
            style={{ background: B.cream }}>
            <Clock className="w-4 h-4 shrink-0 mt-0.5" style={{ color: B.muted }} />
            <p className="text-xs" style={{ color: B.muted }}>
              El archivo incluye: {TABLAS_BACKUP.join(', ')}.{' '}
              <strong>La descarga puede tardar según la cantidad de registros.</strong>
            </p>
          </div>

          {/* Progreso / Éxito / Error */}
          {estadoDesc === 'loading' && progreso && (
            <div className="rounded-xl p-3 mb-4 flex items-center gap-2"
              style={{ background: `${B.gold}12` }}>
              <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: B.gold }} />
              <p className="text-xs font-medium" style={{ color: B.charcoal }}>{progreso}</p>
            </div>
          )}
          {estadoDesc === 'success' && (
            <div className="rounded-xl p-3 mb-4 flex items-center gap-2"
              style={{ background: '#e8f5e2' }}>
              <CheckCircle className="w-4 h-4 shrink-0" style={{ color: B.green }} />
              <p className="text-sm font-semibold" style={{ color: B.green }}>
                ¡Backup descargado correctamente!
              </p>
            </div>
          )}
          {estadoDesc === 'error' && errorMsg && (
            <div className="rounded-xl p-3 mb-4" style={{ background: '#fef0e6' }}>
              <p className="text-xs" style={{ color: B.terra }}>{errorMsg}</p>
            </div>
          )}

          <button
            onClick={handleDescargar}
            disabled={estadoDesc === 'loading' || limites.descargasRestantes <= 0}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all"
            style={{
              background: limites.descargasRestantes > 0 ? B.green : B.muted,
              color: B.cream,
              opacity: estadoDesc === 'loading' ? 0.7 : 1,
              cursor: limites.descargasRestantes <= 0 ? 'not-allowed' : 'pointer',
            }}>
            {estadoDesc === 'loading'
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Generando backup...</>
              : <><Download className="w-4 h-4" /> Descargar Backup</>
            }
          </button>
        </Card>

        {/* ── Restaurar ────────────────────────────────────────────────────── */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: B.terra, color: B.cream }}>
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: B.charcoal }}>Restaurar desde Backup</p>
                <p className="text-xs" style={{ color: B.muted }}>Sube un archivo .json para restaurar</p>
              </div>
            </div>
            <span className="text-xs font-bold px-2 py-1 rounded-full"
              style={{
                background: limites.restauracionesRest > 0 ? `${B.terra}18` : '#fee2e2',
                color:      limites.restauracionesRest > 0 ? B.terra : B.terra,
              }}>
              {limites.restauracionesRest} restantes hoy
            </span>
          </div>

          {/* Advertencia */}
          <div className="rounded-xl p-3 mb-4 flex items-start gap-2"
            style={{ background: '#fef0e6' }}>
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: B.terra }} />
            <p className="text-xs" style={{ color: B.terra }}>
              <strong>Atención:</strong> Al restaurar, los datos actuales serán actualizados
              con los del backup (upsert). Se recomienda descargar una copia antes de restaurar.
            </p>
          </div>

          {/* Selector de archivo */}
          <label className="block mb-3 cursor-pointer">
            <div className={`w-full border-2 border-dashed rounded-xl p-6 text-center transition-all ${archivo ? '' : 'hover:border-opacity-80'}`}
              style={{
                borderColor: archivo ? B.green : B.creamDark,
                background:  archivo ? `${B.green}08` : 'transparent',
              }}>
              {archivo ? (
                <div className="flex items-center justify-center gap-2">
                  <FileJson className="w-6 h-6" style={{ color: B.green }} />
                  <div className="text-left">
                    <p className="text-sm font-semibold" style={{ color: B.green }}>{archivo.name}</p>
                    <p className="text-xs" style={{ color: B.muted }}>
                      {(archivo.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: B.muted }} />
                  <p className="text-sm font-semibold" style={{ color: B.muted }}>
                    Haz clic para seleccionar
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: B.muted }}>
                    Archivo .json de backup de MADRE
                  </p>
                </>
              )}
            </div>
            <input type="file" accept=".json" className="hidden"
              onChange={e => {
                setArchivo(e.target.files?.[0] ?? null);
                setEstadoRest('idle');
                setErrorMsg('');
                setConfirmando(false);
              }} />
          </label>

          {/* Progreso / Éxito / Error de restauración */}
          {estadoRest === 'loading' && progreso && (
            <div className="rounded-xl p-3 mb-3 flex items-center gap-2"
              style={{ background: `${B.gold}12` }}>
              <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: B.gold }} />
              <p className="text-xs font-medium" style={{ color: B.charcoal }}>{progreso}</p>
            </div>
          )}
          {estadoRest === 'success' && (
            <div className="rounded-xl p-3 mb-3 flex items-center gap-2"
              style={{ background: '#e8f5e2' }}>
              <CheckCircle className="w-4 h-4 shrink-0" style={{ color: B.green }} />
              <p className="text-sm font-semibold" style={{ color: B.green }}>
                Restauración completada correctamente
              </p>
            </div>
          )}
          {estadoRest === 'error' && errorMsg && (
            <div className="rounded-xl p-3 mb-3" style={{ background: '#fef0e6' }}>
              <p className="text-xs" style={{ color: B.terra }}>{errorMsg}</p>
            </div>
          )}

          {/* Botón restaurar */}
          {archivo && estadoRest !== 'success' && (
            !confirmando ? (
              <button
                onClick={() => setConfirmando(true)}
                disabled={estadoRest === 'loading' || limites.restauracionesRest <= 0}
                className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                style={{ background: B.terra, color: B.cream }}>
                <Upload className="w-4 h-4" />
                Restaurar desde backup
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-center font-semibold" style={{ color: B.terra }}>
                  ¿Confirmas la restauración? Esta acción actualizará los datos actuales.
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmando(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: B.cream, color: B.charcoal }}>
                    Cancelar
                  </button>
                  <button onClick={handleRestaurar} disabled={estadoRest === 'loading'}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                    style={{ background: B.terra, color: B.cream }}>
                    {estadoRest === 'loading'
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : null
                    }
                    Confirmar restauración
                  </button>
                </div>
              </div>
            )
          )}
        </Card>
      </div>

      {/* Consejos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
        {[
          {
            icon: Clock, title: 'Recomendación', color: B.gold,
            text: 'Descarga una copia cada semana o antes de hacer cambios importantes en el sistema.',
          },
          {
            icon: Shield, title: 'Seguridad', color: B.terra,
            text: 'El archivo contiene datos sensibles del negocio. Guárdalo en un lugar seguro y privado.',
          },
        ].map(({ icon: Icon, title, text, color }) => (
          <div key={title} className="flex items-start gap-3 p-4 rounded-2xl"
            style={{ background: `${color}10`, border: `1px solid ${color}25` }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: color, color: B.cream }}>
              <Icon className="w-4 h-4" />
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