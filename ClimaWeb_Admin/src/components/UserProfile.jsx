import React, { useState, useEffect } from 'react'
import { X, User, LogOut, Map, FileText, Calendar, Edit2, Check, Bookmark, ArrowRight, Loader } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabaseClient'

export default function UserProfile({ onClose, onLoadAnalysis }) {
  const { session, signOut } = useAuth()
  
  // Edit State
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  // Feedback State
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Analyses State
  const [savedAnalyses, setSavedAnalyses] = useState([])
  const [loadingAnalyses, setLoadingAnalyses] = useState(true)

  if (!session?.user) return null

  // Extract metadata
  const metadata = session.user.user_metadata || {}
  const fullName = metadata.full_name || ''
  const username = metadata.username || 'Visitante'
  const email = session.user.email || ''
  const createdAt = new Date(session.user.created_at).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric'
  })

  // Generate initials
  const getInitials = (nameStr) => {
    const targetName = nameStr || fullName || username
    if (targetName && targetName !== 'Visitante') {
      const parts = targetName.trim().split(' ')
      if (parts.length > 1) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      return targetName.substring(0, 2).toUpperCase()
    }
    return 'US'
  }

  const handleSignOut = async () => {
    await signOut()
    if (onClose) onClose()
  }

  useEffect(() => {
    if (session?.user?.id) {
      const fetchAnalyses = async () => {
        const { data, error } = await supabase
          .from('user_saved_analyses')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
        
        if (!error && data) {
          setSavedAnalyses(data)
        }
        setLoadingAnalyses(false)
      }
      fetchAnalyses()
    }
  }, [session])

  const toggleEditMode = () => {
    setErrorMsg('')
    setSuccessMsg('')
    if (!isEditing) {
      setEditName(fullName)
      setNewPassword('')
      setConfirmPassword('')
    }
    setIsEditing(!isEditing)
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    if (newPassword && newPassword !== confirmPassword) {
      setErrorMsg('As senhas não coincidem.')
      return
    }

    setLoading(true)

    try {
      const updates = {}
      
      // Update metadata (name) if changed
      if (editName.trim() !== fullName) {
        updates.data = { full_name: editName.trim() }
      }
      
      // Update password if provided
      if (newPassword) {
        updates.password = newPassword
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase.auth.updateUser(updates)
        if (error) throw error
        setSuccessMsg('Perfil atualizado com sucesso!')
        setTimeout(() => setIsEditing(false), 2000)
      } else {
        setIsEditing(false)
      }
    } catch (err) {
      console.error(err)
      setErrorMsg(err.message || 'Erro ao atualizar o perfil.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 10000,
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      backgroundColor: 'rgba(15, 23, 42, 0.5)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      color: 'var(--text-primary)', 
      fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
      padding: '20px'
    }}>
      <div className="glass-card" style={{ 
        position: 'relative',
        display: 'flex', 
        flexDirection: 'column', 
        padding: '30px', 
        width: '100%',
        maxWidth: '450px', 
        maxHeight: '90vh',
        overflowY: 'auto',
        background: 'rgba(30, 36, 46, 0.85)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        borderRadius: '16px'
      }}>
        {/* Botões do Topo (Fechar e Editar) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'absolute', top: '20px', left: '20px', right: '20px', zIndex: 10 }}>
          <button 
            onClick={toggleEditMode}
            title={isEditing ? "Cancelar Edição" : "Editar Perfil"}
            style={{ 
              background: 'rgba(255, 255, 255, 0.05)', 
              border: '1px solid rgba(255, 255, 255, 0.1)', 
              color: isEditing ? '#f59e0b' : 'var(--text-secondary)', 
              cursor: 'pointer',
              borderRadius: '8px',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = isEditing ? '#f59e0b' : 'var(--text-secondary)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            }}
          >
            {isEditing ? <X size={18} /> : <Edit2 size={18} />}
          </button>

          <button 
            onClick={onClose}
            title="Fechar"
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--text-secondary)', 
              cursor: 'pointer',
              transition: 'color 0.2s',
              padding: '6px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            <X size={24} />
          </button>
        </div>

        {/* Cabeçalho do Perfil / Edição */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px', marginTop: '16px' }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            borderRadius: '50%', 
            background: 'linear-gradient(135deg, var(--primary), #8b5cf6)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: '2rem',
            fontWeight: '700',
            color: 'white',
            marginBottom: '16px',
            boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)'
          }}>
            {getInitials(isEditing ? editName : fullName)}
          </div>

          {isEditing ? (
            <form onSubmit={handleSaveProfile} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '1.1rem', textAlign: 'center', marginBottom: '8px', fontWeight: '600' }}>Editar Conta</h3>
              
              {errorMsg && <div style={{ color: '#ef4444', fontSize: '0.85rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '6px', textAlign: 'center' }}>{errorMsg}</div>}
              {successMsg && <div style={{ color: '#10b981', fontSize: '0.85rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '6px', textAlign: 'center' }}>{successMsg}</div>}

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '4px' }}>Nome de Exibição</label>
                <input 
                  type="text" 
                  value={editName} 
                  onChange={(e) => setEditName(e.target.value)} 
                  placeholder="Seu Nome Completo"
                  style={{ 
                    width: '100%', padding: '12px', borderRadius: '8px', 
                    border: '1px solid rgba(255, 255, 255, 0.1)', 
                    background: 'rgba(15, 23, 42, 0.4)', color: 'var(--text-primary)',
                    outline: 'none', fontFamily: 'inherit', marginTop: '4px'
                  }} 
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '4px' }}>Nova Senha (opcional)</label>
                <input 
                  type="password" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  placeholder="Deixe em branco para não alterar"
                  style={{ 
                    width: '100%', padding: '12px', borderRadius: '8px', 
                    border: '1px solid rgba(255, 255, 255, 0.1)', 
                    background: 'rgba(15, 23, 42, 0.4)', color: 'var(--text-primary)',
                    outline: 'none', fontFamily: 'inherit', marginTop: '4px'
                  }} 
                />
              </div>

              {newPassword && (
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '4px' }}>Confirmar Nova Senha</label>
                  <input 
                    type="password" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    placeholder="Repita a nova senha"
                    style={{ 
                      width: '100%', padding: '12px', borderRadius: '8px', 
                      border: '1px solid rgba(255, 255, 255, 0.1)', 
                      background: 'rgba(15, 23, 42, 0.4)', color: 'var(--text-primary)',
                      outline: 'none', fontFamily: 'inherit', marginTop: '4px'
                    }} 
                  />
                </div>
              )}

              <button 
                type="submit"
                disabled={loading} 
                className="btn-primary"
                style={{ padding: '12px', marginTop: '8px', fontSize: '1rem', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
              >
                {loading ? 'Salvando...' : <><Check size={18} /> Salvar Alterações</>}
              </button>
            </form>
          ) : (
            <>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: '0 0 4px 0' }}>
                {fullName || 'Usuário'}
              </h2>
              
              {/* Badge de Gamificação */}
              <div style={{ 
                display: 'inline-flex',
                alignItems: 'center',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#10b981',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: '600',
                marginBottom: '12px',
                boxShadow: '0 2px 10px rgba(16, 185, 129, 0.1)'
              }}>
                Nível 1: Observador Climático
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ color: 'var(--primary)', fontWeight: '600', fontSize: '0.95rem' }}>@{username}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>•</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{email}</span>
              </div>
            </>
          )}
        </div>

        {!isEditing && (
          <>
            {/* Minhas Contribuições */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
                Minhas Atividades
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ 
                  background: 'rgba(15, 23, 42, 0.4)', 
                  border: '1px solid var(--border)', 
                  borderRadius: '10px', 
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <Map size={20} color="var(--primary)" />
                  <span style={{ fontSize: '1.2rem', fontWeight: '700' }}>0</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Mapas Exportados</span>
                </div>
                
                <div style={{ 
                  background: 'rgba(15, 23, 42, 0.4)', 
                  border: '1px solid var(--border)', 
                  borderRadius: '10px', 
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <FileText size={20} color="#10b981" />
                  <span style={{ fontSize: '1.2rem', fontWeight: '700' }}>0</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Relatórios Gerados</span>
                </div>
              </div>
              
              <div style={{ 
                marginTop: '12px',
                background: 'rgba(15, 23, 42, 0.4)', 
                border: '1px solid var(--border)', 
                borderRadius: '10px', 
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <Calendar size={18} color="var(--text-secondary)" />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: '500' }}>Membro desde</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{createdAt}</span>
                </div>
              </div>
            </div>

            {/* Minhas Análises Salvas */}
            <div style={{ marginBottom: '30px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Minhas Análises Salvas
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {loadingAnalyses ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                    <Loader className="animate-spin" size={24} color="var(--text-secondary)" />
                  </div>
                ) : savedAnalyses.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '20px', 
                    background: 'rgba(255,255,255,0.02)', 
                    borderRadius: '8px',
                    border: '1px dashed rgba(255,255,255,0.1)'
                  }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Nenhuma análise salva ainda.</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '4px' }}>Utilize o botão "Salvar" no painel principal.</p>
                  </div>
                ) : (
                  savedAnalyses.map((analysis) => (
                    <button 
                      key={analysis.id}
                      onClick={() => {
                        if (onLoadAnalysis) {
                          onLoadAnalysis(analysis.filters)
                          if (onClose) onClose()
                        }
                      }}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        background: 'rgba(255, 255, 255, 0.03)', 
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        textAlign: 'left'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                        e.currentTarget.style.borderColor = 'var(--primary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ background: 'rgba(59, 130, 246, 0.2)', padding: '6px', borderRadius: '6px' }}>
                          <Bookmark size={16} color="var(--primary)" />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{analysis.title}</span>
                          {analysis.description && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{analysis.description}</span>
                          )}
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Salva em: {new Date(analysis.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      <ArrowRight size={16} color="var(--text-secondary)" />
                    </button>
                  ))
                )}
              </div>
            </div>
            
            {/* Ações */}
            <button 
              onClick={handleSignOut}
              className="btn-secondary"
              style={{ 
                width: '100%', 
                padding: '14px', 
                fontSize: '1rem', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '8px',
                color: '#ef4444',
                borderColor: 'rgba(239, 68, 68, 0.3)',
                backgroundColor: 'rgba(239, 68, 68, 0.05)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.05)';
              }}
            >
              <LogOut size={20} /> Sair do Sistema
            </button>
          </>
        )}
      </div>
    </div>
  )
}
