import ClimaDashboard from './components/ClimaDashboard'

function App() {
  const mockSession = {
    user: {
      id: 'local-admin',
      email: 'admin@local.com'
    }
  }

  return (
    <div>
      <ClimaDashboard session={mockSession} />
    </div>
  )
}

export default App
