<template>
  <div class="space-y-6">
    <!-- Métricas de Confiabilidade -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <MetricCard
        title="Classificação de Confiabilidade"
        :value="metrics.reliability.rating"
        type="rating"
        icon="fas fa-shield-alt"
      />
      <MetricCard
        title="Total de Bugs"
        :value="metrics.reliability.bugs"
        type="bugs"
        icon="fas fa-bug"
      />
      <MetricCard
        title="Esforço de Remediação"
        :value="Math.round(metrics.reliability.remediationEffort / 60)"
        suffix=" horas"
        type="effort"
        icon="fas fa-wrench"
      />
    </div>

    <!-- Gráfico de Tendência de Confiabilidade -->
    <div class="bg-white p-6 rounded-lg shadow">
      <h3 class="text-lg font-semibold mb-4">Tendência de Bugs</h3>
      <TrendChart
        :data="history"
        metric="reliability.bugs"
        :time-range="timeRange"
        color="#DC2626"
        chart-id="reliability-trend"
      />
    </div>

    <!-- Análise Detalhada -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="bg-white p-6 rounded-lg shadow">
        <h3 class="text-lg font-semibold mb-4">Análise de Impacto</h3>
        <div class="space-y-4">
          <div class="p-4 bg-gray-50 rounded">
            <h4 class="font-medium text-gray-800 mb-2">Impacto nos Negócios</h4>
            <p class="text-sm text-gray-600">
              {{ getBusinessImpact() }}
            </p>
          </div>
          <div class="p-4 bg-gray-50 rounded">
            <h4 class="font-medium text-gray-800 mb-2">Recomendações</h4>
            <ul class="text-sm text-gray-600 space-y-1">
              <li v-for="recommendation in getRecommendations()" :key="recommendation">
                • {{ recommendation }}
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-lg shadow">
        <h3 class="text-lg font-semibold mb-4">Histórico de Melhorias</h3>
        <div class="space-y-3">
          <div class="flex items-center justify-between p-3 bg-green-50 rounded">
            <div>
              <div class="font-medium text-green-800">Bugs Resolvidos (Últimos 7 dias)</div>
              <div class="text-sm text-green-600">{{ getBugsResolved() }} bugs corrigidos</div>
            </div>
            <i class="fas fa-check-circle text-green-500 text-xl"></i>
          </div>
          
          <div class="flex items-center justify-between p-3 bg-blue-50 rounded">
            <div>
              <div class="font-medium text-blue-800">Taxa de Resolução</div>
              <div class="text-sm text-blue-600">{{ getResolutionRate() }}% de eficiência</div>
            </div>
            <i class="fas fa-chart-line text-blue-500 text-xl"></i>
          </div>
        </div>
      </div>
    </div>

    <!-- Distribuição por Severidade -->
    <div class="bg-white p-6 rounded-lg shadow">
      <h3 class="text-lg font-semibold mb-4">Distribuição de Bugs por Severidade</h3>
      <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div class="text-center p-4 bg-red-50 rounded">
          <div class="text-2xl font-bold text-red-600">{{ getBugsBySeverity('BLOCKER') }}</div>
          <div class="text-sm text-red-800">Bloqueadores</div>
        </div>
        <div class="text-center p-4 bg-orange-50 rounded">
          <div class="text-2xl font-bold text-orange-600">{{ getBugsBySeverity('CRITICAL') }}</div>
          <div class="text-sm text-orange-800">Críticos</div>
        </div>
        <div class="text-center p-4 bg-yellow-50 rounded">
          <div class="text-2xl font-bold text-yellow-600">{{ getBugsBySeverity('MAJOR') }}</div>
          <div class="text-sm text-yellow-800">Maiores</div>
        </div>
        <div class="text-center p-4 bg-blue-50 rounded">
          <div class="text-2xl font-bold text-blue-600">{{ getBugsBySeverity('MINOR') }}</div>
          <div class="text-sm text-blue-800">Menores</div>
        </div>
        <div class="text-center p-4 bg-gray-50 rounded">
          <div class="text-2xl font-bold text-gray-600">{{ getBugsBySeverity('INFO') }}</div>
          <div class="text-sm text-gray-800">Info</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import MetricCard from '../MetricCard.vue'
import TrendChart from '../TrendChart.vue'

export default {
  name: 'ReliabilityTab',
  components: {
    MetricCard,
    TrendChart
  },
  props: {
    metrics: Object,
    history: Array,
    timeRange: String
  },
  methods: {
    getBusinessImpact() {
      const bugs = this.metrics.reliability.bugs
      if (bugs === 0) return 'Excelente! Nenhum bug detectado no momento.'
      if (bugs <= 5) return 'Impacto baixo. Poucos bugs que podem ser resolvidos na próxima sprint.'
      if (bugs <= 15) return 'Impacto moderado. Recomenda-se priorizar a correção dos bugs.'
      return 'Impacto alto. Necessário plano de ação imediato para reduzir bugs.'
    },
    
    getRecommendations() {
      const bugs = this.metrics.reliability.bugs
      const recommendations = []
      
      if (bugs > 0) {
        recommendations.push('Priorizar correção de bugs bloqueadores e críticos')
        recommendations.push('Implementar code review mais rigoroso')
        recommendations.push('Aumentar cobertura de testes automatizados')
      }
      
      if (bugs > 10) {
        recommendations.push('Considerar refatoração de módulos críticos')
        recommendations.push('Implementar análise estática contínua')
      }
      
      if (bugs === 0) {
        recommendations.push('Manter práticas atuais de qualidade')
        recommendations.push('Continuar monitoramento preventivo')
      }
      
      return recommendations
    },
    
    getBugsResolved() {
      // Simulação baseada no histórico (em uma implementação real, viria da API)
      return Math.max(0, Math.floor(Math.random() * 10))
    },
    
    getResolutionRate() {
      const rating = this.metrics.reliability.rating
      const rates = { 'A': 95, 'B': 85, 'C': 75, 'D': 65, 'E': 55 }
      return rates[rating] || 50
    },
    
    getBugsBySeverity(severity) {
      // Simulação da distribuição de bugs por severidade
      const total = this.metrics.reliability.bugs
      const distribution = {
        'BLOCKER': 0.1,
        'CRITICAL': 0.2,
        'MAJOR': 0.4,
        'MINOR': 0.25,
        'INFO': 0.05
      }
      return Math.floor(total * distribution[severity])
    }
  }
}
</script>