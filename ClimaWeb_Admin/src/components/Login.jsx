import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Cloud, Hourglass, Eye, X } from 'lucide-react'

export default function Login({ onClose }) {
  const [loading, setLoading] = useState(false)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  
  const { loginAsGuest, role } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Se não for modal e tiver role válida, vai pro dashboard
    if (!onClose && role && role !== 'guest' && role !== 'pendente') {
      navigate('/dashboard')
    }
  }, [role, navigate, onClose])

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    
    if (isRegistering) {
      if (!username || !identifier.includes('@')) {
        setErrorMsg('Para cadastro, informe um e-mail válido no campo E-mail, e preencha o Nome de Usuário.')
        setLoading(false)
        return
      }

      const { data, error } = await supabase.auth.signUp({ 
        email: identifier.trim(), 
        password,
        options: {
          data: {
            username: username.trim(),
            full_name: fullName.trim()
          }
        }
      })
      if (error) {
        if (error.message.includes('Database error saving new user')) {
          setErrorMsg('O Nome de Usuário escolhido já está em uso ou ocorreu um erro no servidor.')
        } else {
          setErrorMsg(error.message)
        }
      }
      else if (data && data.user === null) {
        setErrorMsg('Este e-mail já está cadastrado ou houve um bloqueio de segurança.')
      } else {
        alert('Enviamos um link de confirmação para o seu e-mail. Confirme para acessar.')
        setIsRegistering(false)
        setPassword('')
      }
    } else {
      let loginEmail = identifier.trim()
      
      if (!loginEmail.includes('@')) {
        // Busca e-mail por username via RPC
        const { data: userEmail, error: rpcError } = await supabase.rpc('get_email_by_username', { p_username: loginEmail })
        if (rpcError || !userEmail) {
          setErrorMsg('Nome de usuário não encontrado.')
          setLoading(false)
          return
        }
        loginEmail = userEmail
      }

      const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password })
      if (error) {
        if (error.message.includes('Email not confirmed')) {
          setErrorMsg('E-mail não verificado. Verifique a sua caixa de entrada para ativar a conta.')
        } else {
          setErrorMsg(error.message)
        }
      } else {
        if (onClose) onClose()
        else navigate('/dashboard')
      }
    }
    
    setLoading(false)
  }

  const handleGuest = () => {
    loginAsGuest()
    if (onClose) onClose()
    else navigate('/dashboard')
  }

  return (
    <div style={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      backgroundColor: 'rgba(15, 23, 42, 0.4)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      color: 'var(--text-primary)', 
      fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' 
    }}>
      <div className="glass-card" style={{ 
        position: 'relative',
        display: 'flex', 
        flexDirection: 'column', 
        padding: '40px', 
        width: '100%',
        maxWidth: '400px', 
        alignItems: 'center',
        background: 'rgba(30, 36, 46, 0.7)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
      }}>
        {onClose && (
          <button 
            onClick={onClose}
            style={{ 
              position: 'absolute', 
              top: '16px', 
              right: '16px', 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--text-secondary)', 
              cursor: 'pointer' 
            }}
          >
            <X size={24} />
          </button>
        )}

        <h2 style={{ marginBottom: '8px', fontSize: '1.8rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
          <Cloud size={28} /> ClimaWeb
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '0.9rem' }}>
          Sistema de Gestão de Massas de Ar
        </p>

        {role === 'pendente' ? (
          <div style={{ textAlign: 'center', width: '100%' }}>
            <h3 style={{ color: '#f59e0b', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Hourglass size={24} /> Conta Pendente
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.9rem' }}>
              Sua solicitação de cadastro foi enviada ao administrador e está aguardando aprovação. Você receberá acesso assim que for aprovado.
            </p>
            <button 
              onClick={() => {
                supabase.auth.signOut()
                loginAsGuest()
                if (onClose) onClose()
                else navigate('/dashboard')
              }}
              className="action-button secondary"
              style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><Eye size={20} /> Voltar como Visitante</span>
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
              {errorMsg && <div style={{ color: '#ef4444', fontSize: '0.85rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '6px' }}>{errorMsg}</div>}
              
              {isRegistering && (
                <>
                  <input 
                    type="text" 
                    placeholder="Nome Completo (Opcional)" 
                    value={fullName} 
                    onChange={(e) => setFullName(e.target.value)} 
                    style={{ 
                      padding: '14px', 
                      borderRadius: '8px', 
                      border: '1px solid rgba(255, 255, 255, 0.1)', 
                      background: 'rgba(15, 23, 42, 0.4)', 
                      color: 'var(--text-primary)',
                      outline: 'none',
                      fontFamily: 'inherit'
                    }} 
                  />
                  <input 
                    type="text" 
                    placeholder="Nome de Usuário (@exemplo)" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)} 
                    required
                    style={{ 
                      padding: '14px', 
                      borderRadius: '8px', 
                      border: '1px solid rgba(255, 255, 255, 0.1)', 
                      background: 'rgba(15, 23, 42, 0.4)', 
                      color: 'var(--text-primary)',
                      outline: 'none',
                      fontFamily: 'inherit'
                    }} 
                  />
                </>
              )}

              <input 
                type={isRegistering ? "email" : "text"} 
                placeholder={isRegistering ? "Seu E-mail" : "E-mail ou Nome de Usuário"} 
                value={identifier} 
                onChange={(e) => setIdentifier(e.target.value)} 
                required
                style={{ 
                  padding: '14px', 
                  borderRadius: '8px', 
                  border: '1px solid rgba(255, 255, 255, 0.1)', 
                  background: 'rgba(15, 23, 42, 0.4)', 
                  color: 'var(--text-primary)',
                  outline: 'none',
                  fontFamily: 'inherit'
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
                  fontFamily: 'inherit'
                }} 
              />
              
              <button 
                type="submit"
                disabled={loading} 
                className="btn-primary"
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

            {(!role || role === 'guest') && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0', width: '100%' }}>
                  <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
                  <span style={{ padding: '0 10px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>OU</span>
                  <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
                </div>

                <button 
                  onClick={handleGuest}
                  className="btn-secondary"
                  style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><Eye size={20} /> Entrar como Visitante</span>
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
