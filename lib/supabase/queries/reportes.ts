// lib/supabase/queries/reportes.ts
// Queries adicionales para el módulo de Reportes.
// Añadir a queries/index.ts con: export * from './reportes';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any;
import { supabase as _supabase } from '../client';
const db = _supabase as DB;
const supabase = _supabase;

// ─── Tipos de retorno ─────────────────────────────────────────────────────────

export interface ReporteVentasPorMetodoPago {
  metodo_pago: string;
  total:       number;
  cantidad:    number;
}

export interface ReporteVentasPorComprobante {
  tipo:     string;
  total:    number;
  cantidad: number;
}

export interface ReporteTopCategorias {
  categoria: string;
  total:     number;
  qty:       number;
  pct:       number;
}

export interface ReporteTopProductos {
  producto_id: string;
  nombre:      string;
  categoria:   string;
  qty:         number;
  total:       number;
  pct:         number;
}

export interface ReporteTopUsuarios {
  usuario_id: string;
  nombre:     string;
  rol:        string;
  ventas:     number;
  total:      number;
  pct:        number;
}

export interface ReporteTopClientes {
  cliente_id:  string;
  nombre:      string;
  compras:     number;
  total:       number;
  ultima_visita: string;
}

export interface ReporteResumenPeriodo {
  totalVentas:        number;
  totalTransacciones: number;
  totalCompras:       number;
  totalProductos:     number;
  totalProductosUnicos: number;
  totalComprobantes:  number;
  totalInventario:    number;
  totalProductosStock: number;
  clientesAtendidos:  number;
  ticketPromedio:     number;
  promedioPorCliente: number;
  productosAgotados:  number;
  stockBajo:          number;
}

export interface ReporteVentasSemanal {
  semana:    string; // "01-Jun - 07-Jun"
  inicio:    string;
  fin:       string;
  total:     number;
  cantidad:  number;
}

export interface DetalleVenta {
  id:               string;
  fecha_local:      string;
  cliente_nombre:   string | null;
  usuario_nombre:   string;
  tipo_comprobante: string;
  metodo_pago:      string;
  total:            number;
  items_count:      number;
}

// ─── Función: rango de fechas de la semana actual Lima ────────────────────────
// Reemplazo seguro para getRangoSemanaActual() en reportes.ts
function getRangoSemanaActual(): { inicio: string; fin: string } {
  const iso = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());
  const [year, month, day] = iso.split('-').map(Number);
  const hoy    = new Date(Date.UTC(year, month - 1, day));
  const dia    = hoy.getUTCDay();
  const lunes  = new Date(hoy);
  lunes.setUTCDate(hoy.getUTCDate() - (dia === 0 ? 6 : dia - 1));
  const domingo = new Date(lunes);
  domingo.setUTCDate(lunes.getUTCDate() + 6);
  return {
    inicio: lunes.toISOString().split('T')[0],
    fin:    domingo.toISOString().split('T')[0],
  };
}

// ─── Reportes por rango de fechas ─────────────────────────────────────────────

export async function getReporteResumenPeriodo(
  desde: string,
  hasta: string,
): Promise<ReporteResumenPeriodo> {
  const [ventasRes, comprasRes, itemsRes, productosRes] = await Promise.all([
    // Ventas del período
    db.from('ventas')
      .select('id, total, cliente_id')
      .eq('estado', 'completada')
      .gte('fecha_local', desde)
      .lte('fecha_local', hasta),

    // Compras del período
    db.from('compras')
      .select('total')
      .gte('fecha_emision', desde)
      .lte('fecha_emision', hasta),

    // Items de ventas para productos vendidos
    db.from('venta_items')
      .select('cantidad, venta_id'),

    // Productos para inventario
    db.from('productos')
      .select('precio, stock, stock_tienda, stock_minimo_tienda, tipo, activo')
      .eq('activo', true),
  ]);

  const ventas    = (ventasRes.data  ?? []) as Array<{ id: string; total: number; cliente_id: string | null }>;
  const compras   = (comprasRes.data ?? []) as Array<{ total: number }>;
  const productos = (productosRes.data ?? []) as Array<{
    precio: number; stock: number; stock_tienda: number;
    stock_minimo_tienda: number; tipo: string; activo: boolean;
  }>;

  const ventaIds = new Set(ventas.map(v => v.id));
  const allItems = (itemsRes.data ?? []) as Array<{ cantidad: number; venta_id: string }>;
  const itemsDelPeriodo = allItems.filter(i => ventaIds.has(i.venta_id));

  const totalVentas        = ventas.reduce((s, v) => s + (v.total ?? 0), 0);
  const totalCompras       = compras.reduce((s, c) => s + (c.total ?? 0), 0);
  const totalProductos     = itemsDelPeriodo.reduce((s, i) => s + (i.cantidad ?? 0), 0);
  const totalProductosUnicos = new Set(itemsDelPeriodo.map(i => i.venta_id)).size; // approx
  const clientesAtendidos  = new Set(ventas.map(v => v.cliente_id).filter(Boolean)).size;
  const ticketPromedio     = ventas.length > 0 ? totalVentas / ventas.length : 0;
  const promedioPorCliente = clientesAtendidos > 0 ? totalVentas / clientesAtendidos : totalVentas;

  // Comprobantes del período
  const { data: compsData } = await db
    .from('comprobantes')
    .select('id, venta_id')
    .in('venta_id', ventas.map(v => v.id));
  const totalComprobantes = (compsData ?? []).length;

  // Inventario
  const productosVenta    = productos.filter(p => p.tipo === 'producto_venta');
  const totalInventario   = productosVenta.reduce((s, p) => s + (p.precio * p.stock_tienda), 0);
  const totalProductosStock = productosVenta.length;
  const productosAgotados = productosVenta.filter(p => p.stock_tienda === 0).length;
  const stockBajo         = productosVenta.filter(
    p => p.stock_tienda > 0 && p.stock_tienda < p.stock_minimo_tienda
  ).length;

  return {
    totalVentas,
    totalTransacciones: ventas.length,
    totalCompras,
    totalProductos,
    totalProductosUnicos,
    totalComprobantes,
    totalInventario,
    totalProductosStock,
    clientesAtendidos,
    ticketPromedio,
    promedioPorCliente,
    productosAgotados,
    stockBajo,
  };
}

export async function getReporteVentasPorMetodoPago(
  desde: string,
  hasta: string,
): Promise<ReporteVentasPorMetodoPago[]> {
  const { data, error } = await db
    .from('ventas')
    .select('metodo_pago, total')
    .eq('estado', 'completada')
    .gte('fecha_local', desde)
    .lte('fecha_local', hasta);
  if (error) throw error;

  const map = new Map<string, { total: number; cantidad: number }>();
  for (const v of (data ?? []) as Array<{ metodo_pago: string; total: number }>) {
    const prev = map.get(v.metodo_pago) ?? { total: 0, cantidad: 0 };
    map.set(v.metodo_pago, { total: prev.total + v.total, cantidad: prev.cantidad + 1 });
  }
  return [...map.entries()]
    .map(([metodo_pago, v]) => ({ metodo_pago, ...v }))
    .sort((a, b) => b.total - a.total);
}

export async function getReporteVentasPorComprobante(
  desde: string,
  hasta: string,
): Promise<ReporteVentasPorComprobante[]> {
  const { data, error } = await db
    .from('ventas')
    .select('tipo_comprobante, total')
    .eq('estado', 'completada')
    .gte('fecha_local', desde)
    .lte('fecha_local', hasta);
  if (error) throw error;

  const map = new Map<string, { total: number; cantidad: number }>();
  for (const v of (data ?? []) as Array<{ tipo_comprobante: string; total: number }>) {
    const prev = map.get(v.tipo_comprobante) ?? { total: 0, cantidad: 0 };
    map.set(v.tipo_comprobante, { total: prev.total + v.total, cantidad: prev.cantidad + 1 });
  }
  return [...map.entries()]
    .map(([tipo, v]) => ({ tipo, ...v }))
    .sort((a, b) => b.total - a.total);
}

export async function getReporteTopProductos(
  desde: string,
  hasta: string,
  limite = 5,
): Promise<ReporteTopProductos[]> {
  // 1. IDs de ventas del período
  const { data: ventas, error: errV } = await db
    .from('ventas')
    .select('id')
    .eq('estado', 'completada')
    .gte('fecha_local', desde)
    .lte('fecha_local', hasta);
  if (errV) throw errV;
  const ids = ((ventas ?? []) as Array<{ id: string }>).map(v => v.id);
  if (ids.length === 0) return [];

  // 2. Items de esas ventas con producto
  const { data, error } = await db
    .from('venta_items')
    .select('cantidad, precio_unitario, producto:productos(id, nombre, categoria)')
    .in('venta_id', ids);
  if (error) throw error;

  const map = new Map<string, ReporteTopProductos>();
  for (const item of (data ?? []) as Array<{
    cantidad: number; precio_unitario: number;
    producto: { id: string; nombre: string; categoria: string } | null;
  }>) {
    if (!item.producto) continue;
    const prev = map.get(item.producto.id) ?? {
      producto_id: item.producto.id,
      nombre:      item.producto.nombre,
      categoria:   item.producto.categoria,
      qty:         0, total: 0, pct: 0,
    };
    map.set(item.producto.id, {
      ...prev,
      qty:   prev.qty   + item.cantidad,
      total: prev.total + (item.cantidad * item.precio_unitario),
    });
  }

  const sorted = [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, limite);
  const maxQty = sorted[0]?.qty ?? 1;
  return sorted.map(p => ({ ...p, pct: (p.qty / maxQty) * 100 }));
}

export async function getReporteTopCategorias(
  desde: string,
  hasta: string,
): Promise<ReporteTopCategorias[]> {
  const { data: ventas } = await db
    .from('ventas')
    .select('id')
    .eq('estado', 'completada')
    .gte('fecha_local', desde)
    .lte('fecha_local', hasta);
  const ids = ((ventas ?? []) as Array<{ id: string }>).map(v => v.id);
  if (ids.length === 0) return [];

  const { data, error } = await db
    .from('venta_items')
    .select('cantidad, precio_unitario, producto:productos(categoria)')
    .in('venta_id', ids);
  if (error) throw error;

  const map = new Map<string, { total: number; qty: number }>();
  for (const item of (data ?? []) as Array<{
    cantidad: number; precio_unitario: number;
    producto: { categoria: string } | null;
  }>) {
    if (!item.producto?.categoria) continue;
    const prev = map.get(item.producto.categoria) ?? { total: 0, qty: 0 };
    map.set(item.producto.categoria, {
      total: prev.total + (item.cantidad * item.precio_unitario),
      qty:   prev.qty   + item.cantidad,
    });
  }

  const sorted = [...map.entries()]
    .map(([categoria, v]) => ({ categoria, ...v, pct: 0 }))
    .sort((a, b) => b.qty - a.qty);
  const totalQty = sorted.reduce((s, c) => s + c.qty, 0) || 1;
  return sorted.map(c => ({ ...c, pct: (c.qty / totalQty) * 100 }));
}

export async function getReporteTopUsuarios(
  desde: string,
  hasta: string,
): Promise<ReporteTopUsuarios[]> {
  const { data, error } = await db
    .from('ventas')
    .select('total, usuario:usuarios(id, nombre, rol)')
    .eq('estado', 'completada')
    .gte('fecha_local', desde)
    .lte('fecha_local', hasta);
  if (error) throw error;

  const map = new Map<string, ReporteTopUsuarios>();
  for (const v of (data ?? []) as Array<{
    total: number;
    usuario: { id: string; nombre: string; rol: string } | null;
  }>) {
    if (!v.usuario) continue;
    const prev = map.get(v.usuario.id) ?? {
      usuario_id: v.usuario.id,
      nombre:     v.usuario.nombre,
      rol:        v.usuario.rol,
      ventas:     0, total: 0, pct: 0,
    };
    map.set(v.usuario.id, { ...prev, ventas: prev.ventas + 1, total: prev.total + v.total });
  }

  const sorted = [...map.values()].sort((a, b) => b.total - a.total);
  const maxTotal = sorted[0]?.total ?? 1;
  return sorted.map(u => ({ ...u, pct: (u.total / maxTotal) * 100 }));
}

export async function getReporteTopClientes(
  desde: string,
  hasta: string,
  limite = 5,
): Promise<ReporteTopClientes[]> {
  const { data, error } = await db
    .from('ventas')
    .select('total, fecha_local, cliente:clientes(id, nombre)')
    .eq('estado', 'completada')
    .gte('fecha_local', desde)
    .lte('fecha_local', hasta)
    .not('cliente_id', 'is', null);
  if (error) throw error;

  const map = new Map<string, ReporteTopClientes>();
  for (const v of (data ?? []) as Array<{
    total: number; fecha_local: string;
    cliente: { id: string; nombre: string } | null;
  }>) {
    if (!v.cliente) continue;
    const prev = map.get(v.cliente.id) ?? {
      cliente_id:    v.cliente.id,
      nombre:        v.cliente.nombre,
      compras:       0,
      total:         0,
      ultima_visita: v.fecha_local,
    };
    map.set(v.cliente.id, {
      ...prev,
      compras:       prev.compras + 1,
      total:         prev.total + v.total,
      ultima_visita: v.fecha_local > prev.ultima_visita ? v.fecha_local : prev.ultima_visita,
    });
  }

  return [...map.values()].sort((a, b) => b.total - a.total).slice(0, limite);
}

export async function getReporteDetalleVentas(
  desde: string,
  hasta: string,
  limite = 20,
): Promise<DetalleVenta[]> {
  const { data, error } = await db
    .from('ventas')
    .select(`
      id, fecha_local, total, tipo_comprobante, metodo_pago,
      cliente:clientes(nombre),
      usuario:usuarios(nombre)
    `)
    .eq('estado', 'completada')
    .gte('fecha_local', desde)
    .lte('fecha_local', hasta)
    .order('fecha_local', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limite);
  if (error) throw error;

  // Traer conteo de items por venta
  const ids = ((data ?? []) as Array<{ id: string }>).map(v => v.id);
  const { data: itemsData } = ids.length > 0
    ? await db.from('venta_items').select('venta_id, cantidad').in('venta_id', ids)
    : { data: [] };

  const itemsMap = new Map<string, number>();
  for (const i of (itemsData ?? []) as Array<{ venta_id: string; cantidad: number }>) {
    itemsMap.set(i.venta_id, (itemsMap.get(i.venta_id) ?? 0) + i.cantidad);
  }

  return ((data ?? []) as Array<{
    id: string; fecha_local: string; total: number;
    tipo_comprobante: string; metodo_pago: string;
    cliente: { nombre: string } | null;
    usuario: { nombre: string } | null;
  }>).map(v => ({
    id:               v.id,
    fecha_local:      v.fecha_local,
    cliente_nombre:   v.cliente?.nombre ?? 'Cliente General',
    usuario_nombre:   v.usuario?.nombre ?? '—',
    tipo_comprobante: v.tipo_comprobante,
    metodo_pago:      v.metodo_pago,
    total:            v.total,
    items_count:      itemsMap.get(v.id) ?? 0,
  }));
}

export async function getReporteVentasSemanales(
  desde: string,
  hasta: string,
): Promise<ReporteVentasSemanal[]> {
  const { data, error } = await supabase
    .from('ventas')
    .select('total, fecha_local')
    .eq('estado', 'completada')
    .gte('fecha_local', desde)
    .lte('fecha_local', hasta)
    .order('fecha_local');
  if (error) throw error;

  // Agrupar por semana ISO
  const semanas = new Map<string, { inicio: Date; fin: Date; total: number; cantidad: number }>();
  for (const v of (data ?? []) as Array<{ total: number; fecha_local: string }>) {
    const d      = new Date(v.fecha_local + 'T00:00:00');
    const dia    = d.getDay();
    const lunes  = new Date(d);
    lunes.setDate(d.getDate() - (dia === 0 ? 6 : dia - 1));
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    const key = lunes.toISOString().split('T')[0];
    const prev = semanas.get(key) ?? { inicio: lunes, fin: domingo, total: 0, cantidad: 0 };
    semanas.set(key, { ...prev, total: prev.total + v.total, cantidad: prev.cantidad + 1 });
  }

  const fmt = (d: Date) =>
    d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });

  return [...semanas.values()].map(s => ({
    semana:   `${fmt(s.inicio)} - ${fmt(s.fin)}`,
    inicio:   s.inicio.toISOString().split('T')[0],
    fin:      s.fin.toISOString().split('T')[0],
    total:    s.total,
    cantidad: s.cantidad,
  }));
}

export { getRangoSemanaActual };

// ════════════════════════════════════════════════════════════════════════════
// PDF — Datos adicionales para el reporte completo
// ════════════════════════════════════════════════════════════════════════════

export interface DetalleVentaPDF extends DetalleVenta {
  hora_local: string;
}

export async function getReporteDetalleVentasCompleto(
  desde: string,
  hasta: string,
  limite = 100,
): Promise<DetalleVentaPDF[]> {
  const { data, error } = await db
    .from('ventas')
    .select(`
      id, fecha_local, hora_local, total, tipo_comprobante, metodo_pago,
      cliente:clientes(nombre),
      usuario:usuarios(nombre)
    `)
    .eq('estado', 'completada')
    .gte('fecha_local', desde)
    .lte('fecha_local', hasta)
    .order('fecha_local', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limite);
  if (error) throw error;

  const ids = ((data ?? []) as Array<{ id: string }>).map(v => v.id);
  const { data: itemsData } = ids.length > 0
    ? await db.from('venta_items').select('venta_id, cantidad').in('venta_id', ids)
    : { data: [] };

  const itemsMap = new Map<string, number>();
  for (const i of (itemsData ?? []) as Array<{ venta_id: string; cantidad: number }>) {
    itemsMap.set(i.venta_id, (itemsMap.get(i.venta_id) ?? 0) + i.cantidad);
  }

  return ((data ?? []) as Array<{
    id: string; fecha_local: string; hora_local: string; total: number;
    tipo_comprobante: string; metodo_pago: string;
    cliente: { nombre: string } | null;
    usuario: { nombre: string } | null;
  }>).map(v => ({
    id:               v.id,
    fecha_local:      v.fecha_local,
    hora_local:       v.hora_local,
    cliente_nombre:   v.cliente?.nombre ?? 'Cliente General',
    usuario_nombre:   v.usuario?.nombre ?? '—',
    tipo_comprobante: v.tipo_comprobante,
    metodo_pago:      v.metodo_pago,
    total:            v.total,
    items_count:      itemsMap.get(v.id) ?? 0,
  }));
}

export interface ReporteProductoStock {
  nombre:        string;
  categoria:     string;
  stock_tienda:  number;
  stock_minimo:  number;
  precio:        number;
}

export async function getReporteProductosAgotados(): Promise<ReporteProductoStock[]> {
  const { data, error } = await db
    .from('productos')
    .select('nombre, categoria, stock_tienda, stock_minimo_tienda, precio')
    .eq('activo', true)
    .eq('tipo', 'producto_venta')
    .eq('stock_tienda', 0)
    .order('categoria')
    .order('nombre');
  if (error) throw error;

  return ((data ?? []) as Array<{
    nombre: string; categoria: string; stock_tienda: number;
    stock_minimo_tienda: number; precio: number;
  }>).map(p => ({
    nombre:       p.nombre,
    categoria:    p.categoria,
    stock_tienda: p.stock_tienda,
    stock_minimo: p.stock_minimo_tienda,
    precio:       p.precio,
  }));
}

export async function getReporteProductosStockBajo(): Promise<ReporteProductoStock[]> {
  const { data, error } = await db
    .from('productos')
    .select('nombre, categoria, stock_tienda, stock_minimo_tienda, precio')
    .eq('activo', true)
    .eq('tipo', 'producto_venta')
    .gt('stock_tienda', 0)
    .order('categoria')
    .order('nombre');
  if (error) throw error;

  return ((data ?? []) as Array<{
    nombre: string; categoria: string; stock_tienda: number;
    stock_minimo_tienda: number; precio: number;
  }>)
    .filter(p => p.stock_tienda < p.stock_minimo_tienda)
    .map(p => ({
      nombre:       p.nombre,
      categoria:    p.categoria,
      stock_tienda: p.stock_tienda,
      stock_minimo: p.stock_minimo_tienda,
      precio:       p.precio,
    }));
}