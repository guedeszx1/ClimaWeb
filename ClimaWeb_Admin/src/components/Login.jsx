import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  
  const { loginAsGuest, role } = useAuth()
  const navigate = useNavigate()

  // Se tiver role válida (que não seja guest nem pendente), vai pro dashboard
  if (role && role !== 'guest' && role !== 'pendente') {
    navigate('/dashboard')
  }

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    
    if (isRegistering) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setErrorMsg(error.message)
      else alert('Verifique seu e-mail para confirmar o cadastro.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setErrorMsg(error.message)
      else navigate('/dashboard')
    }
    
    setLoading(false)
  }

  const handleGuest = () => {
    loginAsGuest()
    navigate('/dashboard')
  }

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh', 
      backgroundColor: 'var(--bg-primary)', 
      backgroundImage: 'radial-gradient(circle at top right, rgba(30, 41, 59, 1), rgba(15, 23, 42, 1))',
      color: 'var(--text-primary)', 
      fontFamily: 'Outfit, sans-serif' 
    }}>
      <div className="glass-card" style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        padding: '40px', 
        width: '100%',
        maxWidth: '400px', 
        alignItems: 'center'
      }}>
        <h2 style={{ marginBottom: '8px', fontSize: '1.8rem', fontWeight: '700' }}>☁️ ClimaWeb</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '0.9rem' }}>
          Sistema de Gestão de Massas de Ar
        </p>

        {role === 'pendente' ? (
          <div style={{ textAlign: 'center', width: '100%' }}>
            <h3 style={{ color: '#f59e0b', marginBottom: '16px' }}>⏳ Conta Pendente</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.9rem' }}>
              Sua solicitação de cadastro foi enviada ao administrador e está aguardando aprovação. Você receberá acesso assim que for aprovado.
            </p>
            <button 
              onClick={() => {
                supabase.auth.signOut()
                loginAsGuest()
                navigate('/dashboard')
              }}
              className="action-button secondary"
              style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
            >
              👀 Voltar como Visitante
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
              {errorMsg && <div style={{ color: '#ef4444', fontSize: '0.85rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '6px' }}>{errorMsg}</div>}
              
              <input 
                type="email" 
                placeholder="Seu E-mail" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required
                style={{ 
                  padding: '14px', 
                  borderRadius: '8px', 
                  border: '1px solid rgba(255, 255, 255, 0.1)', 
                  background: 'rgba(15, 23, 42, 0.4)', 
                  color: 'var(--text-primary)',
                  outline: 'none',
                  fontFamily: 'Inter'
                }} 
              />
              <input 
                type="password" 
                placeholder="Sua Senha" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required
                style={{ 
                  padding: '14px', 
                  borderRadius: '8px', 
                  border: '1px solid rgba(255, 255, 255, 0.1)', 
                  background: 'rgba(15, 23, 42, 0.4)', 
                  color: 'var(--text-primary)',
                  outline: 'none',
                  fontFamily: 'Inter'
                }} 
              />
              
              <button 
                type="submit"
                disabled={loading} 
                className="action-button primary"
                style={{ padding: '14px', marginTop: '8px', fontSize: '1rem', width: '100%' }}
              >
                {loading ? 'Aguarde...' : (isRegistering ? 'Criar Conta' : 'Entrar no Sistema')}
              </button>
            </form>

            <div style={{ marginTop: '16px', width: '100%', textAlign: 'center' }}>
              <button 
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}
              >
                {isRegistering ? 'Já tenho uma conta. Fazer login.' : 'Não tenho conta. Cadastrar-se.'}
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0', width: '100%' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
              <span style={{ padding: '0 10px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>OU</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
            </div>

            <button 
              onClick={handleGuest}
              className="action-button secondary"
              style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
            >
              👀 Entrar como Visitante
            </button>
          </>
        )}
      </div>
    </div>
  )
}
