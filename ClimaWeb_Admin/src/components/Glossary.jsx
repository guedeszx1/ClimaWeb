import { useState } from 'react'
import { GLOSSARIO } from './BrazilMap'

export default function Glossary() {
  const [openCard, setOpenCard] = useState(null)

  const toggleCard = (key) => {
    if (openCard === key) {
      setOpenCard(null)
    } else {
      setOpenCard(key)
    }
  }

  // Filter out "Não Informada" for the glossary cards
  const glossaryItems = Object.entries(GLOSSARIO).filter(([key]) => key !== 'Não Informada')

  return (
    <div style={{ padding: '4px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', marginBottom: '8px' }}>📚 Glossário de Massas de Ar no Brasil</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Explore as características, origem e atuação climatológica das principais massas de ar que influenciam as regiões do país.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {glossaryItems.map(([key, info]) => {
          const isOpen = openCard === key

          return (
            <div 
              key={key} 
              className="glass-card" 
              style={{ 
                padding: '24px', 
                borderLeft: `6px solid ${info.cor}`,
                display: 'flex', 
                flexDirection: 'column',
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={{ color: info.cor, fontSize: '1.8rem', fontWeight: '800', fontFamily: 'Outfit' }}>{key}</h2>
                <span 
                  style={{ 
                    fontSize: '0.8rem', 
                    padding: '4px 8px', 
                    borderRadius: '4px', 
                    backgroundColor: 'var(--border)', 
                    color: 'var(--text-secondary)',
                    fontWeight: '600'
                  }}
                >
                  {key === 'mPa' ? '❄️ Fria' : '🔥 Quente'}
                </span>
              </div>

              <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '16px', display: 'block', fontFamily: 'Outfit' }}>
                {info.nome}
              </strong>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>📍 Origem: </span>
                  {info.origem}
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>🌡️ Clima: </span>
                  {info.carac}
                </div>
              </div>

              <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '16px' }}>
                <button 
                  onClick={() => toggleCard(key)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: info.cor,
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.9rem',
                    padding: '0',
                    outline: 'none'
                  }}
                >
                  <span>{isOpen ? '📖 Recolher explicação' : '📖 Ler explicação detalhada'}</span>
                  <span style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
                </button>

                {isOpen && (
                  <div 
                    style={{ 
                      marginTop: '12px', 
                      lineHeight: '1.6', 
                      color: '#e2e8f0', 
                      fontSize: '0.9rem', 
                      backgroundColor: 'var(--bg-card-alt)', 
                      padding: '12px', 
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.03)',
                      animation: 'fadeIn 0.3s ease-out'
                    }}
                  >
                    <strong>Atuação Climatológica:</strong>
                    <p style={{ marginTop: '6px', color: 'var(--text-secondary)' }}>
                      {info.atuacao}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
