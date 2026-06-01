import { useEffect, useState, useMemo } from 'react'
import { Cloud, Sun, Moon, User, BarChart2, Search, BookOpen, RefreshCw, Scale, FlaskConical, BarChart3, Map, Calendar, Download, FileText, Bookmark } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import BrazilMap, { GLOSSARIO } from './BrazilMap'
import ClimaCharts from './ClimaCharts'
import Glossary from './Glossary'
import AuditPanel from './AuditPanel'
import DataExplorer from './DataExplorer'
import Login from './Login'
import UserProfile from './UserProfile'
import Plotly from 'plotly.js-dist-min'
import createPlotlyComponent from 'react-plotly.js/factory'
const Plot = createPlotlyComponent.default ? createPlotlyComponent.default(Plotly) : createPlotlyComponent(Plotly)
import { Treemap, Tooltip } from 'recharts'

const CustomizedTreemapContent = (props) => {
  const { x, y, width, height, index, name, depth, value, color } = props;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: depth === 2 ? color : 'rgba(15, 23, 42, 0.4)',
          stroke: 'var(--bg-primary)',
          strokeWidth: depth === 1 ? 2.5 : 1,
          strokeOpacity: 0.8,
        }}
      />
      {depth === 2 && width > 45 && height > 25 ? (
        <text
          x={x + 6}
          y={y + 16}
          fill='var(--text-primary)'
          fontSize={10}
          fontWeight="700"
          style={{ pointerEvents: 'none', fontFamily: 'Outfit' }}
        >
          {name}
        </text>
      ) : null}
      {depth === 2 && width > 45 && height > 40 ? (
        <text
          x={x + 6}
          y={y + 30}
          fill="rgba(255,255,255,0.7)"
          fontSize={9}
          style={{ pointerEvents: 'none', fontFamily: 'Inter' }}
        >
          {value} {value === 1 ? 'dia' : 'dias'}
        </text>
      ) : null}
      {depth === 1 && width > 80 && height > 35 ? (
        <text
          x={x + width / 2}
          y={y + height - 12}
          textAnchor="middle"
          fill='var(--border-light)'
          fontSize={12}
          fontWeight="bold"
          style={{ pointerEvents: 'none', fontFamily: 'Outfit', letterSpacing: '0.05em' }}
        >
          {name}
        </text>
      ) : null}
    </g>
  );
};


export default function ClimaDashboard() {
  const { role, session, signOut } = useAuth()
  const [allData, setAllData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Sidebar Filter States
  const [selectedYears, setSelectedYears] = useState([])
  const [selectedRegions, setSelectedRegions] = useState([])
  const [selectedSeasons, setSelectedSeasons] = useState([])
  const [selectedMasses, setSelectedMasses] = useState([])
  const [textSearch, setTextSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Selected Row for Daily Interactive Map (Tab 3)
  const [dailySelectedDate, setDailySelectedDate] = useState('')

  // Active Tab
  const [activeTab, setActiveTab] = useState('espacial')

  // Save Analysis Modal States
  const [showSaveAnalysisModal, setShowSaveAnalysisModal] = useState(false)
  const [saveTitle, setSaveTitle] = useState('')
  const [saveDescription, setSaveDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Modais de Login/Perfil
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)

  // Light / Dark theme
  const [theme, setTheme] = useState(() => localStorage.getItem('climaweb-theme') || 'dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('climaweb-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  // Real-time local browser RAM metrics (no server connection)
  const [metricsHistory, setMetricsHistory] = useState([])

  useEffect(() => {
    const fetchRam = () => {
      try {
        const mem = performance.memory
        const usedMb = mem ? parseFloat((mem.usedJSHeapSize / (1024 * 1024)).toFixed(1)) : 0
        const totalMb = mem ? parseFloat((mem.totalJSHeapSize / (1024 * 1024)).toFixed(1)) : 0

        const newPoint = {
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          'Heap Ativo (MB)': usedMb,
          'Heap Alocado (MB)': totalMb,
          supported: !!mem
        }

        setMetricsHistory(prev => {
          const updated = [...prev, newPoint]
          if (updated.length > 15) updated.shift()
          return updated
        })
      } catch (_) {
        // performance.memory not available in this browser
        setMetricsHistory(prev => {
          if (prev.length > 0) return prev
          return [{ timestamp: '--', 'Heap Ativo (MB)': 0, 'Heap Alocado (MB)': 0, supported: false }]
        })
      }
    }

    fetchRam()
    const interval = setInterval(fetchRam, 1500)
    return () => clearInterval(interval)
  }, [])

  // Fetch all records from Supabase in chunks of 1000
  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      let dataList = []
      let start = 0
      const chunkSize = 1000
      let keepFetching = true

      while (keepFetching) {
        const { data, error } = await supabase
          .from('clima_registros')
          .select('*')
          .range(start, start + chunkSize - 1)
          .order('data_exibicao', { ascending: false })

        if (error) throw error

        if (data && data.length > 0) {
          dataList = [...dataList, ...data]
          if (data.length < chunkSize) {
            keepFetching = false
          } else {
            start += chunkSize
          }
        } else {
          keepFetching = false
        }
      }

      setAllData(dataList)
    } catch (err) {
      console.error('Erro ao buscar dados do clima:', err)
      setError(`Erro ao buscar dados do Supabase: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [refreshTrigger])

  const handleRefresh = async () => {
    setRefreshTrigger(prev => prev + 1)
  }



  // Extract unique filter options from the full dataset
  const filterOptions = useMemo(() => {
    const years = new Set()
    const regions = new Set()
    const seasons = new Set()
    const masses = new Set()

    allData.forEach(item => {
      if (item.data_exibicao) {
        const y = new Date(item.data_exibicao).getUTCFullYear()
        if (y && !isNaN(y)) years.add(y)
      }
      if (item.regiao) regions.add(item.regiao)
      if (item.estacao) seasons.add(item.estacao)
      if (item.massa_de_ar_final) masses.add(item.massa_de_ar_final)
    })

    return {
      years: [...years].sort((a, b) => b - a),
      regions: [...regions].sort(),
      seasons: [...seasons].sort(),
      masses: [...masses].sort()
    }
  }, [allData])

  // Reset Filters
  const handleResetFilters = () => {
    setSelectedYears([])
    setSelectedRegions([])
    setSelectedSeasons([])
    setSelectedMasses([])
    setTextSearch('')
    setStartDate('')
    setEndDate('')
  }

  // Load Filters from Saved Analysis
  const handleLoadAnalysis = (filters) => {
    if (!filters) return
    setSelectedYears(filters.years || [])
    setSelectedRegions(filters.regions || [])
    setSelectedSeasons(filters.seasons || [])
    setSelectedMasses(filters.masses || [])
    setTextSearch(filters.textSearch || '')
    setStartDate(filters.startDate || '')
    setEndDate(filters.endDate || '')
  }

  // Save Analysis Form Handler
  const handleSaveAnalysisSubmit = async (e) => {
    e.preventDefault()
    if (!saveTitle) return
    setIsSaving(true)
    try {
      const filters = {
        years: selectedYears,
        regions: selectedRegions,
        seasons: selectedSeasons,
        masses: selectedMasses,
        textSearch,
        startDate,
        endDate
      }
      
      const { error } = await supabase
        .from('user_saved_analyses')
        .insert([{
          user_id: session?.user?.id,
          title: saveTitle,
          description: saveDescription,
          filters: filters
        }])

      if (error) throw error
      
      setShowSaveAnalysisModal(false)
      setSaveTitle('')
      setSaveDescription('')
      alert('Análise salva com sucesso! Você pode acessá-la no seu Perfil.')
    } catch (err) {
      console.error(err)
      alert('Erro ao salvar análise.')
    } finally {
      setIsSaving(false)
    }
  }

  // Filter Data Dynamically
  const filteredData = useMemo(() => {
    return allData.filter(item => {
      // Filter by Start Date
      if (startDate && item.data_exibicao < startDate) return false
      // Filter by End Date
      if (endDate && item.data_exibicao > endDate) return false
      // Filter by Years
      if (selectedYears.length > 0) {
        const itemYear = new Date(item.data_exibicao).getUTCFullYear()
        if (!selectedYears.includes(itemYear)) return false
      }
      // Filter by Regions
      if (selectedRegions.length > 0 && !selectedRegions.includes(item.regiao)) return false
      // Filter by Seasons
      if (selectedSeasons.length > 0 && !selectedSeasons.includes(item.estacao)) return false
      // Filter by Air Masses
      if (selectedMasses.length > 0 && !selectedMasses.includes(item.massa_de_ar_final)) return false
      // Filter by Text Search
      if (textSearch && item.descricao) {
        if (!item.descricao.toLowerCase().includes(textSearch.toLowerCase())) return false
      }
      return true
    })
  }, [allData, startDate, endDate, selectedYears, selectedRegions, selectedSeasons, selectedMasses, textSearch])

  // Min and max limits for the entire dataset
  const dateLimitsAll = useMemo(() => {
    if (allData.length === 0) return { min: '', max: '' }
    const dates = allData.map(item => item.data_exibicao).filter(Boolean).sort()
    return {
      min: dates[0],
      max: dates[dates.length - 1]
    }
  }, [allData])

  // Min and max limits for the filtered dataset (Tab 3 daily selection)
  const uniqueFilteredDates = useMemo(() => {
    return [...new Set(filteredData.map(item => item.data_exibicao))].filter(Boolean).sort((a, b) => b.localeCompare(a))
  }, [filteredData])

  const dateLimitsFiltered = useMemo(() => {
    if (uniqueFilteredDates.length === 0) return { min: '', max: '' }
    return {
      min: uniqueFilteredDates[uniqueFilteredDates.length - 1],
      max: uniqueFilteredDates[0]
    }
  }, [uniqueFilteredDates])

  // Set initial daily selected date when filteredData changes
  useEffect(() => {
    if (filteredData.length > 0) {
      const dates = [...new Set(filteredData.map(item => item.data_exibicao))].filter(Boolean)
      if (dates.length > 0 && !dates.includes(dailySelectedDate)) {
        setDailySelectedDate(dates[0])
      }
    } else {
      setDailySelectedDate('')
    }
  }, [filteredData, dailySelectedDate])

  // KPIs
  const kpis = useMemo(() => {
    if (filteredData.length === 0) return { total: 0, dominant: 'N/A', pctDominant: 0, validatedCount: 0, pctValidated: 0, iaErrorCount: 0 }

    const total = filteredData.length

    // Dominant Air Mass
    const massCounts = {}
    let validatedCount = 0
    let iaErrorCount = 0

    filteredData.forEach(item => {
      const mass = item.massa_de_ar_final || 'Não Informada'
      massCounts[mass] = (massCounts[mass] || 0) + 1

      if (item.status_informacao && !item.status_informacao.includes('100% IA')) {
        validatedCount++
      }
      if (item.status_informacao === 'Corrigido Humano (IA Errou)') {
        iaErrorCount++
      }
    })

    let dominant = 'Não Informada'
    let maxCount = 0
    Object.entries(massCounts).forEach(([mass, count]) => {
      if (count > maxCount) {
        maxCount = count
        dominant = mass
      }
    })

    const pctDominant = total > 0 ? (maxCount / total) * 100 : 0
    const pctValidated = total > 0 ? (validatedCount / total) * 100 : 0

    return {
      total,
      dominant,
      pctDominant,
      validatedCount,
      pctValidated,
      iaErrorCount
    }
  }, [filteredData])

  // Mode (most frequent) air mass per region in the current filtered dataset for spatial map coloring
  const spatialRegionMap = useMemo(() => {
    const regionMasses = {}
    // Group by region
    filteredData.forEach(item => {
      const reg = item.regiao
      const mass = item.massa_de_ar_final
      if (!reg || !mass) return
      if (!regionMasses[reg]) regionMasses[reg] = {}
      regionMasses[reg][mass] = (regionMasses[reg][mass] || 0) + 1
    })

    // Find the most frequent mass for each region
    const result = {}
    Object.entries(regionMasses).forEach(([reg, counts]) => {
      let maxCount = 0
      let topMass = 'Não Informada'
      Object.entries(counts).forEach(([mass, count]) => {
        if (count > maxCount) {
          maxCount = count
          topMass = mass
        }
      })
      result[reg] = topMass
    })

    return result
  }, [filteredData])

  // Bar Chart data for Tab 1 (Air Mass occurrences counts)
  const barChartSpatialData = useMemo(() => {
    const counts = {}
    Object.keys(GLOSSARIO).forEach(m => {
      counts[m] = 0
    })

    filteredData.forEach(item => {
      const mass = item.massa_de_ar_final || 'Não Informada'
      if (counts[mass] !== undefined) counts[mass]++
    })

    return Object.entries(counts).map(([mass, count]) => ({
      name: mass,
      Dias: count,
      fill: GLOSSARIO[mass]?.cor || 'var(--text-secondary)'
    })).filter(item => item.Dias > 0).sort((a, b) => a.Dias - b.Dias) // sort ascending for horizontal bar chart
  }, [filteredData])

  const plotlySpatialLayout = useMemo(() => ({
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    font: { color: '#cbd5e1', family: 'Inter, sans-serif' },
    margin: { t: 10, r: 20, l: 45, b: 40 },
    xaxis: { gridcolor: 'rgba(255,255,255,0.1)', tickfont: { color: '#94a3b8' }, title: 'Frequência (Dias)' },
    yaxis: { gridcolor: 'rgba(255,255,255,0.1)', tickfont: { color: '#94a3b8' } },
    hovermode: 'closest'
  }), [])

  const treemapData = useMemo(() => {
    const regionMap = {}
    filteredData.forEach(item => {
      const reg = item.regiao
      const mass = item.massa_de_ar_final || 'Não Informada'
      if (!reg) return
      if (!regionMap[reg]) regionMap[reg] = {}
      regionMap[reg][mass] = (regionMap[reg][mass] || 0) + 1
    })

    const labels = []
    const parents = []
    const values = []
    const colors = []

    let totalGeral = 0

    Object.entries(regionMap).forEach(([region, massCounts]) => {
      const regionTotal = Object.values(massCounts).reduce((a, b) => a + b, 0)
      totalGeral += regionTotal
      
      labels.push(region)
      parents.push("Brasil")
      values.push(regionTotal)
      colors.push('rgba(15, 23, 42, 0.4)')

      Object.entries(massCounts).forEach(([mass, count]) => {
        labels.push(`${mass} (${region})`)
        parents.push(region)
        values.push(count)
        colors.push(GLOSSARIO[mass]?.cor || 'var(--text-secondary)')
      })
    })

    if (labels.length > 0) {
      labels.push("Brasil")
      parents.push("")
      values.push(totalGeral)
      colors.push('transparent')
    }

    return [{
      type: "treemap",
      labels: labels,
      parents: parents,
      values: values,
      textinfo: "label+value+percent parent",
      hoverinfo: "label+value+percent parent",
      marker: { colors: colors },
      branchvalues: "total",
      tiling: { packing: "squarify" }
    }]
  }, [filteredData])

  // Daily map records for Tab 3
  const dailyMapData = useMemo(() => {
    if (!dailySelectedDate) return {}
    const dayRecords = filteredData.filter(item => item.data_exibicao === dailySelectedDate)
    const mapping = {}
    dayRecords.forEach(item => {
      mapping[item.regiao] = item.massa_de_ar_final
    })
    return mapping
  }, [filteredData, dailySelectedDate])

  // Specific selected row details for Tab 3
  const dailySelectedRowDetails = useMemo(() => {
    if (!dailySelectedDate) return []
    return filteredData.filter(item => item.data_exibicao === dailySelectedDate)
  }, [filteredData, dailySelectedDate])

  // Helper to handle multiselect click styling
  const handleToggleFilter = (item, selectedList, setSelectedList) => {
    if (selectedList.includes(item)) {
      setSelectedList(selectedList.filter(x => x !== item))
    } else {
      setSelectedList([...selectedList, item])
    }
  }

  // Export CSV functions
  const handleExportCSV = (includeValidactions) => {
    if (filteredData.length === 0) return

    let dataToExport = []
    if (includeValidactions) {
      dataToExport = filteredData
    } else {
      // Revert validations: final_mass becomes ia_mass
      dataToExport = filteredData.map(item => ({
        ...item,
        massa_de_ar_final: item.massa_de_ar_ia,
        status_informacao: '100% IA (Revertido)'
      }))
    }

    // Convert to CSV string
    const headers = ['id', 'data_exibicao', 'regiao', 'massa_de_ar_ia', 'massa_de_ar_final', 'status_informacao', 'descricao', 'estacao', 'data_verificacao']
    const csvRows = []
    csvRows.push(headers.join(','))

    dataToExport.forEach(item => {
      const values = headers.map(header => {
        const val = item[header] || ''
        const escaped = String(val).replace(/"/g, '""')
        return `"${escaped}"`
      })
      csvRows.push(values.join(','))
    })

    const csvContent = '\uFEFF' + csvRows.join('\n') // UTF-8 BOM
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', includeValidactions ? 'clima_dados_validados.csv' : 'clima_dados_originais_ia.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="dashboard-grid">
      
      {/* Sidebar Filter Panel */}
      <aside className="dashboard-sidebar">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '14px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}><Cloud size={18} style={{ color: 'var(--primary)' }} /> ClimaWeb</h2>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Painel Climatológico</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-end' }}>

            <button onClick={toggleTheme} className="theme-toggle-btn" title="Alternar tema" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {theme === 'dark' ? <Sun size={12} /> : <Moon size={12} />}
              {theme === 'dark' ? 'Claro' : 'Escuro'}
            </button>
          </div>
        </div>

        <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '14px' }}>
          <h3 style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Filtros de Análise
          </h3>

          <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <button onClick={handleRefresh} className="btn-secondary" style={{ flex: 1, padding: '7px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <RefreshCw size={14} /> Atualizar
            </button>
            <button onClick={handleResetFilters} className="btn-secondary" style={{ flex: 1, padding: '7px', fontSize: '0.75rem' }}>
              Limpar
            </button>
            {session && (
              <button 
                onClick={() => setShowSaveAnalysisModal(true)} 
                className="btn-primary" 
                style={{ flex: '1 1 100%', padding: '7px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '4px' }}
              >
                <Bookmark size={14} /> Salvar Filtros
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Year filter */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ano(s)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', maxHeight: '90px', overflowY: 'auto' }}>
                {filterOptions.years.map(y => {
                  const isActive = selectedYears.includes(y)
                  return (
                    <button
                      key={y}
                      onClick={() => handleToggleFilter(y, selectedYears, setSelectedYears)}
                      style={{
                        padding: '3px 8px',
                        fontSize: '0.75rem',
                        borderRadius: '4px',
                        border: '1px solid',
                        borderColor: isActive ? 'var(--primary)' : 'var(--border)',
                        backgroundColor: isActive ? 'var(--primary-muted)' : 'transparent',
                        color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontWeight: isActive ? '600' : '400'
                      }}
                    >
                      {y}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Intervalo de Datas filter (Calendário) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Período</label>
              <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="premium-input"
                  style={{ fontSize: '0.72rem', padding: '5px 7px', flex: 1, minWidth: 0 }}
                  min={dateLimitsAll.min}
                  max={dateLimitsAll.max}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>a</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="premium-input"
                  style={{ fontSize: '0.72rem', padding: '5px 7px', flex: 1, minWidth: 0 }}
                  min={dateLimitsAll.min}
                  max={dateLimitsAll.max}
                />
              </div>
            </div>

            {/* Region filter */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Região(ões)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {filterOptions.regions.map(r => {
                  const isActive = selectedRegions.includes(r)
                  return (
                    <button key={r}
                      onClick={() => handleToggleFilter(r, selectedRegions, setSelectedRegions)}
                      style={{
                        padding: '3px 8px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid',
                        borderColor: isActive ? 'var(--primary)' : 'var(--border)',
                        backgroundColor: isActive ? 'var(--primary-muted)' : 'transparent',
                        color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                        cursor: 'pointer', fontWeight: isActive ? '600' : '400'
                      }}
                    >{r}</button>
                  )
                })}
              </div>
            </div>

            {/* Season filter */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Estação(ões)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {filterOptions.seasons.map(s => {
                  const isActive = selectedSeasons.includes(s)
                  return (
                    <button key={s}
                      onClick={() => handleToggleFilter(s, selectedSeasons, setSelectedSeasons)}
                      style={{
                        padding: '3px 8px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid',
                        borderColor: isActive ? 'var(--primary)' : 'var(--border)',
                        backgroundColor: isActive ? 'var(--primary-muted)' : 'transparent',
                        color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                        cursor: 'pointer', fontWeight: isActive ? '600' : '400'
                      }}
                    >{s}</button>
                  )
                })}
              </div>
            </div>

            {/* Air Mass filter */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Massa(s) de Ar</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {filterOptions.masses.map(m => {
                  const isActive = selectedMasses.includes(m)
                  return (
                    <button key={m}
                      onClick={() => handleToggleFilter(m, selectedMasses, setSelectedMasses)}
                      style={{
                        padding: '3px 8px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid',
                        borderColor: GLOSSARIO[m]?.cor || 'var(--border)',
                        backgroundColor: isActive ? `${GLOSSARIO[m]?.cor || '#3b82f6'}22` : 'transparent',
                        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                        cursor: 'pointer', fontWeight: isActive ? '600' : '400'
                      }}
                    >{m}</button>
                  )
                })}
              </div>
            </div>

            {/* Text Search */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Busca Textual</label>
              <input
                type="text"
                placeholder="frente fria, calor..."
                value={textSearch}
                onChange={(e) => setTextSearch(e.target.value)}
                className="premium-input"
                style={{ fontSize: '0.8rem' }}
              />
            </div>

          </div>
        </div>



        <div className="unb-footer">
          <div className="unb-logos-row">
            <div className="unb-logo-wrap">
              <img src="/unb_logo.png" alt="Logo UnB — Universidade de Brasília" />
            </div>
            <div className="unb-logo-wrap lcgea-logo-wrap">
              <img src="/lcgea_logo.png" alt="Logo LCGEA" />
            </div>
          </div>
          <div className="unb-footer-text">
            <strong>Universidade de Brasília</strong>
            LCGEA · Laboratório de Climatologia<br />
            Geográfica<br />
            Pesquisadores: Rafael Guedes e João Vitor · PIBIC
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ display: 'flex', flexDirection: 'column', gap: '0', minWidth: 0, backgroundColor: 'var(--bg-primary)' }}>
        
        {/* Header bar */}
        <div style={{ padding: '14px 28px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '2px', fontWeight: 700 }}>Painel Climatológico PIBIC — LCGEA / UnB</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              Análise sinótica · Universidade de Brasília · {filteredData.length} registros filtrados
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', borderRight: '1px solid var(--border)', paddingRight: '10px' }}>
              {theme === 'dark' ? <Moon size={14} color="#3b82f6" /> : <Sun size={14} color="#f59e0b" />}
              {theme === 'dark' ? 'Modo Escuro' : 'Modo Claro'}
            </span>
            <button onClick={toggleTheme} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.78rem' }}>
              {theme === 'dark' ? 'Mudar para Claro' : 'Mudar para Escuro'}
            </button>
            {role === 'guest' ? (
              <button onClick={() => setShowLoginModal(true)} className="btn-primary" style={{ padding: '6px 14px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <User size={14} /> Entrar
              </button>
            ) : (
              <>
                <button 
                  onClick={() => setShowProfileModal(true)} 
                  className="btn-primary" 
                  style={{ padding: '6px 14px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <User size={14} /> Minhas Análises
                </button>
              </>
            )}
          </div>
        </div>

        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* KPIs row */}
        <div className="metrics-row">
          
          <div className="glass-card metric-card">
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total de Registros</span>
              <div className="metric-val">{kpis.total.toLocaleString()}</div>
            </div>
            <div className="metric-delta neutral">Filtrados na base</div>
          </div>

          <div className="glass-card metric-card" style={{ borderLeftColor: GLOSSARIO[kpis.dominant]?.cor || 'var(--primary)' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Massa Dominante</span>
              <div className="metric-val" style={{ color: GLOSSARIO[kpis.dominant]?.cor, fontSize: '1.3rem' }}>{kpis.dominant}</div>
            </div>
            <div className="metric-delta positive">{kpis.pctDominant.toFixed(1)}% do período</div>
          </div>

          <div className="glass-card metric-card" style={{ borderLeftColor: 'var(--success)' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Dados Auditados</span>
              <div className="metric-val">{kpis.validatedCount}</div>
            </div>
            <div className="metric-delta positive">{kpis.pctValidated.toFixed(1)}% da base</div>
          </div>

          <div className="glass-card metric-card" style={{ borderLeftColor: 'var(--danger)' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Divergências (IA Errou)</span>
              <div className="metric-val" style={{ color: 'var(--danger)' }}>{kpis.iaErrorCount}</div>
            </div>
            <div className="metric-delta negative">Correções salvas</div>
          </div>

        </div>

        {/* Tab System Header */}
        <div className="tab-container">
          <button 
            onClick={() => setActiveTab('espacial')} 
            className={`tab-button ${activeTab === 'espacial' ? 'active' : ''}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <BarChart2 size={16} /> Distribuição Espacial
          </button>
          <button 
            onClick={() => setActiveTab('sazonalidade')} 
            className={`tab-button ${activeTab === 'sazonalidade' ? 'active' : ''}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <BarChart3 size={16} /> Sazonalidade
          </button>
          <button 
            onClick={() => setActiveTab('diario')} 
            className={`tab-button ${activeTab === 'diario' ? 'active' : ''}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Search size={16} /> Relatório Interativo Diário
          </button>
          <button 
            onClick={() => setActiveTab('guia')} 
            className={`tab-button ${activeTab === 'guia' ? 'active' : ''}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <BookOpen size={16} /> Guia de Massas de Ar
          </button>
          <button 
            onClick={() => setActiveTab('auditoria')} 
            className={`tab-button ${activeTab === 'auditoria' ? 'active' : ''}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Scale size={16} /> Auditoria Pública
          </button>
          <button 
            onClick={() => setActiveTab('explorer')} 
            className={`tab-button ${activeTab === 'explorer' ? 'active' : ''}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <FlaskConical size={16} /> Explorador de Dados
          </button>

        </div>

        {/* Loading Indicator */}
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ display: 'inline-block', width: '24px', height: '24px', border: '2px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '12px' }}></div>
            <div style={{ fontSize: '0.875rem' }}>Carregando registros do Supabase...</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : error ? (
          <div style={{ padding: '20px', color: 'var(--danger)', borderLeft: '3px solid var(--danger)', background: 'rgba(239,68,68,0.05)', borderRadius: 'var(--radius)', fontSize: '0.875rem' }}>
            <strong>Erro ao carregar dados</strong>
            <p style={{ marginTop: '6px', color: 'var(--text-secondary)' }}>{error}</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
            Nenhum registro encontrado para os filtros aplicados.
          </div>
        ) : (
          <div>

            {/* TAB 1: Distribuição Espacial */}
            {activeTab === 'espacial' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="responsive-grid-two-cols">
                  <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }} id="chart-contagem-dias">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h4 style={{ color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><BarChart2 size={18} /> Contagem de Dias por Massa de Ar</h4>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '24px' }}>Dias totais em que a massa esteve ativa (filtros aplicados)</p>
                      </div>
                    </div>
                    
                    <div style={{ width: '100%', height: '320px', marginTop: 'auto' }}>
                      <Plot
                        data={[{
                          type: 'bar',
                          x: barChartSpatialData.map(d => d.Dias),
                          y: barChartSpatialData.map(d => d.name),
                          orientation: 'h',
                          marker: { color: barChartSpatialData.map(d => d.fill) },
                          text: barChartSpatialData.map(d => String(d.Dias)),
                          textposition: 'auto',
                          hoverinfo: 'y+text'
                        }]}
                        layout={{
                          ...plotlySpatialLayout,
                          autosize: true
                        }}
                        style={{ width: '100%', height: '100%' }}
                        useResizeHandler={true}
                        config={{ responsive: true, displaylogo: false }}
                      />
                    </div>
                  </div>

                  <BrazilMap regionMassMap={spatialRegionMap} title="Geral (Moda por Região)" />
                </div>
                
                {/* Treemap Section */}
                <div className="glass-card" style={{ padding: '24px' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <h4 style={{ color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><Map size={18} /> Proporção Geográfica (Treemap)</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Mapeamento hierárquico das massas de ar por região do Brasil</p>
                  </div>
                  <div style={{ width: '100%', height: '400px' }}>
                    <Plot
                      data={treemapData}
                      layout={{
                        ...plotlySpatialLayout,
                        margin: { t: 10, l: 10, r: 10, b: 10 },
                        autosize: true
                      }}
                      style={{ width: '100%', height: '100%' }}
                      useResizeHandler={true}
                      config={{ responsive: true, displaylogo: false }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Sazonalidade (Charts) */}
            {activeTab === 'sazonalidade' && (
              <ClimaCharts filteredData={filteredData} />
            )}

            {/* TAB 3: Explorador de Dados (Graphic Walker) */}
            {activeTab === 'explorer' && (
              <DataExplorer filteredData={filteredData} role={role} />
            )}

            {/* TAB 4: Relatório Diário (Interactive Table + Map) */}
            {activeTab === 'diario' && (
              <div className="responsive-grid-two-cols-asymmetric">
                
                <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <h4 style={{ color: 'var(--text-primary)', marginBottom: '6px' }}>📅 Laboratório Sinótico Diário</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      Selecione uma data no calendário ou na tabela abaixo para carregar as massas de ar correspondentes no mapa ao lado.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '180px' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Selecione a Data (Calendário):</label>
                      <input 
                        type="date"
                        value={dailySelectedDate} 
                        onChange={(e) => {
                          if (e.target.value) {
                            setDailySelectedDate(e.target.value)
                          }
                        }} 
                        className="premium-input"
                        style={{ width: '100%', padding: '8px 12px' }}
                        min={dateLimitsFiltered.min}
                        max={dateLimitsFiltered.max}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flex: 1.2, minWidth: '220px' }}>
                      <button 
                        onClick={() => handleExportCSV(true)} 
                        className="btn-primary" 
                        style={{ padding: '10px 12px', fontSize: '0.8rem', flex: 1 }}
                      >
                        📥 CSV Validada
                      </button>
                      <button 
                        onClick={() => handleExportCSV(false)} 
                        className="btn-secondary" 
                        style={{ padding: '10px 12px', fontSize: '0.8rem', flex: 1 }}
                      >
                        📥 CSV IA
                      </button>
                    </div>
                  </div>

                  <div className="premium-table-wrapper" style={{ maxHeight: '480px', overflowY: 'auto' }}>
                    <table className="premium-table">
                      <thead>
                        <tr>
                          <th>Data Exibição</th>
                          <th>Região</th>
                          <th>Massa Final</th>
                          <th>Estação</th>
                          <th>Status Validação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredData.map(item => {
                          const isSelected = item.data_exibicao === dailySelectedDate
                          return (
                            <tr 
                              key={`${item.data_exibicao}-${item.regiao}`}
                              className={isSelected ? 'selected' : ''}
                              onClick={() => setDailySelectedDate(item.data_exibicao)}
                              style={{ cursor: 'pointer' }}
                            >
                              <td style={{ fontWeight: 'bold' }}>{item.data_exibicao}</td>
                              <td>{item.regiao}</td>
                              <td style={{ color: GLOSSARIO[item.massa_de_ar_final]?.cor, fontWeight: '600' }}>{item.massa_de_ar_final}</td>
                              <td>{item.estacao}</td>
                              <td>
                                <span style={{
                                  fontSize: '0.75rem',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: item.status_informacao && item.status_informacao.includes('100% IA') ? 'var(--border)' : 'rgba(16, 185, 129, 0.1)',
                                  color: item.status_informacao && item.status_informacao.includes('100% IA') ? 'var(--text-muted)' : '#10b981'
                                }}>
                                  {item.status_informacao || 'Não Validado'}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {dailySelectedDate ? (
                    <>
                      <BrazilMap 
                        regionMassMap={dailyMapData} 
                        title={`Data: ${dailySelectedDate}`} 
                      />
                      
                      {/* Show detail cards for regions on that day */}
                      <div className="glass-card" style={{ padding: '20px' }}>
                        <h4 style={{ color: 'var(--text-primary)', marginBottom: '12px', fontSize: '1rem' }}>📝 Boletim Sinótico - {dailySelectedDate}</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {dailySelectedRowDetails.map(item => (
                            <div 
                              key={item.regiao}
                              style={{
                                borderLeft: `3px solid ${GLOSSARIO[item.massa_de_ar_final]?.cor || 'var(--text-muted)'}`,
                                paddingLeft: '10px',
                                background: 'var(--bg-card-alt)',
                                padding: '8px',
                                borderRadius: '4px'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                <strong>Região {item.regiao}</strong>
                                <span style={{ color: GLOSSARIO[item.massa_de_ar_final]?.cor, fontWeight: 'bold' }}>{item.massa_de_ar_final}</span>
                              </div>
                              {item.descricao && (
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', fontStyle: 'italic' }}>
                                  "{item.descricao}"
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      Selecione um registro na tabela para visualizar o mapa diário interativo.
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB 4: Guia de Massas de Ar */}
            {activeTab === 'guia' && (
              <Glossary />
            )}

            {/* TAB 5: Auditoria */}
            {activeTab === 'auditoria' && (
              <AuditPanel allData={allData} onRefreshData={handleRefresh} role={role} />
            )}



          </div>
        )}

        </div>{/* end padding wrapper */}
      </main>

      {/* Modais */}
      {showLoginModal && (
        <Login onClose={() => setShowLoginModal(false)} />
      )}
      
      {showProfileModal && (
        <UserProfile onClose={() => setShowProfileModal(false)} onLoadAnalysis={handleLoadAnalysis} />
      )}

      {showSaveAnalysisModal && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000,
          display: 'flex', justifyContent: 'center', alignItems: 'center', 
          backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(12px)', padding: '20px'
        }}>
          <div className="glass-card" style={{ padding: '30px', width: '100%', maxWidth: '400px', background: 'rgba(30, 36, 46, 0.85)' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', color: 'var(--text-primary)' }}>Salvar Análise Atual</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Dê um nome para salvar os filtros atuais (Ano, Região, etc) e acessá-los rapidamente pelo seu perfil depois.
            </p>
            <form onSubmit={handleSaveAnalysisSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Título da Análise</label>
                <input 
                  type="text" 
                  value={saveTitle} 
                  onChange={(e) => setSaveTitle(e.target.value)} 
                  required
                  className="premium-input"
                  placeholder="Ex: Seca no NE 2023"
                  style={{ width: '100%', padding: '10px', marginTop: '4px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Descrição Breve (Opcional)</label>
                <input 
                  type="text" 
                  value={saveDescription} 
                  onChange={(e) => setSaveDescription(e.target.value)} 
                  className="premium-input"
                  placeholder="Ex: Avaliação de massas secas..."
                  style={{ width: '100%', padding: '10px', marginTop: '4px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button type="button" onClick={() => setShowSaveAnalysisModal(false)} className="btn-secondary" style={{ flex: 1, padding: '10px' }}>Cancelar</button>
                <button type="submit" disabled={isSaving} className="btn-primary" style={{ flex: 1, padding: '10px' }}>
                  {isSaving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
