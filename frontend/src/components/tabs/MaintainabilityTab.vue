<template>
  <div class="space-y-6">
    <!-- Métricas de Manutenibilidade -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <MetricCard
        title="Classificação de Manutenibilidade"
        :value="metrics.maintainability.rating"
        type="rating"
        icon="fas fa-tools"
      />
      <MetricCard
        title="Code Smells"
        :value="metrics.maintainability.codeSmells"
        type="smells"
        icon="fas fa-exclamation"
      />
      <MetricCard
        title="Taxa de Dívida"
        :value="metrics.maintainability.debtRatio.toFixed(1)"
        suffix="%"
        type="debt"
        icon="fas fa-percentage"
      />
      <MetricCard
        title="Duplicação"
        :value="metrics.duplication.density.toFixed(1)"
        suffix="%"
        type="duplication"
        icon="fas fa-copy"
      />
    </div>

    <!-- Gráficos de Tendência -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="bg-white p-6 rounded-lg shadow">
        <h3 class="text-lg font-semibold mb-4">Tendência de Code Smells</h3>
        <TrendChart
          :data="history"
          metric="maintainability.codeSmells"
          :time-range="timeRange"
          color="#8B5CF6"
          chart-id="smells-trend"
        />
      </div>
      <div class="bg-white p-6 rounded-lg shadow">
        <h3 class="text-lg font-semibold mb-4">Tendência da Taxa de Dívida</h3>
        <TrendChart
          :data="history"
          metric="maintainability.debtRatio"
          :time-range="timeRange"
          color="#EF4444"
          chart-id="debt-ratio-trend"
        />
      </div>
    </div>

    <!-- Análise de Dívida Técnica -->
    <div class="bg-white p-6 rounded-lg shadow">
      <h3 class="text-lg font-semibold mb-4">Análise da Dívida Técnica</h3>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="space-y-4">
          <h4 class="font-medium text-gray-800">Tempo Total de Dívida</h4>
          <div class="text-3xl font-bold text-orange-600">
            {{ formatDebtTime(metrics.technicalDebtMinutes) }}
          </div>
          <p class="text-sm text-gray-600">
            Tempo estimado para resolver toda a dívida técnica
          </p>
        </div>
        
        <div class="space-y-4">
          <h4 class="font-medium text-gray-800">Custo Estimado</h4>
          <div class="text-3xl font-bold text-red-600">
            {{ formatDebtCost(metrics.technicalDebtMinutes) }}
          </div>
          <p class="text-sm text-gray-600">
            Baseado em taxa média de R$ 100/hora
          </p>
        </div>
        
        <div class="space-y-4">
          <h4 class="font-medium text-gray-800">Prioridade de Ação</h4>
          <div :class="['text-3xl font-bold', getDebtPriorityColor()]">
            {{ getDebtPriority() }}
          </div>
          <p class="text-sm text-gray-600">
            {{ getDebtPriorityDescription() }}
          </p>
        </div>
      </div>
    </div>

    <!-- Top Code Smells -->
    <div class="bg-white p-6 rounded-lg shadow">
      <h3 class="text-lg font-semibold mb-4">Principais Tipos de Code Smells</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div 
          v-for="smell in getTopCodeSmells()" 
          :key="smell.type"
          class="p-4 border rounded-lg hover:shadow-md transition-shadow"
        >
          <div class="flex items-center justify-between mb-2">
            <h5 class="font-medium text-gray-800">{{ smell.type }}</h5>
            <span :class="['px-2 py-1 rounded text-xs font-medium', smell.severityColor]">
              {{ smell.severity }}
            </span>
          </div>
          <div class="text-2xl font-bold text-purple-600 mb-1">{{ smell.count }}</div>
          <p class="text-sm text-gray-600">{{ smell.description }}</p>
          <div class="mt-2 text-xs text-gray-500">
            Esforço: {{ smell.effort }}
          </div>
        </div>
      </div>
    </div>

    <!-- Impacto na Velocidade da Equipe -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="bg-white p-6 rounded-lg shadow">
        <h3 class="text-lg font-semibold mb-4">Impacto na Velocidade</h3>
        <div class="space-y-4">
          <div class="flex justify-between items-center p-3 bg-gray-50 rounded">
            <span class="text-gray-700">Redução Estimada de Velocidade</span>
            <span class="font-semibold text-orange-600">{{ getVelocityImpact() }}%</span>
          </div>
          <div class="flex justify-between items-center p-3 bg-gray-50 rounded">
            <span class="text-gray-700">Tempo Extra por Feature</span>
            <span class="font-semibold text-red-600">{{ getExtraTimePerFeature() }}</span>
          </div>
          <div class="flex justify-between items-center p-3 bg-gray-50 rounded">
            <span class="text-gray-700">ROI da Refatoração</span>
            <span class="font-semibold text-green-600">{{ getRefactoringROI() }}%</span>
          </div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-lg shadow">
        <h3 class="text-lg font-semibold mb-4">Plano de Refatoração</h3>
        <div class="space-y-3">
          <div 
            v-for="(phase, index) in getRefactoringPlan()" 
            :key="index"
            class="flex items-center p-3 border rounded"
          >
            <div :class="['w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3', phase.color]">
              {{ index + 1 }}
            </div>
            <div class="flex-1">
              <div class="font-medium">{{ phase.title }}</div>
              <div class="text-sm text-gray-600">{{ phase.description }}</div>
            </div>
            <div class="text-right">
              <div class="text-sm font-medium">{{ phase.duration }}</div>
              <div class="text-xs text-gray-500">{{ phase.impact }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Métricas de Qualidade Adiccionais -->
    <div class="bg-white p-6 rounded-lg shadow">
      <h3 class="text-lg font-semibold mb-4">Métricas Complementares</h3>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="text-center p-4 bg-blue-50 rounded">
          <div class="text-2xl font-bold text-blue-600">{{ getComplexityIndex() }}</div>
          <div class="text-sm text-blue-800">Índice de Complexidade</div>
          <div class="text-xs text-blue-600">{{ getComplexityLevel() }}</div>
        </div>
        <div class="text-center p-4 bg-purple-50 rounded">
          <div class="text-2xl font-bold text-purple-600">{{ getCohesionIndex() }}%</div>
          <div class="text-sm text-purple-800">Coesão</div>
          <div class="text-xs text-purple-600">{{ getCohesionLevel() }}</div>
        </div>
        <div class="text-center p-4 bg-green-50 rounded">
          <div class="text-2xl font-bold text-green-600">{{ getReusabilityIndex() }}%</div>
          <div class="text-sm text-green-800">Reusabilidade</div>
          <div class="text-xs text-green-600">{{ getReusabilityLevel() }}</div>
        </div>
        <div class="text-center p-4 bg-orange-50 rounded">
          <div class="text-2xl font-bold text-orange-600">{{ getTestabilityIndex() }}%</div>
          <div class="text-sm text-orange-800">Testabilidade</div>
          <div class="text-xs text-orange-600">{{ getTestabilityLevel() }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import MetricCard from '../MetricCard.vue'
import TrendChart from '../TrendChart.vue'

export default {
  name: 'MaintainabilityTab',
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
    formatDebtTime(minutes) {
      const hours = Math.floor(minutes / 60)
      const days = Math.floor(hours / 8) // 8 horas por dia útil
      
      if (days > 0) {
        return `${days}d ${hours % 8}h`
      }
      return `${hours}h ${minutes % 60}m`
    },
    
    formatDebtCost(minutes) {
      const hours = minutes / 60
      const cost = hours * 100 // R$ 100 por hora
      return `R$ ${cost.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
    },
    
    getDebtPriority() {
      const ratio = this.metrics.maintainability.debtRatio
      if (ratio < 5) return 'BAIXA'
      if (ratio < 10) return 'MÉDIA'
      if (ratio < 20) return 'ALTA'
      return 'CRÍTICA'
    },
    
    getDebtPriorityColor() {
      const priority = this.getDebtPriority()
      const colors = {
        'BAIXA': 'text-green-600',
        'MÉDIA': 'text-yellow-600',
        'ALTA': 'text-orange-600',
        'CRÍTICA': 'text-red-600'
      }
      return colors[priority]
    },
    
    getDebtPriorityDescription() {
      const priority = this.getDebtPriority()
      const descriptions = {
        'BAIXA': 'Dívida sob controle, manter monitoramento',
        'MÉDIA': 'Considerar refatoração preventiva',
        'ALTA': 'Planejar refatoração na próxima sprint',
        'CRÍTICA': 'Ação imediata necessária'
      }
      return descriptions[priority]
    },
    
    getTopCodeSmells() {
      const total = this.metrics.maintainability.codeSmells
      return [
        {
          type: 'Métodos Longos',
          count: Math.floor(total * 0.25),
          severity: 'Média',
          severityColor: 'bg-yellow-100 text-yellow-800',
          description: 'Métodos com muitas linhas de código',
          effort: '2-4h por método'
        },
        {
          type: 'Classes Grandes',
          count: Math.floor(total * 0.20),
          severity: 'Alta',
          severityColor: 'bg-red-100 text-red-800',
          description: 'Classes com muitas responsabilidades',
          effort: '1-2 dias por classe'
        },
        {
          type: 'Código Duplicado',
          count: Math.floor(total * 0.18),
          severity: 'Média',
          severityColor: 'bg-orange-100 text-orange-800',
          description: 'Blocos de código repetidos',
          effort: '30min-2h por duplicação'
        },
        {
          type: 'Complexidade Ciclomática',
          count: Math.floor(total * 0.15),
          severity: 'Alta',
          severityColor: 'bg-red-100 text-red-800',
          description: 'Métodos com muitos caminhos de execução',
          effort: '2-6h por método'
        },
        {
          type: 'Parâmetros Excessivos',
          count: Math.floor(total * 0.12),
          severity: 'Baixa',
          severityColor: 'bg-green-100 text-green-800',
          description: 'Métodos com muitos parâmetros',
          effort: '15-30min por método'
        },
        {
          type: 'Comentários Inadequados',
          count: Math.floor(total * 0.10),
          severity: 'Baixa',
          severityColor: 'bg-blue-100 text-blue-800',
          description: 'Comentários desatualizados ou desnecessários',
          effort: '5-15min por ocorrência'
        }
      ]
    },
    
    getVelocityImpact() {
      const ratio = this.metrics.maintainability.debtRatio
      if (ratio < 5) return 5
      if (ratio < 10) return 15
      if (ratio < 20) return 30
      return 50
    },
    
    getExtraTimePerFeature() {
      const impact = this.getVelocityImpact()
      if (impact <= 10) return '+2-4h'
      if (impact <= 25) return '+0.5-1d'
      if (impact <= 40) return '+1-2d'
      return '+2-5d'
    },
    
    getRefactoringROI() {
      const ratio = this.metrics.maintainability.debtRatio
      if (ratio < 5) return 120
      if (ratio < 10) return 200
      if (ratio < 20) return 350
      return 500
    },
    
    getRefactoringPlan() {
      return [
        {
          title: 'Correção de Code Smells Críticos',
          description: 'Focar nos smells de alta severidade primeiro',
          duration: '1-2 sprints',
          impact: 'Alto',
          color: 'bg-red-500'
        },
        {
          title: 'Refatoração de Módulos Centrais',
          description: 'Melhorar arquitetura dos componentes principais',
          duration: '2-3 sprints',
          impact: 'Muito Alto',
          color: 'bg-orange-500'
        },
        {
          title: 'Implementação de Testes',
          description: 'Aumentar cobertura de testes para facilitar refatoração',
          duration: 'Contínuo',
          impact: 'Médio',
          color: 'bg-blue-500'
        },
        {
          title: 'Melhoria da Documentação',
          description: 'Atualizar documentação técnica e de arquitetura',
          duration: '1 sprint',
          impact: 'Baixo',
          color: 'bg-green-500'
        }
      ]
    },
    
    getComplexityIndex() {
      // Baseado na complexidade ciclomática e tamanho do código
      const complexity = this.metrics.size.complexity
      const loc = this.metrics.size.linesOfCode
      return Math.round((complexity / loc) * 1000)
    },
    
    getComplexityLevel() {
      const index = this.getComplexityIndex()
      if (index < 5) return 'Baixa'
      if (index < 10) return 'Média'
      return 'Alta'
    },
    
    getCohesionIndex() {
      // Simulação baseada na classificação de manutenibilidade
      const rating = this.metrics.maintainability.rating
      const values = { 'A': 90, 'B': 75, 'C': 60, 'D': 45, 'E': 30 }
      return values[rating] || 50
    },
    
    getCohesionLevel() {
      const index = this.getCohesionIndex()
      if (index >= 80) return 'Excelente'
      if (index >= 60) return 'Boa'
      if (index >= 40) return 'Regular'
      return 'Baixa'
    },
    
    getReusabilityIndex() {
      // Baseado na duplicação (menor duplicação = maior reusabilidade)
      const duplication = this.metrics.duplication.density
      return Math.max(0, 100 - duplication * 5)
    },
    
    getReusabilityLevel() {
      const index = this.getReusabilityIndex()
      if (index >= 80) return 'Alta'
      if (index >= 60) return 'Média'
      return 'Baixa'
    },
    
    getTestabilityIndex() {
      // Baseado na cobertura de testes e complexidade
      const coverage = this.metrics.coverage.overall
      const complexity = this.getComplexityIndex()
      return Math.round(coverage - (complexity * 2))
    },
    
    getTestabilityLevel() {
      const index = this.getTestabilityIndex()
      if (index >= 70) return 'Boa'
      if (index >= 50) return 'Regular'
      return 'Difícil'
    }
  }
}
</script>