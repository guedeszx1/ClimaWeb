import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Login from './components/Login'
import Dashboard from './components/Dashboard'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Tenta buscar a sessão existente ao carregar a página
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Fica de olho quando o usuário faz login/logout para atualizar a tela
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe()
      }
    }
  }, [])

  if (loading) {
    return <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212', color: '#fff' }}>Carregando Painel Administrativo...</div>
  }

  return (
    <div>
      {/* Se não tem sessão ativa, mostra o Login. Se tem, mostra o Dashboard. */}
      {!session ? <Login /> : <Dashboard key={session.user.id} session={session} />}
    </div>
  )
}

export default App
