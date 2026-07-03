// utils/ventasUtils.ts

export type TipoClienteLocal = 'persona' | 'empresa';

export interface FormCliente {
  tipo:      TipoClienteLocal;
  nombre:    string;
  documento: string;
  telefono:  string;
  email:     string;
  direccion: string;
}

export const FORM_CLI_VACIO: FormCliente = {
  tipo:      'persona',
  nombre:    '',
  documento: '',
  telefono:  '',
  email:     '',
  direccion: '',
};

export function fmtSoles(n: number) {
  return `S/ ${n.toFixed(2)}`;
}