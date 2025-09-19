<template>
  <div id="app">
    <Header 
      :last-update="lastUpdate" 
      :loading="loading" 
      @refresh="fetchData" 
    />
    
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <router-view 
        :metrics="metrics" 
        :history="history" 
        :loading="loading" 
        :error="error"
      />
    </main>

    <!-- Loading Overlay -->
    <div v-if="loading && !metrics" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white p-8 rounded-lg shadow-xl max-w-md text-center">
        <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 class="text-xl font-semibold text-gray-700 mb-2">Carregando Aurora View...</h2>
        <p class="text-gray-500">Coletando métricas de dívida técnica</p>
      </div>
    </div>

    <!-- Error Modal -->
    <div v-if="error && !metrics" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white p-8 rounded-lg shadow-xl max-w-md text-center">
        <div class="text-red-500 text-5xl mb-4">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <h2 class="text-xl font-semibold text-gray-800 mb-2">Erro ao Carregar Dados</h2>
        <p class="text-gray-600 mb-4">{{ error }}</p>
        <button 
          @click="fetchData"
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import Header from './components/Header.vue'

export default {
  name: 'App',
  components: {
    Header
  },
  setup() {
    const metrics = ref(null)
    const history = ref([])
    const loading = ref(true)
    const error = ref(null)
    const lastUpdate = ref(null)

    const fetchData = async () => {
      try {
        loading.value = true
        const [latestResponse, historyResponse] = await Promise.all([
          axios.get('/api/metrics/latest'),
          axios.get('/api/metrics/history?hours=24')
        ])
        
        metrics.value = latestResponse.data
        history.value = historyResponse.data
        lastUpdate.value = new Date()
        error.value = null
      } catch (err) {
        console.error('Erro ao buscar dados:', err)
        error.value = err.response?.data?.message || 'Falha ao carregar dados'
      } finally {
        loading.value = false
      }
    }

    onMounted(() => {
      fetchData()
      
      // Atualizar dados a cada 5 minutos
      setInterval(fetchData, 5 * 60 * 1000)
    })

    return {
      metrics,
      history,
      loading,
      error,
      lastUpdate,
      fetchData
    }
  }
}
</script>

<style>
#app {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  min-height: 100vh;
  background-color: #f9fafb;
}

/* Scroll customizado */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f5f9;
}

::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>