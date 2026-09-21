import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null)
  const [role, setRole] = useState('guest')
  const [loading, setLoading] = useState(true)

  const checkUserStatus = async (userSession) => {
    if (!userSession) {
      setRole('guest')
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('perfis')
        .select('status')
        .eq('id', userSession.user.id)
        .single()
        
      if (error) {
        // Se a tabela não tiver registro ainda (ex: acabou de criar conta antes do trigger), 
        // ou erro de rede, assume pendente pra não dar acesso direto.
        setRole('pendente')
      } else {
        if (data.status === 'aprovado' || data.status === 'admin') {
          setRole('admin') // Para o frontend atual, aprovado = admin
        } else {
          setRole('pendente')
        }
      }
    } catch (err) {
      setRole('pendente')
    }
    
    setLoading(false)
  }

  useEffect(() => {
    let isMounted = true

    // Fallback timeout to ensure app loading never hangs indefinitely if network/Supabase is unreachable
    const timeoutTimer = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('Supabase auth response timed out. Falling back to guest mode.')
        setRole('guest')
        setLoading(false)
      }
    }, 3000)

    supabase.auth.getSession()
      .then(({ data }) => {
        if (!isMounted) return
        const currentSession = data?.session || null
        setSession(currentSession)
        checkUserStatus(currentSession)
      })
      .catch(err => {
        console.error('Erro ao verificar sessão no Supabase:', err)
        if (isMounted) {
          setRole('guest')
          setLoading(false)
        }
      })
      .finally(() => {
        clearTimeout(timeoutTimer)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!isMounted) return
      setSession(currentSession)
      checkUserStatus(currentSession)
    })

    return () => {
      isMounted = false
      clearTimeout(timeoutTimer)
      subscription?.unsubscribe()
    }
  }, [])

  const loginAsGuest = () => {
    setRole('guest')
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setRole('guest')
    setSession(null)
  }

  const value = {
    session,
    role,
    loginAsGuest,
    signOut,
    loading
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}
