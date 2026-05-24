import { useRef, useState } from 'react'
import { toPng } from 'html-to-image'

export const GLOSSARIO = {
  'mEc': {
    nome: 'Massa Equatorial Continental',
    carac: 'Quente e extremamente úmida',
    origem: 'Região Amazônica',
    atuacao: 'Domina grande parte do país no verão, causando chuvas de fim de tarde intensas e calor. Recua bastante no inverno.',
    cor: '#ef4444'
  },
  'mEa': {
    nome: 'Massa Equatorial Atlântica',
    carac: 'Quente e úmida',
    origem: 'Oceano Atlântico Norte (próximo à Linha do Equador)',
    atuacao: 'Atua no litoral norte e nordeste do Brasil, trazendo ventos úmidos e chuvas frequentes para essa faixa.',
    cor: '#f97316'
  },
  'mTa': {
    nome: 'Massa Tropical Atlântica',
    carac: 'Quente e úmida',
    origem: 'Oceano Atlântico Sul (próximo ao Trópico de Capricórnio)',
    atuacao: 'Atua durante todo o ano sobre o litoral brasileiro, trazendo umidade e ventos constantes para o Sudeste, Sul e Nordeste.',
    cor: '#3b82f6'
  },
  'mTc': {
    nome: 'Massa Tropical Continental',
    carac: 'Quente e seca',
    origem: 'Depressão do Chaco (fronteira Paraguai/Argentina)',
    atuacao: 'Gera períodos de calor intenso e baixíssima umidade do ar no Centro-Oeste, Sudeste e Sul, especialmente no fim do inverno.',
    cor: '#eab308'
  },
  'mPa': {
    nome: 'Massa Polar Atlântica',
    carac: 'Fria e úmida',
    origem: 'Oceano Atlântico Sul (alta latitude, perto da Antártida)',
    atuacao: 'Causa frentes frias, declínio acentuado de temperatura, geadas no Sul/Sudeste e friagem no sul da Amazônia.',
    cor: '#10b981'
  },
  'Não Informada': {
    nome: 'Massa não identificada',
    carac: 'Sem classificação no banco de dados',
    origem: 'Indeterminada',
    atuacao: 'Período sem registro ou análise descritiva conclusiva.',
    cor: 'var(--text-secondary)'
  }
}

export default function BrazilMap({ regionMassMap = {}, title = "" }) {
  const containerRef = useRef(null)
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, region: '', mass: '' })

  const getRegionColor = (region) => {
    const mass = regionMassMap[region]
    if (mass && GLOSSARIO[mass]) {
      return GLOSSARIO[mass].cor
    }
    return '#334155' // Slate default color
  }

  const getRegionMass = (region) => {
    return regionMassMap[region] || 'Não Informada'
  }

  const handleMouseMove = (e, region) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const parentRect = e.currentTarget.ownerDocument.documentElement.getBoundingClientRect()
    const x = e.clientX - rect.left + 15
    const y = e.clientY - rect.top + 15
    const mass = getRegionMass(region)
    setTooltip({
      show: true,
      x: e.pageX - 120, // adjust slightly to left
      y: e.pageY - 130, // adjust slightly above
      region,
      mass
    })
  }

  const handleMouseLeave = () => {
    setTooltip(prev => ({ ...prev, show: false }))
  }

  const exportAsPng = () => {
    if (!containerRef.current) return
    
    // Select the map wrapper element to export
    const element = containerRef.current.querySelector('.map-export-target')
    
    toPng(element, { 
      backgroundColor: '#0b0f19', 
      style: {
        borderRadius: '16px',
        padding: '24px'
      }
    })
      .then((dataUrl) => {
        const link = document.createElement('a')
        link.download = `climaweb-mapa-${title || 'brasil'}.png`
        link.href = dataUrl
        link.click()
      })
      .catch((err) => {
        console.error('Erro ao exportar mapa em PNG:', err)
      })
  }

  const tooltipDetails = GLOSSARIO[tooltip.mass] || GLOSSARIO['Não Informada']

  return (
    <div ref={containerRef} className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
      <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h4 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>🗺️ Distribuição Geográfica {title && `- ${title}`}</h4>
        <button onClick={exportAsPng} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
          📥 Baixar PNG
        </button>
      </div>

      <div className="map-export-target" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px' }}>
        <svg viewBox="0 0 500 500" style={{ width: '100%', maxWidth: '380px', filter: 'drop-shadow(0px 10px 20px rgba(0,0,0,0.3))' }}>
          {/* Norte */}
          <path 
            className="br-region" 
            d="M 40,200 L 140,60 L 250,60 L 280,180 L 240,260 L 150,260 Z"
            fill={getRegionColor('Norte')}
            style={{ transformOrigin: '150px 150px' }}
            onMouseMove={(e) => handleMouseMove(e, 'Norte')}
            onMouseLeave={handleMouseLeave}
          />
          
          {/* Nordeste */}
          <path 
            className="br-region" 
            d="M 250,60 L 410,100 L 430,150 L 370,240 L 280,180 Z"
            fill={getRegionColor('Nordeste')}
            style={{ transformOrigin: '350px 150px' }}
            onMouseMove={(e) => handleMouseMove(e, 'Nordeste')}
            onMouseLeave={handleMouseLeave}
          />
          
          {/* Centro-Oeste/Sudeste */}
          <path 
            className="br-region" 
            d="M 150,260 L 240,260 L 280,180 L 370,240 L 340,360 L 220,360 Z"
            fill={getRegionColor('Centro')}
            style={{ transformOrigin: '260px 280px' }}
            onMouseMove={(e) => handleMouseMove(e, 'Centro')}
            onMouseLeave={handleMouseLeave}
          />
          
          {/* Sul */}
          <path 
            className="br-region" 
            d="M 220,360 L 300,360 L 280,470 L 230,470 Z"
            fill={getRegionColor('Sul')}
            style={{ transformOrigin: '250px 420px' }}
            onMouseMove={(e) => handleMouseMove(e, 'Sul')}
            onMouseLeave={handleMouseLeave}
          />
          
          {/* Litoral */}
          <path 
            className="br-region" 
            d="M 410,100 L 440,110 L 460,160 L 400,280 L 340,380 L 300,360 L 340,340 L 370,240 L 430,150 Z"
            fill={getRegionColor('Litoral')}
            style={{ transformOrigin: '400px 250px', opacity: 0.95 }}
            onMouseMove={(e) => handleMouseMove(e, 'Litoral')}
            onMouseLeave={handleMouseLeave}
          />
        </svg>
      </div>

      {tooltip.show && (
        <div 
          className="custom-tooltip"
          style={{
            position: 'absolute',
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            zIndex: 1000,
            borderLeft: `4px solid ${tooltipDetails.cor}`,
            minWidth: '220px',
            pointerEvents: 'none'
          }}
        >
          <div className="tooltip-title" style={{ color: tooltipDetails.cor }}>
            {tooltip.region}
          </div>
          <div style={{ fontWeight: '600', marginBottom: '4px' }}>
            {tooltip.mass} ({tooltipDetails.nome})
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
            {tooltipDetails.carac}
          </div>
        </div>
      )}

      {/* Legend below the map */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', marginTop: '16px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
        {Object.entries(GLOSSARIO).map(([key, info]) => {
          // If the region map contains this key, show it highlighted, else keep it
          const count = Object.values(regionMassMap).filter(v => v === key).length
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: count > 0 ? 1 : 0.6 }}>
              <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: info.cor }}></span>
              <span>{key} {count > 0 && `(${count})`}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
