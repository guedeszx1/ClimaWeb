import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://kaukzcicfltfyznusdoq.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthdWt6Y2ljZmx0Znl6bnVzZG9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NTg0NjYsImV4cCI6MjA5NTAzNDQ2Nn0.WV04uNHukPq9oTR9IOY5WIggpeq40K3TWL6xaEh57lE"

const supabase = createClient(supabaseUrl, supabaseKey)

async function createTestUser() {
  console.log("Tentando criar usuário teste@climaweb.com...")
  
  const { data, error } = await supabase.auth.signUp({
    email: 'teste@climaweb.com',
    password: 'senha1234'
  })

  if (error) {
    console.error("ERRO DO SUPABASE:", error.message)
  } else {
    console.log("Usuário criado com sucesso:", data.user?.email)
    console.log("Verifique se 'Email Confirmation' está ativado. Se estiver, o usuário não conseguirá logar sem verificar o email.")
  }
}

createTestUser()
