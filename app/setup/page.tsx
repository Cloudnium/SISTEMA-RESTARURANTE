// app/setup/page.tsx
'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase/client';

// ⚠️ RUTA TEMPORAL - BORRAR DESPUÉS DE CREAR EL PRIMER ADMIN

export default function SetupPage() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [nombre,   setNombre]   = useState('');
  const [msg,      setMsg]      = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nombre: nombre.trim(),
            rol:    'admin',
          }
        }
      });

      if (error) throw error;
      if (!data.user) throw new Error('No se creó el usuario.');

      // Intentar upsert por si el trigger no lo hizo o lo hizo incompleto
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;
      const { error: dbError } = await db
        .from('usuarios')
        .upsert({
          id:     data.user.id,
          email:  email.trim().toLowerCase(),
          nombre: nombre.trim(),
          rol:    'admin',
          activo: true,
        });

      if (dbError) {
        // No es fatal si el trigger ya lo insertó
        console.warn('Upsert warning:', dbError.message);
      }

      setMsg(`✅ Admin "${nombre}" creado. Ya puedes ir a /login. ¡Borra este archivo después!`);
    } catch (err: unknown) {
      setMsg(`❌ ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 24, fontFamily: 'sans-serif' }}>
      <h1 style={{ marginBottom: 4 }}>⚙️ Setup inicial</h1>
      <p style={{ color: '#888', fontSize: 13, marginBottom: 24 }}>
        Crear primer usuario administrador · Ruta temporal
      </p>

      <form onSubmit={handleSetup} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          placeholder="Nombre completo"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          required
          style={inp}
        />
        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={inp}
        />
        <input
          type="password"
          placeholder="Contraseña (mín. 6 caracteres)"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          style={inp}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '10px', background: '#1a2e1a', color: '#fff',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold',
          }}
        >
          {loading ? 'Creando...' : 'Crear admin'}
        </button>
      </form>

      {msg && (
        <p style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 8, fontSize: 13 }}>
          {msg}
        </p>
      )}
    </div>
  );
}

const inp: React.CSSProperties = {
  padding: '10px 12px', borderRadius: 8,
  border: '1.5px solid #ddd', fontSize: 14, outline: 'none',
};