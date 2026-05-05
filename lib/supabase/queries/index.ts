// lib/supabase/queries/index.ts
// Todas las funciones de acceso a datos de Supabase organizadas por módulo.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any; // workaround temporal hasta que types.ts sea actualizado

import { supabase as _supabase } from '../client';
import type {
  Producto, Mesa, Cliente, Caja, Venta,
  Compra, ProduccionCocina,
  Usuario, Pedido, PedidoItem, Notificacion,
  CrearVentaPayload, EstadoMesa, ZonaAlmacen,
} from '../types';

// Cliente con tipado relajado para escrituras (INSERT/UPDATE) y RPCs
// Las lecturas (SELECT) siguen usando el cliente tipado normal
const db = _supabase as DB;
const supabase = _supabase;

// ════════════════════════════════════════════════════════════════════════════
// PRODUCTOS
// ════════════════════════════════════════════════════════════════════════════

export async function getProductos(): Promise<Producto[]> {
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .eq('activo', true)
    .order('nombre');
  if (error) throw error;
  return data ?? [];
}

export async function getProductosParaVenta(): Promise<Producto[]> {
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .eq('activo', true)
    .eq('tipo', 'producto_venta')
    .gt('stock_tienda', 0)
    .order('categoria')
    .order('nombre');
  if (error) throw error;
  return data ?? [];
}

export async function getInsumos(): Promise<Producto[]> {
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .eq('activo', true)
    .eq('tipo', 'insumo')
    .order('categoria')
    .order('nombre');
  if (error) throw error;
  return data ?? [];
}

export async function getResumenStock() {
  const { data, error } = await supabase
    .from('v_resumen_stock')
    .select('*');
  if (error) throw error;
  return data ?? [];
}

export async function getProductoPorCodigoBarras(codigo: string): Promise<Producto | null> {
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .eq('codigo_barras', codigo)
    .eq('activo', true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function crearProducto(
  producto: Omit<Producto, 'id' | 'stock' | 'created_at' | 'updated_at'>,
) {
  const { data, error } = await db
    .from('productos')
    .insert(producto)
    .select()
    .single();
  if (error) throw error;
  return data as Producto;
}

export async function actualizarProducto(
  id: string,
  cambios: Partial<Omit<Producto, 'id' | 'stock'>>,
) {
  const { data, error } = await db
    .from('productos')
    .update(cambios)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Producto;
}

export async function moverStock(
  productoId: string,
  zonaOrigen: ZonaAlmacen,
  zonaDestino: ZonaAlmacen,
  cantidad: number,
  usuarioId: string,
  observacion?: string,
) {
  // FIX #1: usar `db` (tipado relajado) para la RPC — evita error ts(2345) Lín. 112
  const { error } = await db.rpc('fn_mover_stock', {
    p_producto_id:  productoId,
    p_zona_origen:  zonaOrigen,
    p_zona_destino: zonaDestino,
    p_cantidad:     cantidad,
    p_usuario_id:   usuarioId,
    p_observacion:  observacion ?? null,
  });
  if (error) throw error;
}

// ════════════════════════════════════════════════════════════════════════════
// MESAS
// ════════════════════════════════════════════════════════════════════════════

export async function getMesas(): Promise<Mesa[]> {
  const { data, error } = await supabase
    .from('mesas')
    .select('*')
    .eq('activo', true)
    .order('numero');
  if (error) throw error;
  return data ?? [];
}

export async function getMesasConPedido() {
  const { data, error } = await supabase
    .from('v_mesas_con_pedido')
    .select('*')
    .order('numero');
  if (error) throw error;
  return data ?? [];
}

export async function actualizarEstadoMesa(id: string, estado: EstadoMesa) {
  const { error } = await db
    .from('mesas')
    .update({ estado })
    .eq('id', id);
  if (error) throw error;
}

// ════════════════════════════════════════════════════════════════════════════
// PEDIDOS
// ════════════════════════════════════════════════════════════════════════════

export async function getPedidoActivoMesa(mesaId: string): Promise<Pedido | null> {
  const { data, error } = await supabase
    .from('pedidos')
    .select(`
      *,
      cliente:clientes(*),
      usuario:usuarios(nombre),
      items:pedido_items(*, producto:productos(*))
    `)
    .eq('mesa_id', mesaId)
    .not('estado', 'in', '("entregado","cancelado")')
    .maybeSingle();
  if (error) throw error;
  return data as Pedido | null;
}

export async function crearPedido(mesaId: string, usuarioId: string, clienteId?: string) {
  const { data, error } = await db
    .from('pedidos')
    .insert({
      mesa_id:    mesaId,
      usuario_id: usuarioId,
      cliente_id: clienteId ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  await actualizarEstadoMesa(mesaId, 'ocupada');
  return data as Pedido;
}

export async function agregarItemPedido(
  pedidoId: string,
  productoId: string,
  cantidad: number,
  precioUnitario: number,
  notas?: string,
): Promise<PedidoItem> {
  const { data, error } = await db
    .from('pedido_items')
    .insert({
      pedido_id:       pedidoId,
      producto_id:     productoId,
      cantidad,
      precio_unitario: precioUnitario,
      notas:           notas ?? null,
      estado:          'abierto',
    })
    .select('*, producto:productos(*)')
    .single();
  if (error) throw error;

  await recalcularTotalPedido(pedidoId);
  return data as PedidoItem;
}

async function recalcularTotalPedido(pedidoId: string) {
  const { data } = await supabase
    .from('pedido_items')
    .select('subtotal')
    .eq('pedido_id', pedidoId);

  // FIX #2: castear el resultado para que TS reconozca `subtotal` — evita error ts(2339) Lín. 221
  const total = ((data ?? []) as Array<{ subtotal: number }>)
    .reduce((sum, i) => sum + (i.subtotal ?? 0), 0);
  await db.from('pedidos').update({ total }).eq('id', pedidoId);
}

// ════════════════════════════════════════════════════════════════════════════
// VENTAS
// ════════════════════════════════════════════════════════════════════════════

export async function getVentasHoy(): Promise<Venta[]> {
  const { data, error } = await supabase
    .from('v_ventas_hoy')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as Venta[]) ?? [];
}

export async function getVentasRecientes(limite = 10): Promise<Venta[]> {
  const { data, error } = await supabase
    .from('ventas')
    .select(`
      *,
      cliente:clientes(nombre),
      comprobante:comprobantes(numero, tipo)
    `)
    .eq('estado', 'completada')
    .order('created_at', { ascending: false })
    .limit(limite);
  if (error) throw error;
  return (data as Venta[]) ?? [];
}

export async function getVentasSemana() {
  const hoy = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Lima' }));
  const diaSemana = hoy.getDay();
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1));
  const lunesFecha = lunes.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('ventas')
    .select('total, fecha_local')
    .eq('estado', 'completada')
    .gte('fecha_local', lunesFecha)
    .order('fecha_local');
  if (error) throw error;
  return data ?? [];
}

export async function crearVenta(payload: CrearVentaPayload, usuarioId: string): Promise<Venta> {
  const subtotal = payload.items.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const igv      = subtotal * 0.18;
  const total    = subtotal + igv - (payload.descuento_monto ?? 0);
  const vuelto   = payload.monto_recibido != null ? payload.monto_recibido - total : null;

  // 1. Crear la venta
  const { data: venta, error: errVenta } = await db
    .from('ventas')
    .insert({
      cliente_id:       payload.cliente_id ?? null,
      usuario_id:       usuarioId,
      caja_id:          payload.caja_id ?? null,
      mesa_id:          payload.mesa_id ?? null,
      tipo_comprobante: payload.tipo_comprobante,
      metodo_pago:      payload.metodo_pago,
      subtotal,
      igv,
      total,
      descuento_monto:  payload.descuento_monto ?? 0,
      monto_recibido:   payload.monto_recibido ?? null,
      vuelto,
      notas:            payload.notas ?? null,
      estado:           'completada',
    })
    .select()
    .single();
  if (errVenta) throw errVenta;

  // 2. Insertar items (trigger descuenta stock)
  const items = payload.items.map(i => ({
    venta_id:        venta.id,
    producto_id:     i.id,
    cantidad:        i.cantidad,
    precio_unitario: i.precio,
  }));
  const { error: errItems } = await db.from('venta_items').insert(items);
  if (errItems) throw errItems;

  // 3. Comprobante (trigger genera el número)
  const { error: errComp } = await db.from('comprobantes').insert({
    venta_id:   venta.id,
    tipo:       payload.tipo_comprobante,
    usuario_id: usuarioId,
  });
  if (errComp) throw errComp;

  // 4. Si viene de mesa, cerrar pedido y liberar mesa
  if (payload.mesa_id) {
    await db
      .from('pedidos')
      .update({ estado: 'entregado' })
      .eq('mesa_id', payload.mesa_id)
      .not('estado', 'in', '("entregado","cancelado")');

    await actualizarEstadoMesa(payload.mesa_id, 'limpieza');
  }

  return venta as Venta;
}

export async function anularVenta(ventaId: string) {
  const { error } = await db
    .from('ventas')
    .update({ estado: 'anulada' })
    .eq('id', ventaId);
  if (error) throw error;

  await db
    .from('comprobantes')
    .update({ estado: 'anulado' })
    .eq('venta_id', ventaId);
}

// ════════════════════════════════════════════════════════════════════════════
// COMPROBANTES
// ════════════════════════════════════════════════════════════════════════════

export async function getComprobantes(limite = 100) {
  const { data, error } = await supabase
    .from('v_comprobantes_detalle')
    .select('*')
    .order('fecha_emision', { ascending: false })
    .limit(limite);
  if (error) throw error;
  return data ?? [];
}

// ════════════════════════════════════════════════════════════════════════════
// CLIENTES
// ════════════════════════════════════════════════════════════════════════════

export async function getClientes(): Promise<Cliente[]> {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('activo', true)
    .order('nombre');
  if (error) throw error;
  return data ?? [];
}

export async function crearCliente(
  cliente: Omit<Cliente, 'id' | 'created_at' | 'updated_at' | 'puntos_acumulados'>,
) {
  const { data, error } = await db
    .from('clientes')
    .insert({ ...cliente, puntos_acumulados: 0 })
    .select()
    .single();
  if (error) throw error;
  return data as Cliente;
}

export async function actualizarCliente(id: string, cambios: Partial<Omit<Cliente, 'id'>>) {
  const { data, error } = await db
    .from('clientes')
    .update(cambios)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Cliente;
}

export async function eliminarCliente(id: string) {
  const { error } = await db
    .from('clientes')
    .update({ activo: false })
    .eq('id', id);
  if (error) throw error;
}

// ════════════════════════════════════════════════════════════════════════════
// CAJAS
// ════════════════════════════════════════════════════════════════════════════

export async function getCajas(): Promise<Caja[]> {
  // FIX #3 (runtime PGRST201): especificar FK explícita para resolver ambigüedad
  // entre cajas→usuarios. Hint de Supabase: 'cajas!cajas_usuario_id_fkey'
  const { data, error } = await supabase
    .from('cajas')
    .select('*, usuario:usuarios!cajas_usuario_id_fkey(nombre, rol)')
    .order('nombre');
  if (error) throw error;
  return (data as Caja[]) ?? [];
}

export async function abrirCaja(cajaId: string, usuarioId: string, montoInicial: number) {
  // FIX #4: usar `db` (tipado relajado) para la RPC — evita error ts(2345) Lín. 417
  const { error } = await db.rpc('fn_abrir_caja', {
    p_caja_id:       cajaId,
    p_usuario_id:    usuarioId,
    p_monto_inicial: montoInicial,
  });
  if (error) throw error;
}

export async function cerrarCaja(cajaId: string, usuarioId: string): Promise<number> {
  // FIX #5: usar `db` (tipado relajado) para la RPC — evita error ts(2345) Lín. 426
  const { data, error } = await db.rpc('fn_cerrar_caja', {
    p_caja_id:    cajaId,
    p_usuario_id: usuarioId,
  });
  if (error) throw error;
  return data as number;
}

export async function getMovimientosCaja(cajaId: string) {
  const { data, error } = await supabase
    .from('movimientos_caja')
    .select('*, usuario:usuarios(nombre)')
    .eq('caja_id', cajaId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function registrarEgresoCaja(
  cajaId: string,
  concepto: string,
  monto: number,
  usuarioId: string,
  observaciones?: string,
) {
  const { error: errMov } = await db.from('movimientos_caja').insert({
    caja_id:      cajaId,
    tipo:         'egreso',
    concepto,
    monto,
    usuario_id:   usuarioId,
    observaciones: observaciones ?? null,
  });
  if (errMov) throw errMov;

  const { data: cajaData, error: errRead } = await supabase
    .from('cajas')
    .select('monto_actual')
    .eq('id', cajaId)
    .single();
  if (errRead) throw errRead;

  const nuevoSaldo = ((cajaData as Caja)?.monto_actual ?? 0) - monto;
  const { error: errUpdate } = await db
    .from('cajas')
    .update({ monto_actual: nuevoSaldo })
    .eq('id', cajaId);
  if (errUpdate) throw errUpdate;
}

export async function crearCaja(nombre: string, usuarioId: string | null, zona?: string) {
  const { data, error } = await db
    .from('cajas')
    .insert({ nombre, usuario_id: usuarioId, zona: zona ?? null })
    .select()
    .single();
  if (error) throw error;
  return data as Caja;
}

// ════════════════════════════════════════════════════════════════════════════
// COMPRAS
// ════════════════════════════════════════════════════════════════════════════

export async function getCompras(): Promise<Compra[]> {
  const { data, error } = await supabase
    .from('compras')
    .select('*, usuario:usuarios(nombre), items:compra_items(*, producto:productos(nombre))')
    .order('fecha_emision', { ascending: false });
  if (error) throw error;
  return (data as Compra[]) ?? [];
}

export async function crearCompra(
  compra: Omit<Compra, 'id' | 'created_at' | 'updated_at' | 'usuario' | 'items'>,
  items: Array<{
    producto_id?:    string;
    descripcion:     string;
    cantidad:        number;
    precio_unitario: number;
    zona_destino:    ZonaAlmacen;
  }>,
) {
  const { data, error } = await db
    .from('compras')
    .insert(compra)
    .select()
    .single();
  if (error) throw error;

  if (items.length > 0) {
    const { error: errItems } = await db
      .from('compra_items')
      .insert(items.map(i => ({ ...i, compra_id: data.id })));
    if (errItems) throw errItems;
  }

  return data as Compra;
}

// ════════════════════════════════════════════════════════════════════════════
// PRODUCCIÓN COCINA
// ════════════════════════════════════════════════════════════════════════════

export async function getProduccionHoy(): Promise<ProduccionCocina[]> {
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  const { data, error } = await supabase
    .from('produccion_cocina')
    .select('*, producto:productos(nombre, categoria), usuario:usuarios(nombre)')
    .eq('fecha', hoy)
    .order('hora', { ascending: false });
  if (error) throw error;
  return (data as ProduccionCocina[]) ?? [];
}

export async function registrarProduccion(
  productoId: string,
  tipo: 'produccion' | 'porcionado',
  cantidad: number,
  unidad: string,
  usuarioId: string,
  notas?: string,
) {
  const { data, error } = await db
    .from('produccion_cocina')
    .insert({
      producto_id: productoId,
      tipo,
      cantidad,
      unidad,
      usuario_id: usuarioId,
      notas:      notas ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as ProduccionCocina;
}

// ════════════════════════════════════════════════════════════════════════════
// USUARIOS
// ════════════════════════════════════════════════════════════════════════════

export async function getUsuarios(): Promise<Usuario[]> {
  // FIX #6 (runtime PGRST201): especificar FK explícita para resolver ambigüedad
  // entre usuarios→cajas. Hint de Supabase: 'cajas!fk_usuarios_caja'
  const { data, error } = await supabase
    .from('usuarios')
    .select('*, caja:cajas!fk_usuarios_caja(nombre)')
    .order('nombre');
  if (error) throw error;
  return (data as Usuario[]) ?? [];
}

// ════════════════════════════════════════════════════════════════════════════
// NOTIFICACIONES
// ════════════════════════════════════════════════════════════════════════════

export async function getNotificacionesSinLeer(usuarioId: string): Promise<Notificacion[]> {
  const { data, error } = await supabase
    .from('notificaciones')
    .select('*')
    .eq('leida', false)
    .or(`usuario_id.eq.${usuarioId},usuario_id.is.null`)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return data ?? [];
}

export async function marcarNotificacionLeida(id: string) {
  await db.from('notificaciones').update({ leida: true }).eq('id', id);
}

// ════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════════════════════════════════════════

export interface MetricasDashboard {
  ventasHoy:         number;
  transacciones:     number;
  productosVendidos: number;
  ticketPromedio:    number;
  insumosConAlerta:  number;
}

export async function getMetricasDashboard(): Promise<MetricasDashboard> {
  const [ventasRes, insumosRes] = await Promise.all([
    supabase.from('v_ventas_hoy').select('total, id'),
    supabase.from('v_resumen_stock').select('alerta_cocina').eq('alerta_cocina', true),
  ]);

  // FIX #7: castear el resultado para que TS reconozca `total` — evita error ts(2339) Lín. 617
  const ventas      = (ventasRes.data ?? []) as Array<{ total: number; id: string }>;
  const totalVentas = ventas.reduce((s, v) => s + (v.total ?? 0), 0);

  return {
    ventasHoy:         totalVentas,
    transacciones:     ventas.length,
    productosVendidos: 0,
    ticketPromedio:    ventas.length > 0 ? totalVentas / ventas.length : 0,
    insumosConAlerta:  (insumosRes.data ?? []).length,
  };
}