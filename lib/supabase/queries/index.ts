// lib/supabase/queries/index.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any;

export interface TopProductoHoy {
  producto_id: string;
  nombre:      string;
  qty:         number;
}

// Tipo auxiliar para el resultado del JOIN de venta_items
interface VentaItemConRelaciones {
  cantidad:   number;
  producto:   { id: string; nombre: string } | null;
  venta:      { fecha_local: string; estado: string } | null;
}

import { supabase as _supabase } from '../client';
import type {
  Producto, Mesa, Cliente, Caja, Venta,
  Compra, ProduccionCocina,
  Usuario, Pedido, PedidoItem, Notificacion,
  CrearVentaPayload, EstadoMesa, ZonaAlmacen,
  RolUsuario,
} from '../types';

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

export async function getTopProductosHoy(): Promise<TopProductoHoy[]> {
  const { data: ventasHoy, error: errVentas } = await db
    .from('v_ventas_hoy')
    .select('id');

  if (errVentas) throw errVentas;
  const ids = ((ventasHoy ?? []) as Array<{ id: string }>).map(v => v.id);
  if (ids.length === 0) return [];

  const { data, error } = await db
    .from('venta_items')
    .select('cantidad, producto:productos(id, nombre)')
    .in('venta_id', ids);

  if (error) throw error;

  const map = new Map<string, TopProductoHoy>();
  for (const item of (data ?? []) as VentaItemConRelaciones[]) {
    if (!item.producto) continue;
    const prev = map.get(item.producto.id) ?? {
      producto_id: item.producto.id,
      nombre:      item.producto.nombre,
      qty:         0,
    };
    map.set(item.producto.id, { ...prev, qty: prev.qty + (item.cantidad ?? 0) });
  }

  return [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
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

export async function crearMesa(payload: {
  numero: string; nombre: string; zona: string; capacidad: number; estado?: EstadoMesa;
}) {
  const { data, error } = await db
    .from('mesas')
    .insert({ ...payload, estado: payload.estado ?? 'disponible', activo: true })
    .select()
    .single();
  if (error) throw error;
  return data;
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

  return data as PedidoItem;
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
  const { data: ventas, error } = await supabase
    .from('ventas')
    .select('*, cliente:clientes(nombre)')
    .eq('estado', 'completada')
    .order('created_at', { ascending: false })
    .limit(limite);
  if (error) throw error;
  if (!ventas || ventas.length === 0) return [];

  const ids = (ventas as Venta[]).map((v) => v.id);
  const { data: comprobantes } = await supabase
    .from('comprobantes')
    .select('venta_id, numero, tipo, serie, correlativo')
    .in('venta_id', ids);

  const compMap = new Map(
    ((comprobantes ?? []) as Array<{
      venta_id: string;
      numero:      string | null;
      tipo:        string | null;
      serie:       string | null;
      correlativo: number | null;
    }>).map((c) => [c.venta_id, c])
  );

  return (ventas as Venta[]).map((v) => ({
    ...v,
    comprobante: compMap.get(v.id) ?? null,
  })) as Venta[];
}

export async function getVentasSemana() {
  const iso = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());
  const [year, month, day] = iso.split('-').map(Number);
  const hoy = new Date(Date.UTC(year, month - 1, day));
  const diaSemana = hoy.getUTCDay();
  const lunes = new Date(hoy);
  lunes.setUTCDate(hoy.getUTCDate() - (diaSemana === 0 ? 6 : diaSemana - 1));
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
  // ── Cálculo correcto para Perú ────────────────────────────────────────────
  // Los precios de los productos YA incluyen IGV (precio de venta al público).
  // total    = suma(precio × cantidad) − descuento  → lo que paga el cliente
  // subtotal = total / 1.18                          → base imponible contable
  // igv      = total − subtotal                      → IGV contenido
  const totalBruto = payload.items.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const total      = parseFloat(Math.max(0, totalBruto - (payload.descuento_monto ?? 0)).toFixed(2));
  const subtotal   = parseFloat((total / 1.18).toFixed(2));
  const igv        = parseFloat((total - subtotal).toFixed(2));
  const vuelto     = payload.monto_recibido != null ? payload.monto_recibido - total : null;

  const fechaLima = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });

  // 1. Insertar cabecera de venta
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
      fecha_local:      fechaLima,
      hora_local: new Date().toLocaleTimeString('en-GB', {
        timeZone: 'America/Lima',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    })
    .select()
    .single();
  if (errVenta) throw errVenta;

  // 2. Insertar items → el trigger trg_descontar_stock_venta descuenta stock automáticamente
  const items = payload.items.map(i => ({
    venta_id:        venta.id,
    producto_id:     i.id,
    cantidad:        i.cantidad,
    precio_unitario: i.precio,
  }));
  const { error: errItems } = await db.from('venta_items').insert(items);
  if (errItems) throw errItems;

  // 3. Insertar comprobante → el trigger fn_generar_numero_comprobante genera el número
  const { error: errComp } = await db.from('comprobantes').insert({
    venta_id:   venta.id,
    tipo:       payload.tipo_comprobante,
    usuario_id: usuarioId,
  });
  if (errComp) throw errComp;

  // 4. Si viene de mesa, cerrar pedido y poner mesa en limpieza
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
  const { data, error } = await supabase
    .from('cajas')
    .select(`
      *,
      usuario:usuario_id(nombre, rol)
    `)
    .order('nombre');
  if (error) throw error;
  return (data as Caja[]) ?? [];
}

export async function abrirCaja(cajaId: string, usuarioId: string, montoInicial: number) {
  const { error } = await db.rpc('fn_abrir_caja', {
    p_caja_id:       cajaId,
    p_usuario_id:    usuarioId,
    p_monto_inicial: montoInicial,
  });
  if (error) throw error;
}

export async function cerrarCaja(cajaId: string, usuarioId: string): Promise<number> {
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

export async function eliminarCompra(id: string) {
  const { error } = await db.from('compras').delete().eq('id', id);
  if (error) throw error;
}

export async function actualizarCompra(
  id: string,
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
    .update(compra)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;

  const { error: errDel } = await db
    .from('compra_items')
    .delete()
    .eq('compra_id', id);
  if (errDel) throw errDel;

  if (items.length > 0) {
    const { error: errItems } = await db
      .from('compra_items')
      .insert(items.map(i => ({ ...i, compra_id: id })));
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

  if (tipo === 'porcionado') {
    const { data: prod, error: errRead } = await db
      .from('productos')
      .select('stock_tienda, stock_cocina, stock_general')
      .eq('id', productoId)
      .single();
    if (errRead) throw errRead;

    const stockTiendaAntes  = prod?.stock_tienda  ?? 0;
    const stockCocinaAntes  = prod?.stock_cocina  ?? 0;
    const stockGeneralAntes = prod?.stock_general ?? 0;
    const nuevoStockTienda  = Math.max(0, stockTiendaAntes - cantidad);

    const { error: errUpdate } = await db
      .from('productos')
      .update({ stock_tienda: nuevoStockTienda })
      .eq('id', productoId);
    if (errUpdate) throw errUpdate;

    await db.from('movimientos_almacen').insert({
      producto_id:            productoId,
      tipo:                   'salida_cocina',
      zona_origen:            'tienda',
      zona_destino:           null,
      cantidad,
      stock_tienda_antes:     stockTiendaAntes,
      stock_cocina_antes:     stockCocinaAntes,
      stock_general_antes:    stockGeneralAntes,
      stock_tienda_despues:   nuevoStockTienda,
      stock_cocina_despues:   stockCocinaAntes,
      stock_general_despues:  stockGeneralAntes,
      referencia_id:          data.id,
      usuario_id:             usuarioId,
      observacion:            `Porcionado: ${notas ?? `${cantidad} ${unidad}`}`,
    });
  }

  return data as ProduccionCocina;
}

export async function ajustarStockInsumo(
  productoId: string,
  cantidadDelta: number,
  usuarioId: string,
  observacion?: string,
) {
  const { data: prod, error: errRead } = await db
    .from('productos')
    .select('stock_cocina')
    .eq('id', productoId)
    .single();
  if (errRead) throw errRead;

  const stockAntes = prod?.stock_cocina ?? 0;
  const nuevoStock = Math.max(0, stockAntes + cantidadDelta);

  const { error: errUpdate } = await db
    .from('productos')
    .update({ stock_cocina: nuevoStock })
    .eq('id', productoId);
  if (errUpdate) throw errUpdate;

  const tipo = cantidadDelta < 0 ? 'salida_cocina' : 'ajuste';
  await db.from('movimientos_almacen').insert({
    producto_id:          productoId,
    tipo,
    cantidad:             Math.abs(cantidadDelta),
    stock_cocina_antes:   stockAntes,
    stock_cocina_despues: nuevoStock,
    usuario_id:           usuarioId,
    observacion:          observacion ?? null,
  });

  return nuevoStock;
}

// ════════════════════════════════════════════════════════════════════════════
// USUARIOS
// ════════════════════════════════════════════════════════════════════════════

export async function getUsuarios(): Promise<Usuario[]> {
  const { data, error } = await supabase
    .from('usuarios')
    .select(`
      *,
      caja:cajas!fk_usuarios_caja(id, nombre, estado)
    `)
    .order('nombre');
  if (error) throw error;
  return (data as Usuario[]) ?? [];
}

export async function crearUsuario(payload: {
  nombre: string; email: string; rol: RolUsuario;
  dni?: string | null; caja_id?: string | null;
}) {
  const { data, error } = await db
    .from('usuarios')
    .insert({ ...payload, activo: true })
    .select()
    .single();
  if (error) throw error;
  return data as Usuario;
}

export async function actualizarUsuario(id: string, cambios: Partial<Omit<Usuario, 'id'>>) {
  const { data, error } = await db
    .from('usuarios')
    .update(cambios)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Usuario;
}

export async function desactivarUsuario(id: string) {
  const { error } = await db
    .from('usuarios')
    .update({ activo: false })
    .eq('id', id);
  if (error) throw error;
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
    db.from('v_ventas_hoy').select('id, total'),
    db.from('v_resumen_stock').select('alerta_cocina').eq('alerta_cocina', true),
  ]);

  if (ventasRes.error) throw ventasRes.error;
  if (insumosRes.error) throw insumosRes.error;

  const ventas      = (ventasRes.data ?? []) as Array<{ id: string; total: number }>;
  const totalVentas = ventas.reduce((s, v) => s + (v.total ?? 0), 0);
  const ids         = ventas.map(v => v.id);

  let productosVendidos = 0;
  if (ids.length > 0) {
    const { data: items, error: errItems } = await db
      .from('venta_items')
      .select('cantidad')
      .in('venta_id', ids);
    if (errItems) throw errItems;
    productosVendidos = ((items ?? []) as Array<{ cantidad: number }>)
      .reduce((s, i) => s + (i.cantidad ?? 0), 0);
  }

  return {
    ventasHoy:         totalVentas,
    transacciones:     ventas.length,
    productosVendidos,
    ticketPromedio:    ventas.length > 0 ? totalVentas / ventas.length : 0,
    insumosConAlerta:  (insumosRes.data ?? []).length,
  };
}