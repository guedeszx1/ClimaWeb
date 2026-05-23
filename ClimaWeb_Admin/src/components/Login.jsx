import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert("Erro: " + error.message)
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#121212', color: '#fff', fontFamily: 'sans-serif' }}>
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '40px', background: '#1e1e1e', borderRadius: '10px', width: '300px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>🔐 ClimaWeb Admin</h2>
        <input 
          type="email" 
          placeholder="Email do Administrador" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          style={{ padding: '12px', borderRadius: '5px', border: 'none', background: '#333', color: '#fff' }} 
        />
        <input 
          type="password" 
          placeholder="Senha" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          style={{ padding: '12px', borderRadius: '5px', border: 'none', background: '#333', color: '#fff' }} 
        />
        <button disabled={loading} style={{ padding: '12px', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' }}>
          {loading ? 'Validando...' : 'Entrar no Sistema'}
        </button>
      </form>
    </div>
  )
}
