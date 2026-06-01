import { useMemo } from 'react'
import Plotly from 'plotly.js-dist-min'
import createPlotlyComponent from 'react-plotly.js/factory'
const Plot = createPlotlyComponent.default ? createPlotlyComponent.default(Plotly) : createPlotlyComponent(Plotly)
import { GLOSSARIO } from './BrazilMap'
import { LineChart, Leaf, Thermometer } from 'lucide-react'

// Helper to convert English month names to Portuguese
const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

export default function ClimaCharts({ filteredData = [] }) {
  // 1. Process data for Stacked Area Chart (Evolution Over Time)
  const areaChartData = useMemo(() => {
    if (!filteredData.length) return []
    
    const groups = {}
    filteredData.forEach(item => {
      if (!item.data_exibicao) return
      const date = new Date(item.data_exibicao)
      if (isNaN(date.getTime())) return
      
      const year = date.getUTCFullYear()
      const month = String(date.getUTCMonth() + 1).padStart(2, '0')
      const key = `${year}-${month}`
      const mass = item.massa_de_ar_final || 'Não Informada'
      
      if (!groups[key]) {
        groups[key] = { name: key }
        Object.keys(GLOSSARIO).forEach(m => {
          groups[key][m] = 0
        })
      }
      groups[key][mass] = (groups[key][mass] || 0) + 1
    })
    
    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name))
  }, [filteredData])

  const plotlyAreaTraces = useMemo(() => {
    return Object.keys(GLOSSARIO).map(mass => ({
      x: areaChartData.map(d => d.name),
      y: areaChartData.map(d => d[mass]),
      name: mass,
      type: 'scatter',
      mode: 'none',
      stackgroup: 'one',
      fillcolor: GLOSSARIO[mass].cor,
      line: { color: GLOSSARIO[mass].cor }
    }))
  }, [areaChartData])

  // 2. Process data for Stacked Bar Chart (Seasons Proportion)
  const barChartData = useMemo(() => {
    const seasons = ['Verão', 'Outono', 'Inverno', 'Primavera']
    const result = seasons.map(season => {
      const obj = { name: season }
      Object.keys(GLOSSARIO).forEach(m => {
        obj[m] = 0
      })
      return obj
    })

    filteredData.forEach(item => {
      const season = item.estacao
      const mass = item.massa_de_ar_final || 'Não Informada'
      const seasonIdx = seasons.indexOf(season)
      if (seasonIdx !== -1) {
        result[seasonIdx][mass] = (result[seasonIdx][mass] || 0) + 1
      }
    })

    return result
  }, [filteredData])

  const plotlyBarTraces = useMemo(() => {
    return Object.keys(GLOSSARIO).map(mass => ({
      x: barChartData.map(d => d.name),
      y: barChartData.map(d => d[mass]),
      name: mass,
      type: 'bar',
      marker: { color: GLOSSARIO[mass].cor }
    }))
  }, [barChartData])

  // 3. Process data for Sazonalidade Heatmap (Air Mass vs Month)
  const heatmapData = useMemo(() => {
    const matrix = {}
    Object.keys(GLOSSARIO).forEach(mass => {
      matrix[mass] = Array(12).fill(0)
    })

    filteredData.forEach(item => {
      if (!item.data_exibicao) return
      const date = new Date(item.data_exibicao)
      if (isNaN(date.getTime())) return
      
      const monthZeroIndexed = date.getUTCMonth()
      const mass = item.massa_de_ar_final || 'Não Informada'
      
      if (matrix[mass]) {
        matrix[mass][monthZeroIndexed]++
      }
    })

    let maxVal = 0
    Object.values(matrix).forEach(row => {
      row.forEach(val => {
        if (val > maxVal) maxVal = val
      })
    })

    return { matrix, maxVal }
  }, [filteredData])

  const commonLayout = {
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    font: { color: '#cbd5e1', family: 'Inter, sans-serif' },
    margin: { t: 20, r: 20, l: 40, b: 40 },
    legend: { font: { color: '#cbd5e1' } },
    xaxis: { gridcolor: 'rgba(255,255,255,0.1)', tickfont: { color: '#94a3b8' } },
    yaxis: { gridcolor: 'rgba(255,255,255,0.1)', tickfont: { color: '#94a3b8' } }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* 1. Stacked Area Chart */}
      <div className="glass-card" style={{ padding: '28px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}><LineChart size={20} /> Histórico de Atuação das Massas de Ar (Artigo Científico)</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Evolução mensal absoluta no tempo. Formato científico de alta legibilidade para relatórios e publicações.</p>
        </div>
        
        {areaChartData.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Sem dados suficientes para gerar a evolução temporal.</p>
        ) : (
          <div style={{ width: '100%', height: '380px' }}>
            <Plot
              data={plotlyAreaTraces}
              layout={{
                ...commonLayout,
                autosize: true,
                yaxis: { ...commonLayout.yaxis, title: 'Frequência Absoluta (Dias)' },
                hovermode: 'x unified'
              }}
              style={{ width: '100%', height: '100%' }}
              useResizeHandler={true}
              config={{ responsive: true, displaylogo: false }}
            />
          </div>
        )}
      </div>

      <div className="responsive-grid-equal-cols">
        
        {/* 2. Season proportions */}
        <div className="glass-card" style={{ padding: '28px' }}>
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}><Leaf size={20} /> Frequência Relativa (%) por Estação do Ano</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Proporções normalizadas acumuladas para análise estatística de comportamento sazonal.</p>
          </div>
          <div style={{ width: '100%', height: '350px' }}>
            <Plot
              data={plotlyBarTraces}
              layout={{
                ...commonLayout,
                barmode: 'stack',
                autosize: true,
                yaxis: { ...commonLayout.yaxis, title: 'Dias', tickformat: 'd' }
              }}
              style={{ width: '100%', height: '100%' }}
              useResizeHandler={true}
              config={{ responsive: true, displaylogo: false }}
            />
          </div>
        </div>

        {/* 3. Heatmap of Sazonalidade with Legend */}
        <div className="glass-card" style={{ padding: '28px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}><Thermometer size={20} /> Matriz de Distribuição Mensal Acumulada</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Representação em escala térmica da frequência absoluta de dias por mês.</p>
          </div>
          
          <div style={{ overflowX: 'auto', flexGrow: 1, marginBottom: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '10px 8px', color: 'var(--text-primary)', borderBottom: '2px solid rgba(255,255,255,0.1)', fontWeight: 'bold' }}>Massa</th>
                  {MONTH_NAMES_PT.map(m => (
                    <th key={m} style={{ padding: '10px 4px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 'bold', borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                      {m.substring(0, 3)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(heatmapData.matrix).map(([mass, months]) => (
                  <tr key={mass} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ textAlign: 'left', padding: '12px 8px', color: 'var(--text-primary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: GLOSSARIO[mass].cor }}></span>
                      {mass}
                    </td>
                    {months.map((val, idx) => {
                      const opacity = heatmapData.maxVal > 0 ? (val / heatmapData.maxVal) * 0.85 + (val > 0 ? 0.15 : 0) : 0
                      return (
                        <td 
                          key={idx}
                          title={`${GLOSSARIO[mass].nome}: ${val} dias em ${MONTH_NAMES_PT[idx]}`}
                          style={{
                            padding: '12px 4px',
                            textAlign: 'center',
                            color: val > 0 ? 'var(--text-primary)' : 'var(--border-light)',
                            backgroundColor: val > 0 ? `rgba(99, 102, 241, ${opacity})` : 'var(--bg-card-alt)',
                            fontWeight: val > 0 ? '600' : 'normal',
                            border: '1px solid rgba(255,255,255,0.02)',
                            transition: 'background-color 0.2s'
                          }}
                        >
                          {val}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Color bar scale legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', alignSelf: 'flex-end', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 'auto' }}>
            <span>Frequência:</span>
            <span>Mínima (0 dias)</span>
            <div style={{
              display: 'flex',
              width: '100px',
              height: '10px',
              borderRadius: '3px',
              background: 'linear-gradient(to right, rgba(99, 102, 241, 0.15), rgba(99, 102, 241, 1))',
              border: '1px solid rgba(255,255,255,0.1)'
            }}></div>
            <span>Máxima ({heatmapData.maxVal} dias)</span>
          </div>
        </div>

      </div>
    </div>
  )
}

