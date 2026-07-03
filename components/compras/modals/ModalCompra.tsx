// components/compras/components/modals/ModalCompra.tsx
'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { B } from '@/lib/brand';
import { useAuth } from '@/lib/auth/AuthContext';
import { crearCompra, actualizarCompra } from '@/lib/supabase/queries';
import type { Compra, TipoComprobanteCompra } from '@/lib/supabase/types';
import { ModalBase } from './ModalBase';
import {
  inputCls, INP, FORM_VACIO, calcularTotales,
  type FormState, type CompraItem,
} from '@/utils/compras/comprasUtils';
import { TIPOS_COMP, ZONAS_DESTINO } from '@/constants/compras/comprasConstants';

interface ModalCompraProps {
  onClose:       () => void;
  onSaved:       () => void;
  compraEditar?: Compra | null;
}

export function ModalCompra({ onClose, onSaved, compraEditar }: ModalCompraProps) {
  const { usuario } = useAuth();

  const [form, setForm] = useState<FormState>(() => {
    if (!compraEditar) return FORM_VACIO;
    return {
      tipo_comprobante: compraEditar.tipo_comprobante,
      serie:            compraEditar.serie ?? '',
      numero:           compraEditar.numero ?? '',
      fecha_emision:    compraEditar.fecha_emision,
      proveedor_nombre: compraEditar.proveedor_nombre,
      proveedor_doc:    compraEditar.proveedor_doc ?? '',
      descripcion:      compraEditar.descripcion ?? '',
      igv_incluido:     true,
      items: compraEditar.items?.map(i => ({
        descripcion:     i.descripcion,
        cantidad:        String(i.cantidad),
        precio_unitario: String(i.precio_unitario),
        zona_destino:    i.zona_destino,
      })) ?? [{ descripcion: '', cantidad: '1', precio_unitario: '', zona_destino: 'cocina' }],
    };
  });

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const { igv, baseImp, total } = calcularTotales(form.items, form.igv_incluido);

  // ─── Handlers de items ────────────────────────────────────────────────────
  const addItem = () =>
    setForm(f => ({
      ...f,
      items: [...f.items, { descripcion: '', cantidad: '1', precio_unitario: '', zona_destino: 'cocina' }],
    }));

  const removeItem = (idx: number) =>
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const updateItem = (idx: number, key: keyof CompraItem, value: string) =>
    setForm(f => ({
      ...f,
      items: f.items.map((item, i) => (i === idx ? { ...item, [key]: value } : item)),
    }));

  // ─── Guardar ──────────────────────────────────────────────────────────────
    const handleGuardar = async () => {
    if (!form.proveedor_nombre.trim()) { setError('El proveedor es obligatorio'); return; }
    if (!form.numero.trim())           { setError('El número de comprobante es obligatorio'); return; }
    if (!usuario) return;

    setLoading(true);
    setError('');

    const cabecera = {
        tipo_comprobante:    form.tipo_comprobante,
        serie:               form.serie || null,
        numero:              form.numero,
        fecha_emision:       form.fecha_emision,
        fecha_vencimiento:   null,
        proveedor_nombre:    form.proveedor_nombre,
        proveedor_doc:       form.proveedor_doc || null,
        proveedor_tipo_doc:  form.proveedor_doc?.length === 11 ? 'ruc' : 'dni',
        base_imponible:      baseImp,
        igv,
        total,
        descripcion:         form.descripcion || null,
        usuario_id:          usuario.id,
    };

    const itemsLimpios = form.items
        .filter(i => i.descripcion.trim())
        .map(i => ({
        descripcion:     i.descripcion,
        cantidad:        parseInt(i.cantidad) || 1,
        precio_unitario: parseFloat(i.precio_unitario) || 0,
        zona_destino:    i.zona_destino,
        }));

    try {
        if (compraEditar) {
        // ← EDITAR: update en lugar de insert
        await actualizarCompra(compraEditar.id, cabecera, itemsLimpios);
        } else {
        // ← NUEVA: igual que antes
        await crearCompra(cabecera, itemsLimpios);
        }
        onSaved();
    } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
        setLoading(false);
    }
    };

  return (
    <ModalBase
      title={compraEditar ? 'Editar Compra' : 'Nueva Compra'}
      onClose={onClose}
      actions={
        <>
          <button
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: B.cream, color: B.charcoal }}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
            style={{ background: B.green, color: B.cream }}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {compraEditar ? 'Guardar cambios' : 'Registrar compra'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Tipo y Fecha */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              className="text-xs font-black uppercase tracking-wide block mb-1.5"
              style={{ color: B.muted }}
            >
              Tipo
            </label>
            <select
              value={form.tipo_comprobante}
              onChange={e =>
                setForm(f => ({
                  ...f,
                  tipo_comprobante: e.target.value as TipoComprobanteCompra,
                }))
              }
              className={inputCls()}
              style={INP}
            >
              {TIPOS_COMP.map(t => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              className="text-xs font-black uppercase tracking-wide block mb-1.5"
              style={{ color: B.muted }}
            >
              Fecha
            </label>
            <input
              type="date"
              value={form.fecha_emision}
              onChange={e => setForm(f => ({ ...f, fecha_emision: e.target.value }))}
              className={inputCls()}
              style={INP}
            />
          </div>
        </div>

        {/* Serie y Número */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              className="text-xs font-black uppercase tracking-wide block mb-1.5"
              style={{ color: B.muted }}
            >
              Serie
            </label>
            <input
              type="text"
              value={form.serie}
              onChange={e => setForm(f => ({ ...f, serie: e.target.value }))}
              placeholder="F001"
              className={inputCls()}
              style={INP}
            />
          </div>
          <div>
            <label
              className="text-xs font-black uppercase tracking-wide block mb-1.5"
              style={{ color: B.muted }}
            >
              Número *
            </label>
            <input
              type="text"
              value={form.numero}
              onChange={e => setForm(f => ({ ...f, numero: e.target.value }))}
              placeholder="12345"
              className={inputCls()}
              style={INP}
            />
          </div>
        </div>

        {/* Proveedor */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              className="text-xs font-black uppercase tracking-wide block mb-1.5"
              style={{ color: B.muted }}
            >
              Proveedor *
            </label>
            <input
              type="text"
              value={form.proveedor_nombre}
              onChange={e => setForm(f => ({ ...f, proveedor_nombre: e.target.value }))}
              placeholder="Distribuidora S.A.C."
              className={inputCls()}
              style={INP}
            />
          </div>
          <div>
            <label
              className="text-xs font-black uppercase tracking-wide block mb-1.5"
              style={{ color: B.muted }}
            >
              RUC / DNI
            </label>
            <input
              type="text"
              value={form.proveedor_doc}
              onChange={e => setForm(f => ({ ...f, proveedor_doc: e.target.value }))}
              placeholder="20525474071"
              className={inputCls()}
              style={INP}
            />
          </div>
        </div>

        {/* Items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              className="text-xs font-black uppercase tracking-wide"
              style={{ color: B.muted }}
            >
              Items / Productos
            </label>
            <button
              onClick={addItem}
              className="text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1"
              style={{ background: `${B.green}18`, color: B.green }}
            >
              <Plus className="w-3 h-3" /> Agregar
            </button>
          </div>

          <div className="space-y-2">
            {form.items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <input
                  type="text"
                  value={item.descripcion}
                  onChange={e => updateItem(idx, 'descripcion', e.target.value)}
                  placeholder="Descripción del producto"
                  className="col-span-4 px-3 py-2 rounded-xl text-xs outline-none"
                  style={INP}
                />
                <input
                  type="number"
                  value={item.cantidad}
                  onChange={e => updateItem(idx, 'cantidad', e.target.value)}
                  placeholder="Cant."
                  className="col-span-1 px-2 py-2 rounded-xl text-xs outline-none text-center"
                  style={INP}
                />
                <input
                  type="number"
                  value={item.precio_unitario}
                  onChange={e => updateItem(idx, 'precio_unitario', e.target.value)}
                  placeholder="Precio"
                  className="col-span-2 px-2 py-2 rounded-xl text-xs outline-none"
                  style={INP}
                />
                <select
                  value={item.zona_destino}
                  onChange={e => updateItem(idx, 'zona_destino', e.target.value)}
                  className="col-span-3 px-2 py-2 rounded-xl text-xs outline-none"
                  style={INP}
                >
                  {ZONAS_DESTINO.map(z => (
                    <option key={z.value} value={z.value}>
                      {z.label}
                    </option>
                  ))}
                </select>
                <div
                  className="col-span-1 text-xs text-right font-bold"
                  style={{ color: B.charcoal }}
                >
                  S/
                  {(
                    parseFloat(item.cantidad || '0') *
                    parseFloat(item.precio_unitario || '0')
                  ).toFixed(0)}
                </div>
                <button
                  onClick={() => removeItem(idx)}
                  disabled={form.items.length === 1}
                  className="col-span-1 p-1.5 rounded-lg disabled:opacity-30"
                  style={{ color: B.terra }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Totales */}
        <div className="rounded-xl p-4" style={{ background: B.cream }}>
          <div className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              id="igv_incluido"
              checked={form.igv_incluido}
              onChange={e => setForm(f => ({ ...f, igv_incluido: e.target.checked }))}
            />
            <label
              htmlFor="igv_incluido"
              className="text-xs font-semibold"
              style={{ color: B.charcoal }}
            >
              IGV incluido en precios
            </label>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between" style={{ color: B.muted }}>
              <span>Base imponible</span>
              <span>S/ {baseImp.toFixed(2)}</span>
            </div>
            <div className="flex justify-between" style={{ color: B.muted }}>
              <span>IGV (18%)</span>
              <span>S/ {igv.toFixed(2)}</span>
            </div>
            <div
              className="flex justify-between font-black text-base border-t pt-1"
              style={{ borderColor: B.creamDark, color: B.charcoal }}
            >
              <span>Total</span>
              <span style={{ color: B.terra }}>S/ {total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <p
            className="text-xs px-3 py-2 rounded-xl"
            style={{ background: '#fef0e6', color: B.terra }}
          >
            {error}
          </p>
        )}
      </div>
    </ModalBase>
  );
}