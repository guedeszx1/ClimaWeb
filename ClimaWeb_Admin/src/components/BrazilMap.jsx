import { useRef, useState, useEffect, useMemo } from 'react'
import { Map, Download } from 'lucide-react'
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
  const [geoData, setGeoData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/mapa_brasil_regioes.json')
      .then(res => res.json())
      .then(data => {
        setGeoData(data)
        setIsLoading(false)
      })
      .catch(err => {
        console.error("Erro ao carregar GeoJSON:", err)
        setIsLoading(false)
      })
  }, [])

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
      pixelRatio: 3, // Set pixelRatio to 3 for ultra-high quality export
      style: {
        borderRadius: '16px',
        padding: '24px',
        width: element.offsetWidth + 'px',
        height: element.offsetHeight + 'px'
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

  const projectedPaths = useMemo(() => {
    if (!geoData || !geoData.features) return []
    
    // Find bounding box
    let minLng = Infinity, maxLng = -Infinity;
    let minLat = Infinity, maxLat = -Infinity;
    
    geoData.features.forEach(feature => {
      const geom = feature.geometry;
      if (!geom) return;
      
      const processRing = (ring) => {
        ring.forEach(([lng, lat]) => {
          if (lng < minLng) minLng = lng;
          if (lng > maxLng) maxLng = lng;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
        });
      };
      
      const processPolygon = (poly) => {
        poly.forEach(processRing);
      };
      
      if (geom.type === "Polygon") {
        processPolygon(geom.coordinates);
      } else if (geom.type === "MultiPolygon") {
        geom.coordinates.forEach(processPolygon);
      }
    });
    
    // Map SVG coordinate space
    const width = 500;
    const height = 500;
    
    const lngDiff = maxLng - minLng;
    const latDiff = maxLat - minLat;
    
    const mapAspectRatio = lngDiff / latDiff;
    const svgAspectRatio = width / height;
    
    let scaleX, scaleY;
    let offsetX = 0, offsetY = 0;
    
    if (mapAspectRatio > svgAspectRatio) {
      const scale = width / lngDiff;
      scaleX = scale;
      scaleY = scale;
      offsetY = (height - latDiff * scale) / 2;
    } else {
      const scale = height / latDiff;
      scaleX = scale;
      scaleY = scale;
      offsetX = (width - lngDiff * scale) / 2;
    }
    
    const project = ([lng, lat]) => {
      const x = offsetX + (lng - minLng) * scaleX;
      const y = height - (offsetY + (lat - minLat) * scaleY);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    };
    
    const getPathData = (geometry) => {
      if (!geometry) return "";
      const processPolygon = (poly) => {
        return poly.map(ring => {
          if (ring.length === 0) return "";
          const points = ring.map(project);
          return `M ${points.join(" L ")} Z`;
        }).join(" ");
      };
      
      if (geometry.type === "Polygon") {
        return processPolygon(geometry.coordinates);
      } else if (geometry.type === "MultiPolygon") {
        return geometry.coordinates.map(processPolygon).join(" ");
      }
      return "";
    };
    
    return geoData.features.map((feature, idx) => {
      const region_key = feature.properties?.region_key || "Não Informada";
      const d = getPathData(feature.geometry);
      return {
        id: feature.properties?.fid || idx,
        region_key,
        d
      };
    });
  }, [geoData])

  const tooltipDetails = GLOSSARIO[tooltip.mass] || GLOSSARIO['Não Informada']

  return (
    <div ref={containerRef} className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
      <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h4 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}><Map size={20} /> Distribuição Geográfica {title && `- ${title}`}</h4>
        <button onClick={exportAsPng} className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Download size={14} /> Baixar PNG
        </button>
      </div>

      <div className="map-export-target" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px' }}>
        {/* Title for export context */}
        <div style={{ alignSelf: 'flex-start', color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '16px', display: 'block' }}>
          Distribuição Geográfica {title && `- ${title}`}
        </div>

        {isLoading ? (
          <div style={{ height: '380px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
            Carregando mapa...
          </div>
        ) : (
          <svg viewBox="0 0 500 500" style={{ width: '100%', maxWidth: '380px', filter: 'drop-shadow(0px 10px 20px rgba(0,0,0,0.3))' }}>
            {projectedPaths.map((path) => (
              <path 
                key={path.id}
                className="br-region" 
                d={path.d}
                fill={getRegionColor(path.region_key)}
                stroke="#0b0f19"
                strokeWidth="1.8"
                strokeLinejoin="round"
                onMouseMove={(e) => handleMouseMove(e, path.region_key)}
                onMouseLeave={handleMouseLeave}
              />
            ))}
            
            {/* Indicador de Norte */}
            <g transform="translate(440, 50)" style={{ pointerEvents: 'none' }}>
              <circle cx="0" cy="0" r="16" fill="rgba(15, 23, 42, 0.4)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
              <polygon points="0,-10 3,0 0,-2" fill="#ef4444" />
              <polygon points="0,10 3,0 0,2" fill="rgba(255,255,255,0.6)" />
              <polygon points="0,-10 -3,0 0,-2" fill="#f87171" />
              <polygon points="0,10 -3,0 0,2" fill="rgba(255,255,255,0.4)" />
              <text x="0" y="-13" textAnchor="middle" fontSize="9" fill="var(--text-primary)" fontWeight="bold" fontFamily="sans-serif">N</text>
            </g>

            {/* Escala Gráfica */}
            <g transform="translate(40, 450)" style={{ pointerEvents: 'none' }}>
              <rect x="0" y="0" width="58" height="4" fill="var(--text-primary)" stroke="var(--text-primary)" strokeWidth="0.5" />
              <rect x="58" y="0" width="58" height="4" fill="none" stroke="var(--text-primary)" strokeWidth="0.5" />
              <line x1="0" y1="0" x2="0" y2="7" stroke="var(--text-primary)" strokeWidth="1" />
              <line x1="58" y1="0" x2="58" y2="7" stroke="var(--text-primary)" strokeWidth="1" />
              <line x1="116" y1="0" x2="116" y2="7" stroke="var(--text-primary)" strokeWidth="1" />
              <text x="0" y="17" fontSize="8" fill="var(--text-muted)" textAnchor="middle" fontFamily="sans-serif">0</text>
              <text x="58" y="17" fontSize="8" fill="var(--text-muted)" textAnchor="middle" fontFamily="sans-serif">500</text>
              <text x="116" y="17" fontSize="8" fill="var(--text-muted)" textAnchor="middle" fontFamily="sans-serif">1000 km</text>
            </g>
          </svg>
        )}

        {/* Legend inside the export container */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', marginTop: '24px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          {Object.entries(GLOSSARIO).map(([key, info]) => {
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
    </div>
  )
}
