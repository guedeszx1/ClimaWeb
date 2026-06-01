import { useState } from 'react'
import { GLOSSARIO } from './BrazilMap'
import { Library, Snowflake, Flame, MapPin, Thermometer, BookOpen } from 'lucide-react'

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
        <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Library size={28} /> Glossário de Massas de Ar no Brasil
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Explore as características, origem e atuação climatológica das principais massas de ar que influenciam as regiões do país.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', alignItems: 'start' }}>
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
                <h2 style={{ color: info.cor, fontSize: '1.8rem', fontWeight: '800' }}>{key}</h2>
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
                  {key === 'mPa' ? <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Snowflake size={14} /> Fria</span> : <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Flame size={14} /> Quente</span>}
                </span>
              </div>

              <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '16px', display: 'block' }}>
                {info.nome}
              </strong>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}><MapPin size={14} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> Origem: </span>
                  {info.origem}
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}><Thermometer size={14} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> Clima: </span>
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
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><BookOpen size={16} /> {isOpen ? 'Recolher explicação' : 'Ler explicação detalhada'}</span>
                  <span style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
                </button>

                <div 
                  style={{ 
                    display: 'grid', 
                    gridTemplateRows: isOpen ? '1fr' : '0fr', 
                    transition: 'grid-template-rows 0.3s ease-in-out'
                  }}
                >
                  <div style={{ overflow: 'hidden' }}>
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
                        opacity: isOpen ? 1 : 0,
                        transition: 'opacity 0.3s ease-in-out'
                      }}
                    >
                      <strong>Atuação Climatológica:</strong>
                      <p style={{ marginTop: '6px', color: 'var(--text-secondary)' }}>
                        {info.atuacao}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
