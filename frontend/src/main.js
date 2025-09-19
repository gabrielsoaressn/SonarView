const { createApp, ref, onMounted, computed, watch, nextTick } = Vue;

// Componente principal simplificado sem router
const App = {
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

    const formatTime = (date) => {
      return date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    }

    return {
      metrics,
      history,
      loading,
      error,
      lastUpdate,
      fetchData,
      formatTime
    }
  },
  template: `
    <div id="app" class="min-h-screen bg-gray-50">
      <!-- Header -->
      <header class="bg-white shadow-sm border-b">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center py-6">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <h1 class="text-3xl font-bold text-gray-900">Aurora View</h1>
                <p class="text-sm text-gray-500">Dashboard de Monitoramento de Dívida Técnica</p>
              </div>
            </div>
            <div class="flex items-center space-x-4">
              <div v-if="lastUpdate" class="text-sm text-gray-500">
                Última atualização: {{ formatTime(lastUpdate) }}
              </div>
              <button 
                @click="fetchData"
                :disabled="loading"
                class="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
              >
                <i :class="['fas', loading ? 'fa-spinner fa-spin' : 'fa-sync', 'mr-1']"></i>
                Atualizar
              </button>
            </div>
          </div>
        </div>
      </header>

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

      <!-- Main Content -->
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div v-if="!metrics && !loading" class="text-center py-12">
          <div class="text-gray-400 text-6xl mb-4">
            <i class="fas fa-chart-line"></i>
          </div>
          <h3 class="text-xl font-semibold text-gray-700">Nenhum Dado Disponível</h3>
          <p class="text-gray-500">Aguardando primeira coleta de métricas...</p>
        </div>

        <!-- Dashboard Simples -->
        <div v-if="metrics" class="space-y-6">
          <!-- Quality Gate -->
          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center justify-between mb-6">
              <div class="flex items-center">
                <h2 class="text-xl font-semibold text-gray-900 mr-4">Quality Gate</h2>
                <div :class="['flex items-center px-3 py-1 rounded-full border', getOverallStatusClass()]">
                  <i :class="[getOverallStatusIcon(), 'mr-2']"></i>
                  <span class="font-semibold capitalize">{{ getOverallStatusText() }}</span>
                </div>
              </div>
              <div class="text-sm text-gray-500">
                Projeto: {{ metrics.projectKey }}
              </div>
            </div>
          </div>

          <!-- Métricas Principais -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="bg-white p-4 rounded-lg border border-green-200 text-green-600">
              <div class="flex items-center">
                <i class="fas fa-star text-lg mr-3"></i>
                <div>
                  <p class="text-sm font-medium opacity-75">Classificação Geral</p>
                  <p class="text-2xl font-bold">{{ metrics.overallRating }}</p>
                </div>
              </div>
            </div>
            
            <div class="bg-white p-4 rounded-lg border border-orange-200 text-orange-600">
              <div class="flex items-center">
                <i class="fas fa-clock text-lg mr-3"></i>
                <div>
                  <p class="text-sm font-medium opacity-75">Dívida Técnica</p>
                  <p class="text-2xl font-bold">{{ Math.round(metrics.technicalDebtMinutes / 60) }}h</p>
                </div>
              </div>
            </div>
            
            <div class="bg-white p-4 rounded-lg border border-blue-200 text-blue-600">
              <div class="flex items-center">
                <i class="fas fa-code text-lg mr-3"></i>
                <div>
                  <p class="text-sm font-medium opacity-75">Linhas de Código</p>
                  <p class="text-2xl font-bold">{{ metrics.size.linesOfCode.toLocaleString('pt-BR') }}</p>
                </div>
              </div>
            </div>
            
            <div class="bg-white p-4 rounded-lg border border-green-200 text-green-600">
              <div class="flex items-center">
                <i class="fas fa-vial text-lg mr-3"></i>
                <div>
                  <p class="text-sm font-medium opacity-75">Cobertura de Testes</p>
                  <p class="text-2xl font-bold">{{ metrics.coverage.overall.toFixed(1) }}%</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Métricas por Categoria -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Confiabilidade -->
            <div class="bg-white p-6 rounded-lg shadow">
              <h3 class="text-lg font-semibold mb-4 flex items-center">
                <i class="fas fa-shield-alt mr-2 text-blue-600"></i>
                Confiabilidade
              </h3>
              <div class="space-y-3">
                <div class="flex justify-between">
                  <span>Classificação:</span>
                  <span class="font-semibold">{{ metrics.reliability.rating }}</span>
                </div>
                <div class="flex justify-between">
                  <span>Bugs:</span>
                  <span :class="metrics.reliability.bugs > 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'">
                    {{ metrics.reliability.bugs }}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span>Esforço de Correção:</span>
                  <span>{{ Math.round(metrics.reliability.remediationEffort / 60) }}h</span>
                </div>
              </div>
            </div>

            <!-- Segurança -->
            <div class="bg-white p-6 rounded-lg shadow">
              <h3 class="text-lg font-semibold mb-4 flex items-center">
                <i class="fas fa-lock mr-2 text-orange-600"></i>
                Segurança
              </h3>
              <div class="space-y-3">
                <div class="flex justify-between">
                  <span>Classificação:</span>
                  <span class="font-semibold">{{ metrics.security.rating }}</span>
                </div>
                <div class="flex justify-between">
                  <span>Vulnerabilidades:</span>
                  <span :class="metrics.security.vulnerabilities > 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'">
                    {{ metrics.security.vulnerabilities }}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span>Esforço de Correção:</span>
                  <span>{{ Math.round(metrics.security.remediationEffort / 60) }}h</span>
                </div>
              </div>
            </div>

            <!-- Manutenibilidade -->
            <div class="bg-white p-6 rounded-lg shadow">
              <h3 class="text-lg font-semibold mb-4 flex items-center">
                <i class="fas fa-tools mr-2 text-purple-600"></i>
                Manutenibilidade
              </h3>
              <div class="space-y-3">
                <div class="flex justify-between">
                  <span>Classificação:</span>
                  <span class="font-semibold">{{ metrics.maintainability.rating }}</span>
                </div>
                <div class="flex justify-between">
                  <span>Code Smells:</span>
                  <span :class="metrics.maintainability.codeSmells > 10 ? 'text-orange-600 font-semibold' : 'text-green-600 font-semibold'">
                    {{ metrics.maintainability.codeSmells }}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span>Taxa de Dívida:</span>
                  <span :class="metrics.maintainability.debtRatio > 5 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'">
                    {{ metrics.maintainability.debtRatio.toFixed(1) }}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Código Novo -->
          <div class="bg-white p-6 rounded-lg shadow">
            <h3 class="text-lg font-semibold mb-4">Qualidade do Código Novo</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="text-center p-4 bg-red-50 rounded">
                <div class="text-3xl font-bold text-red-500">{{ metrics.newCode.bugs }}</div>
                <div class="text-sm text-gray-600">Novos Bugs</div>
              </div>
              <div class="text-center p-4 bg-orange-50 rounded">
                <div class="text-3xl font-bold text-orange-500">{{ metrics.newCode.vulnerabilities }}</div>
                <div class="text-sm text-gray-600">Novas Vulnerabilidades</div>
              </div>
              <div class="text-center p-4 bg-yellow-50 rounded">
                <div class="text-3xl font-bold text-yellow-500">{{ metrics.newCode.codeSmells }}</div>
                <div class="text-sm text-gray-600">Novos Code Smells</div>
              </div>
            </div>
          </div>

          <!-- Resumo de Análise -->
          <div class="bg-white p-6 rounded-lg shadow">
            <h3 class="text-lg font-semibold mb-4">Resumo da Análise</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-2">
                <div class="flex justify-between">
                  <span>Complexidade:</span>
                  <span class="font-semibold">{{ metrics.size.complexity }}</span>
                </div>
                <div class="flex justify-between">
                  <span>Duplicação:</span>
                  <span class="font-semibold">{{ metrics.duplication.density.toFixed(1) }}%</span>
                </div>
                <div class="flex justify-between">
                  <span>Cobertura Nova:</span>
                  <span class="font-semibold">{{ metrics.coverage.new.toFixed(1) }}%</span>
                </div>
              </div>
              <div class="space-y-2">
                <div class="text-sm text-gray-600">
                  <strong>Recomendações:</strong>
                </div>
                <ul class="text-sm text-gray-600 space-y-1">
                  <li v-if="metrics.reliability.bugs > 0">• Priorizar correção de bugs</li>
                  <li v-if="metrics.security.vulnerabilities > 0">• Corrigir vulnerabilidades de segurança</li>
                  <li v-if="metrics.maintainability.debtRatio > 10">• Reduzir dívida técnica</li>
                  <li v-if="metrics.coverage.overall < 80">• Aumentar cobertura de testes</li>
                  <li v-if="metrics.duplication.density > 5">• Refatorar código duplicado</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
  methods: {
    getOverallStatusClass() {
      const rating = this.metrics.overallRating
      if (rating === 'A' || rating === 'B') return 'text-green-600 bg-green-100 border-green-200'
      if (rating === 'C') return 'text-yellow-600 bg-yellow-100 border-yellow-200'
      return 'text-red-600 bg-red-100 border-red-200'
    },
    
    getOverallStatusIcon() {
      const rating = this.metrics.overallRating
      if (rating === 'A' || rating === 'B') return 'fas fa-check-circle'
      if (rating === 'C') return 'fas fa-exclamation-triangle'
      return 'fas fa-times-circle'
    },
    
    getOverallStatusText() {
      const rating = this.metrics.overallRating
      if (rating === 'A' || rating === 'B') return 'aprovado'
      if (rating === 'C') return 'alerta'
      return 'falharam'
    }
  }
}

createApp(App).mount('#app')