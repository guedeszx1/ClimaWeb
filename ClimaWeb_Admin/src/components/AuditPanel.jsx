import { useState, useMemo, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts'
import { downloadChartAsPng } from '../utils/exportChart'
import { GLOSSARIO } from './BrazilMap'
import { AlertTriangle, Calendar, FileEdit, Bot, Shield, Save, Image, Download, Microscope, ScrollText, Trash2, Lock } from 'lucide-react'

export default function AuditPanel({ allData = [], onRefreshData, role }) {
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedRegion, setSelectedRegion] = useState('')
  const [iaCorrect, setIaCorrect] = useState('Sim')
  const [trueMass, setTrueMass] = useState('mEc')
  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Image Viewer state
  const [activeImageTab, setActiveImageTab] = useState('official') // 'official' or 'gabarito'
  const [imageSrc, setImageSrc] = useState('')
  const [fallbackAttempt, setFallbackAttempt] = useState(0)
  const [imageError, setImageError] = useState(false)
  const [fullscreenImage, setFullscreenImage] = useState(null)

  // 1. Get list of unique dates for the dropdown
  const uniqueDates = useMemo(() => {
    const dates = [...new Set(allData.map(item => item.data_exibicao))].filter(Boolean)
    return dates.sort((a, b) => b.localeCompare(a)) // Descending
  }, [allData])

  // Set initial selected date
  useEffect(() => {
    if (uniqueDates.length && !selectedDate) {
      setSelectedDate(uniqueDates[0])
    }
  }, [uniqueDates, selectedDate])

  // Get regions for the selected date
  const regionsForDate = useMemo(() => {
    if (!selectedDate) return []
    const regions = allData
      .filter(item => item.data_exibicao === selectedDate)
      .map(item => item.regiao)
      .filter(Boolean)
    return [...new Set(regions)].sort()
  }, [allData, selectedDate])

  // Set initial selected region when date changes
  useEffect(() => {
    if (regionsForDate.length) {
      setSelectedRegion(regionsForDate[0])
    } else {
      setSelectedRegion('')
    }
  }, [regionsForDate])

  // Current record details
  const currentRecord = useMemo(() => {
    if (!selectedDate || !selectedRegion) return null
    return allData.find(item => item.data_exibicao === selectedDate && item.regiao === selectedRegion) || null
  }, [allData, selectedDate, selectedRegion])

  // Initialize form fields when current record changes
  useEffect(() => {
    if (currentRecord) {
      const isCorrect = currentRecord.massa_de_ar_ia === currentRecord.massa_de_ar_final ? 'Sim' : 'Não'
      setIaCorrect(isCorrect)
      setTrueMass(currentRecord.massa_de_ar_final || 'mEc')
    }
  }, [currentRecord])

  // Image Source Resolution and Fallback Chain
  useEffect(() => {
    if (selectedDate) {
      const parts = selectedDate.split('-')
      if (parts.length === 3) {
        const [year, month, day] = parts
        const cleanDate = `${year}${month}${day}`
        setImageSrc(`/cartas_sinoticas/${year}/web_AS_analise_${cleanDate}0000_+0.png`)
        setFallbackAttempt(0)
        setImageError(false)
      }
    } else {
      setImageSrc('')
      setImageError(false)
    }
  }, [selectedDate])

  const handleImageError = () => {
    if (!selectedDate) return
    const parts = selectedDate.split('-')
    const [year, month, day] = parts
    const cleanDate = `${year}${month}${day}`

    // Attempt fallbacks based on different common suffixes
    if (fallbackAttempt === 0) {
      // Try +6
      setFallbackAttempt(1)
      setImageSrc(`/cartas_sinoticas/${year}/web_AS_analise_${cleanDate}0000_+6.png`)
    } else if (fallbackAttempt === 1) {
      // Try +12
      setFallbackAttempt(2)
      setImageSrc(`/cartas_sinoticas/${year}/web_AS_analise_${cleanDate}0000_+12.png`)
    } else if (fallbackAttempt === 2) {
      // Try +9
      setFallbackAttempt(3)
      setImageSrc(`/cartas_sinoticas/${year}/web_AS_analise_${cleanDate}0000_+9.png`)
    } else if (fallbackAttempt === 3) {
      // Try 1200_+0
      setFallbackAttempt(4)
      setImageSrc(`/cartas_sinoticas/${year}/web_AS_analise_${cleanDate}1200_+0.png`)
    } else {
      setImageError(true)
    }
  }

  // 2. Identify incomplete daily audits (To-Do List)
  const incompleteAudits = useMemo(() => {
    const dailyGroups = {}
    allData.forEach(item => {
      const date = item.data_exibicao
      if (!date) return
      if (!dailyGroups[date]) {
        dailyGroups[date] = { date, total: 0, audited: 0, missing: [] }
      }
      dailyGroups[date].total++
      const isAudited = item.status_informacao && !item.status_informacao.includes('100% IA')
      if (isAudited) {
        dailyGroups[date].audited++
      } else {
        dailyGroups[date].missing.push(item.regiao)
      }
    })

    return Object.values(dailyGroups)
      .filter(g => g.audited > 0 && g.audited < g.total)
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [allData])

  // 3. Filter audited records
  const auditedRecords = useMemo(() => {
    return allData.filter(item => item.status_informacao && !item.status_informacao.includes('100% IA'))
  }, [allData])

  // 4. Statistics (Publication Quality)
  const statistics = useMemo(() => {
    const total = auditedRecords.length
    if (total === 0) {
      return { total: 0, accuracy: 0, errors: 0, confusionMatrix: {}, regionAcc: [] }
    }

    let correctCount = 0
    const confusionMatrix = {}
    const regionStats = {}

    // Initialize confusion matrix
    const masses = Object.keys(GLOSSARIO)
    masses.forEach(actual => {
      confusionMatrix[actual] = {}
      masses.forEach(predicted => {
        confusionMatrix[actual][predicted] = 0
      })
    })

    // Calculate accuracy and counts
    auditedRecords.forEach(item => {
      const actual = item.massa_de_ar_final || 'Não Informada'
      const predicted = item.massa_de_ar_ia || 'Não Informada'
      const isCorrect = actual === predicted
      
      if (isCorrect) correctCount++

      if (confusionMatrix[actual] && confusionMatrix[actual][predicted] !== undefined) {
        confusionMatrix[actual][predicted]++
      }

      const reg = item.regiao
      if (!regionStats[reg]) {
        regionStats[reg] = { total: 0, correct: 0 }
      }
      regionStats[reg].total++
      if (isCorrect) regionStats[reg].correct++
    })

    const accuracy = (correctCount / total) * 100
    const errors = total - correctCount

    // Region stats formatted for scientific BarChart
    const regionAcc = Object.entries(regionStats).map(([reg, stat]) => ({
      name: reg,
      Acurácia: Math.round((stat.correct / stat.total) * 100),
      Erros: stat.total - stat.correct,
      Total: stat.total
    }))

    // Find max value in matrix for opacity shading
    let maxMatrixVal = 0
    Object.values(confusionMatrix).forEach(row => {
      Object.values(row).forEach(val => {
        if (val > maxMatrixVal) maxMatrixVal = val
      })
    })

    return { total, accuracy, errors, confusionMatrix, regionAcc, maxMatrixVal }
  }, [auditedRecords])

  // Save audit
  const handleSaveAudit = async () => {
    if (!selectedDate || !selectedRegion) return
    setIsSaving(true)
    setErrorMsg('')
    setSuccessMsg('')

    const finalMass = iaCorrect === 'Sim' ? (currentRecord?.massa_de_ar_ia || 'Não Informada') : trueMass
    const statusVal = iaCorrect === 'Sim' ? 'Validado Humano (IA Acertou)' : 'Corrigido Humano (IA Errou)'
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19)

    try {
      const { error } = await supabase
        .from('clima_registros')
        .update({
          massa_de_ar_final: finalMass,
          status_informacao: statusVal,
          data_verificacao: now
        })
        .match({
          data_exibicao: selectedDate,
          regiao: selectedRegion
        })

      if (error) throw error

      setSuccessMsg('Validação salva com sucesso!')
      
      if (onRefreshData) {
        await onRefreshData()
      }
    } catch (err) {
      console.error(err)
      setErrorMsg(`Erro ao salvar no banco: ${err.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  // Reset a specific audit record back to 100% IA
  const handleResetRecord = async (date, region, iaMass) => {
    try {
      const { error } = await supabase
        .from('clima_registros')
        .update({
          massa_de_ar_final: iaMass,
          status_informacao: '100% IA (Não Validado)',
          data_verificacao: null
        })
        .match({
          data_exibicao: date,
          regiao: region
        })

      if (error) throw error

      if (onRefreshData) {
        await onRefreshData()
      }
    } catch (err) {
      console.error(err)
      alert(`Erro ao resetar registro: ${err.message}`)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Todo list of incomplete audits */}
      {incompleteAudits.length > 0 && (
        <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid var(--warning)' }}>
          <h4 style={{ color: 'var(--text-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={20} /> Auditorias Incompletas (To-Do List)
          </h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '14px' }}>
            As datas a seguir possuem algumas regiões validadas e outras pendentes. Conclua-as para garantir a integridade da base de dados:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {incompleteAudits.slice(0, 10).map(g => (
              <div 
                key={g.date} 
                onClick={() => {
                  setSelectedDate(g.date)
                  if (g.missing.length) setSelectedRegion(g.missing[0])
                }}
                style={{ 
                  background: 'rgba(245, 158, 11, 0.1)', 
                  border: '1px solid rgba(245, 158, 11, 0.2)', 
                  padding: '8px 12px', 
                  borderRadius: '8px', 
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  transition: 'var(--transition-smooth)'
                }}
                className="hover-scale"
              >
                <strong style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Calendar size={14} /> {g.date}</strong> ({g.audited}/{g.total} regiões)
                <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '4px' }}>
                  Falta: {g.missing.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Row 2: Validation Form (Left) & Image Viewer (Right) */}
      <div className="responsive-grid-form-viewer">
        
        {/* Validation Form */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <h4 style={{ color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileEdit size={20} /> Formulário de Validação Humana
          </h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flexGrow: 1 }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Selecione a data da Carta (Calendário):</label>
              <input 
                type="date"
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)} 
                className="premium-input"
                min={uniqueDates.length > 0 ? uniqueDates[uniqueDates.length - 1] : undefined}
                max={uniqueDates.length > 0 ? uniqueDates[0] : undefined}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Selecione a Região a Avaliar:</label>
              <select 
                value={selectedRegion} 
                onChange={(e) => setSelectedRegion(e.target.value)} 
                className="premium-select"
                disabled={!regionsForDate.length}
              >
                {regionsForDate.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {currentRecord && (
              <div style={{ background: 'var(--bg-card-alt)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ marginBottom: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Bot size={16} color="var(--text-muted)" /> <span style={{ color: 'var(--text-muted)' }}>Classificação da IA: </span>
                  <strong style={{ color: GLOSSARIO[currentRecord.massa_de_ar_ia]?.cor || 'var(--text-primary)' }}>
                    {currentRecord.massa_de_ar_ia}
                  </strong>
                </div>
                <div style={{ marginBottom: '12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Shield size={16} color="var(--text-muted)" /> <span style={{ color: 'var(--text-muted)' }}>Status Atual: </span>
                  <span style={{ color: currentRecord.status_informacao.includes('100% IA') ? '#f59e0b' : '#10b981', fontWeight: '500' }}>
                    {currentRecord.status_informacao}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '4px' }}>
                  {currentRecord.descricao || 'Sem descrição cadastrada para este registro.'}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>A classificação da IA está correta?</span>
              <div style={{ display: 'flex', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="iaCorrect" 
                    value="Sim" 
                    checked={iaCorrect === 'Sim'} 
                    onChange={() => setIaCorrect('Sim')} 
                  />
                  <span>Sim, validar acerto</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="iaCorrect" 
                    value="Não" 
                    checked={iaCorrect === 'Não'} 
                    onChange={() => setIaCorrect('Não')} 
                  />
                  <span>Não, corrigir classificação</span>
                </label>
              </div>
            </div>

            {iaCorrect === 'Não' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Verdadeira Massa de Ar atuante:</label>
                <select 
                  value={trueMass} 
                  onChange={(e) => setTrueMass(e.target.value)} 
                  className="premium-select"
                >
                  {Object.keys(GLOSSARIO).map(m => (
                    <option key={m} value={m}>{m} - {GLOSSARIO[m].nome}</option>
                  ))}
                </select>
              </div>
            )}

            {errorMsg && <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: 'auto' }}>{errorMsg}</div>}
            {successMsg && <div style={{ color: 'var(--success)', fontSize: '0.85rem', marginTop: 'auto' }}>{successMsg}</div>}

            <button 
              onClick={handleSaveAudit} 
              className="btn-primary" 
              style={{ width: '100%', padding: '14px', marginTop: 'auto', opacity: role === 'guest' ? 0.5 : 1, cursor: role === 'guest' ? 'not-allowed' : 'pointer' }}
              disabled={isSaving || !currentRecord || role === 'guest'}
              title={role === 'guest' ? "Visitantes não podem editar registros" : ""}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                {isSaving ? 'Salvando...' : (role === 'guest' ? <><Lock size={18} /> Bloqueado</> : <><Save size={18} /> Salvar Validação</>)}
              </div>
            </button>

          </div>
        </div>

        {/* Synoptic Chart & Bounding Boxes Image Viewer */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Image size={20} /> Visualizador de Imagens de Análise
            </h4>
            <div style={{ display: 'flex', gap: '6px', background: 'var(--border)', padding: '2px', borderRadius: '6px' }}>
              <button 
                onClick={() => setActiveImageTab('official')} 
                style={{ 
                  padding: '6px 12px', 
                  fontSize: '0.75rem', 
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: activeImageTab === 'official' ? 'var(--primary)' : 'transparent',
                  color: 'var(--text-primary)',
                  fontWeight: '600',
                  transition: 'var(--transition-smooth)'
                }}
              >
                Carta Oficial
              </button>
              <button 
                onClick={() => setActiveImageTab('gabarito')} 
                style={{ 
                  padding: '6px 12px', 
                  fontSize: '0.75rem', 
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: activeImageTab === 'gabarito' ? 'var(--primary)' : 'transparent',
                  color: 'var(--text-primary)',
                  fontWeight: '600',
                  transition: 'var(--transition-smooth)'
                }}
              >
                Gabarito (Bounding Boxes)
              </button>
            </div>
          </div>

          <div style={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '10px', minHeight: '380px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
            {activeImageTab === 'official' ? (
              selectedDate ? (
                imageError ? (
                  <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
                    <AlertTriangle size={48} style={{ marginBottom: '10px' }} />
                    <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>Imagem Não Encontrada</strong>
                    <span style={{ fontSize: '0.8rem' }}>Não foi possível carregar a carta do dia <strong>{selectedDate}</strong>.<br />Certifique-se de que os arquivos do ano estão na pasta local e linkados no diretório public.</span>
                  </div>
                ) : (
                  <img 
                    src={imageSrc || undefined} 
                    alt={`Carta Sinótica INMET - ${selectedDate}`} 
                    onError={handleImageError}
                    onClick={() => imageSrc && setFullscreenImage(imageSrc)}
                    style={{ maxWidth: '100%', maxHeight: '420px', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', cursor: 'pointer' }} 
                  />
                )
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Selecione uma data para carregar a Carta Sinótica correspondente.</div>
              )
            ) : (
              <img 
                src="/resultado_debug_inmet.jpg?v=2" 
                alt="Gabarito de Detecção da IA"
                onClick={() => setFullscreenImage("/resultado_debug_inmet.jpg?v=2")}
                style={{ maxWidth: '100%', maxHeight: '420px', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', cursor: 'pointer' }} 
                onError={(e) => {
                  e.target.style.display = 'none';
                  alert('Não foi possível carregar o arquivo resultado_debug_inmet.jpg no diretório public.');
                }}
              />
            )}
          </div>
        </div>

      </div>

      {fullscreenImage && (
        <div 
          onClick={() => setFullscreenImage(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)', zIndex: 9999,
            display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'zoom-out'
          }}
        >
          <img 
            src={fullscreenImage} 
            style={{ maxWidth: '95%', maxHeight: '95%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.8)' }} 
            alt="Carta Sinótica Expandida" 
          />
          <div style={{ position: 'absolute', top: '20px', right: '30px', color: '#fff', fontSize: '2rem', fontWeight: 'bold' }}>&times;</div>
        </div>
      )}

      {/* Row 3: Statistics (Left) & Audit History (Right) */}
      <div className="responsive-grid-two-cols">
        
        {/* Statistical Overview (Scientific Publication Standards) */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h4 style={{ color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Microscope size={20} /> Métricas de Desempenho e Matriz de Confusão
          </h4>
          {statistics.total === 0 ? (
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', padding: '60px 0', textAlign: 'center' }}>
              Nenhum dado auditado disponível para gerar a análise estatística.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* KPIs */}
              <div className="responsive-grid-three-kpis">
                <div style={{ background: 'var(--bg-card-alt)', padding: '14px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 'bold' }}>Amostras (N)</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '4px' }}>{statistics.total}</div>
                </div>
                <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.1)', padding: '14px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 'bold' }}>Acurácia Geral</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#10b981', marginTop: '4px' }}>{statistics.accuracy.toFixed(1)}%</div>
                </div>
                <div style={{ background: 'rgba(244, 63, 94, 0.05)', border: '1px solid rgba(244, 63, 94, 0.1)', padding: '14px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ color: '#f43f5e', fontSize: '0.8rem', fontWeight: 'bold' }}>Divergências</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#f43f5e', marginTop: '4px' }}>{statistics.errors}</div>
                </div>
              </div>

              {/* Confusion Matrix Table */}
              <div>
                <h5 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 'bold' }}>Matriz de Confusão (Observado vs Previsto)</h5>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '8px', borderBottom: '2px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', textAlign: 'left', fontWeight: 'bold' }}>Observado \ Previsto</th>
                        {Object.keys(GLOSSARIO).map(m => (
                          <th key={m} style={{ padding: '8px', borderBottom: '2px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', textAlign: 'center', fontWeight: 'bold' }}>{m}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(statistics.confusionMatrix).map(([actual, row]) => (
                        <tr key={actual} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                          <td style={{ padding: '8px', color: 'var(--text-primary)', fontWeight: 'bold' }}>{actual}</td>
                          {Object.entries(row).map(([predicted, count]) => {
                            const isDiagonal = actual === predicted
                            let cellBg = 'transparent'
                            if (count > 0) {
                              const opacity = statistics.maxMatrixVal > 0 ? (count / statistics.maxMatrixVal) * 0.8 + 0.15 : 0.15
                              cellBg = isDiagonal ? `rgba(16, 185, 129, ${opacity})` : `rgba(244, 63, 94, ${opacity})`
                            }
                            return (
                              <td 
                                key={predicted}
                                style={{
                                  padding: '8px',
                                  textAlign: 'center',
                                  backgroundColor: cellBg,
                                  border: '1px solid rgba(255,255,255,0.03)',
                                  color: count > 0 ? 'var(--text-primary)' : 'var(--border-light)',
                                  fontWeight: count > 0 ? '600' : 'normal'
                                }}
                              >
                                {count}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Accuracy by region (Scientific layout) */}
              <div style={{ height: '220px', marginTop: '10px' }} id="chart-acuracia-regiao">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h5 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '0.85rem', fontWeight: 'bold' }}>Acurácia Relativa por Região Geográfica (%)</h5>
                  <button onClick={() => downloadChartAsPng('chart-acuracia-regiao', 'acuracia-regiao')} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Download size={14} /> Baixar PNG
                  </button>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statistics.regionAcc} margin={{ top: 15, right: 5, left: -25, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke='var(--border)' />
                    <XAxis 
                      dataKey="name" 
                      stroke='var(--text-secondary)' 
                      fontSize={11} 
                      label={{ value: 'Regiões', position: 'insideBottom', offset: -10, fill: 'var(--text-muted)', fontSize: 11 }}
                    />
                    <YAxis 
                      stroke='var(--text-secondary)' 
                      fontSize={11} 
                      domain={[0, 100]} 
                      label={{ value: 'Acurácia (%)', angle: -90, position: 'insideLeft', offset: 10, fill: 'var(--text-muted)', fontSize: 11 }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--text-primary)' }}
                    />
                    <Bar isAnimationActive={false} dataKey="Acurácia" fill="rgba(99, 102, 241, 0.85)" radius={[4, 4, 0, 0]} maxBarSize={45}>
                      <LabelList dataKey="Acurácia" position="top" fill='var(--text-primary)' fontSize={11} formatter={(val) => `${val}%`} style={{ fontWeight: '600' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

            </div>
          )}
        </div>

        {/* Historical Audit Logs */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <h4 style={{ color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ScrollText size={20} /> Histórico de Auditorias e Correções
          </h4>
          {auditedRecords.length === 0 ? (
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', padding: '60px 0', textAlign: 'center', margin: 'auto' }}>
              Nenhuma correção salva no banco de dados.
            </div>
          ) : (
            <div className="premium-table-wrapper" style={{ maxHeight: '420px', overflowY: 'auto', flexGrow: 1 }}>
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Região</th>
                    <th>Massa IA</th>
                    <th>Massa Real</th>
                    <th>Resultado</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {auditedRecords.map(row => {
                    const iaCorrectVal = row.massa_de_ar_ia === row.massa_de_ar_final ? 'Sim' : 'Não'
                    return (
                      <tr key={`${row.data_exibicao}-${row.regiao}`}>
                        <td style={{ fontWeight: '600' }}>{row.data_exibicao}</td>
                        <td>{row.regiao}</td>
                        <td style={{ color: GLOSSARIO[row.massa_de_ar_ia]?.cor }}>{row.massa_de_ar_ia}</td>
                        <td style={{ color: GLOSSARIO[row.massa_de_ar_final]?.cor, fontWeight: 'bold' }}>{row.massa_de_ar_final}</td>
                        <td>
                          <span 
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: iaCorrectVal === 'Sim' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                              color: iaCorrectVal === 'Sim' ? '#10b981' : '#f43f5e',
                              fontWeight: '600',
                              fontSize: '0.8rem'
                            }}
                          >
                            {iaCorrectVal === 'Sim' ? 'Acerto' : 'Erro'}
                          </span>
                        </td>
                        <td>
                          <button 
                            onClick={() => handleResetRecord(row.data_exibicao, row.regiao, row.massa_de_ar_ia)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--danger)',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              transition: 'var(--transition-smooth)'
                            }}
                            className="btn-reset"
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Trash2 size={14} /> Resetar</span>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

    </div>
  )
}
