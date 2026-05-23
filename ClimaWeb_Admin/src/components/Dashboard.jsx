import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { supabase } from '../supabaseClient'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function Dashboard() {
  const [data, setData] = useState([])
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    // Conecta no backend Python (Porta 5000)
    const socket = io('http://localhost:5000')

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    // Ouve a emissão de métricas e empilha num array para desenhar a linha do tempo
    socket.on('system_metrics', (metrics) => {
      setData((prevData) => {
        const newData = [...prevData, metrics]
        // Mantém apenas os últimos 30 registros na tela para a "cobrinha" andar
        if (newData.length > 30) newData.shift()
        return newData
      })
    })

    return () => socket.disconnect()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div style={{ padding: '40px', backgroundColor: '#121212', color: '#fff', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '20px' }}>
        <h2>🖥️ Monitoramento da Máquina Virtual (Tempo Real)</h2>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <span style={{ color: connected ? '#4CAF50' : '#f44336', fontWeight: 'bold' }}>
            {connected ? '🟢 Backend Online' : '🔴 Backend Offline'}
          </span>
          <button onClick={handleLogout} style={{ padding: '10px 20px', background: '#f44336', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Deslogar Admin</button>
        </div>
      </div>

      <div style={{ marginTop: '40px', height: '350px', background: '#1e1e1e', padding: '20px', borderRadius: '10px' }}>
        <h3 style={{ marginBottom: '20px' }}>⚡ Uso de Processamento (CPU %)</h3>
        <ResponsiveContainer width="99%" height={250}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="timestamp" tickFormatter={(time) => new Date(time * 1000).toLocaleTimeString()} stroke="#888" />
            <YAxis domain={[0, 100]} stroke="#888" />
            <Tooltip labelFormatter={(time) => new Date(time * 1000).toLocaleTimeString()} contentStyle={{ backgroundColor: '#222', border: 'none', color: '#fff' }} />
            <Legend />
            <Line type="monotone" name="CPU (%)" dataKey="cpu" stroke="#8884d8" strokeWidth={3} isAnimationActive={false} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ marginTop: '40px', height: '350px', background: '#1e1e1e', padding: '20px', borderRadius: '10px' }}>
        <h3 style={{ marginBottom: '20px' }}>🧠 Consumo de Memória (RAM %)</h3>
        <ResponsiveContainer width="99%" height={250}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="timestamp" tickFormatter={(time) => new Date(time * 1000).toLocaleTimeString()} stroke="#888" />
            <YAxis domain={[0, 100]} stroke="#888" />
            <Tooltip labelFormatter={(time) => new Date(time * 1000).toLocaleTimeString()} contentStyle={{ backgroundColor: '#222', border: 'none', color: '#fff' }} />
            <Legend />
            <Line type="monotone" name="RAM (%)" dataKey="ram_percent" stroke="#82ca9d" strokeWidth={3} isAnimationActive={false} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
