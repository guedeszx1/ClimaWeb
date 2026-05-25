import React, { useMemo } from 'react'
import { GraphicWalker } from '@kanaries/graphic-walker'

export default function DataExplorer({ filteredData, role }) {
  // Infer fields for Graphic Walker based on the first object keys
  const fields = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return []
    
    // Create a dictionary to hold infered types
    const inferedTypes = {}
    
    // Look at first 10 rows to guess the type properly (in case of nulls)
    const sampleRows = filteredData.slice(0, 10)
    
    sampleRows.forEach(row => {
      Object.entries(row).forEach(([key, val]) => {
        if (val !== null && val !== undefined && val !== '') {
          if (!inferedTypes[key]) {
            inferedTypes[key] = typeof val === 'number' ? 'quantitative' : 'nominal'
          }
        }
      })
    })

    // Fallback any remaining keys to nominal
    Object.keys(filteredData[0]).forEach(key => {
      if (!inferedTypes[key]) inferedTypes[key] = 'nominal'
    })

    return Object.entries(inferedTypes).map(([key, semanticType]) => ({
      fid: key,
      name: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), // Title Case
      semanticType: semanticType,
      analyticType: semanticType === 'quantitative' ? 'measure' : 'dimension'
    }))
  }, [filteredData])

  return (
    <div className="glass-card" style={{ padding: '20px', minHeight: '800px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '16px' }}>
        <h4 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', marginBottom: '4px' }}>🧪 Laboratório de Exploração Livre</h4>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Arraste e solte colunas (Dimensões e Medidas) para os eixos para criar seus próprios gráficos e tabelas dinâmicas.
        </p>
      </div>
      
      {/* We wrap GraphicWalker in a div with its own scroll and isolated background. 
          GraphicWalker has a complex UI, so giving it full height and isolation helps. */}
      <div style={{ flexGrow: 1, minHeight: '700px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
        {filteredData && filteredData.length > 0 ? (
          <GraphicWalker 
            data={filteredData} 
            fields={fields} 
            dark="dark"
            themeKey="vega"
          />
        ) : (
           <p style={{ padding: '20px', color: 'var(--text-secondary)' }}>Nenhum dado disponível para exploração.</p>
        )}
      </div>
    </div>
  )
}
