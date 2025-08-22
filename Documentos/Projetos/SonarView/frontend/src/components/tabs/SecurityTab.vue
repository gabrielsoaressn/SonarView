<template>
  <div class="space-y-6">
    <!-- Métricas de Segurança -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <MetricCard
        title="Classificação de Segurança"
        :value="metrics.security.rating"
        type="rating"
        icon="fas fa-lock"
      />
      <MetricCard
        title="Vulnerabilidades"
        :value="metrics.security.vulnerabilities"
        type="vulnerabilities"
        icon="fas fa-exclamation-triangle"
      />
      <MetricCard
        title="Esforço de Remediação"
        :value="Math.round(metrics.security.remediationEffort / 60)"
        suffix=" horas"
        type="effort"
        icon="fas fa-tools"
      />
    </div>

    <!-- Gráfico de Tendência de Segurança -->
    <div class="bg-white p-6 rounded-lg shadow">
      <h3 class="text-lg font-semibold mb-4">Tendência de Vulnerabilidades</h3>
      <TrendChart
        :data="history"
        metric="security.vulnerabilities"
        :time-range="timeRange"
        color="#F59E0B"
        chart-id="security-trend"
      />
    </div>

    <!-- Análise de Risco -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="bg-white p-6 rounded-lg shadow">
        <h3 class="text-lg font-semibold mb-4">Análise de Risco</h3>
        <div class="space-y-4">
          <div :class="['p-4 rounded', getRiskLevelStyle()]">
            <h4 class="font-medium mb-2">Nível de Risco Atual</h4>
            <div class="text-2xl font-bold">{{ getRiskLevel() }}</div>
            <p class="text-sm mt-2">{{ getRiskDescription() }}</p>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div class="text-center p-3 bg-gray-50 rounded">
              <div class="text-lg font-semibold text-gray-700">{{ getSecurityScore() }}/100</div>
              <div class="text-sm text-gray-600">Score de Segurança</div>
            </div>
            <div class="text-center p-3 bg-gray-50 rounded">
              <div class="text-lg font-semibold text-gray-700">{{ getDaysWithoutIncident() }}</div>
              <div class="text-sm text-gray-600">Dias sem Incidente</div>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-lg shadow">
        <h3 class="text-lg font-semibold mb-4">Top 5 Categorias de Vulnerabilidades</h3>
        <div class="space-y-3">
          <div 
            v-for="category in getVulnerabilityCategories()" 
            :key="category.name"
            class="flex items-center justify-between p-3 bg-gray-50 rounded"
          >
            <div class="flex items-center">
              <i :class="[category.icon, 'text-orange-500 mr-3']"></i>
              <div>
                <div class="font-medium">{{ category.name }}</div>
                <div class="text-sm text-gray-600">{{ category.description }}</div>
              </div>
            </div>
            <div class="text-right">
              <div class="font-semibold text-orange-600">{{ category.count }}</div>
              <div class="text-xs text-gray-500">{{ category.severity }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Vulnerabilidades por Severidade -->
    <div class="bg-white p-6 rounded-lg shadow">
      <h3 class="text-lg font-semibold mb-4">Distribuição por Severidade</h3>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="text-center p-4 bg-red-50 rounded">
          <div class="text-2xl font-bold text-red-600">{{ getVulnerabilitiesBySeverity('HIGH') }}</div>
          <div class="text-sm text-red-800">Alta</div>
          <div class="text-xs text-red-600">Ação Imediata</div>
        </div>
        <div class="text-center p-4 bg-orange-50 rounded">
          <div class="text-2xl font-bold text-orange-600">{{ getVulnerabilitiesBySeverity('MEDIUM') }}</div>
          <div class="text-sm text-orange-800">Média</div>
          <div class="text-xs text-orange-600">Próxima Sprint</div>
        </div>
        <div class="text-center p-4 bg-yellow-50 rounded">
          <div class="text-2xl font-bold text-yellow-600">{{ getVulnerabilitiesBySeverity('LOW') }}</div>
          <div class="text-sm text-yellow-800">Baixa</div>
          <div class="text-xs text-yellow-600">Backlog</div>
        </div>
        <div class="text-center p-4 bg-blue-50 rounded">
          <div class="text-2xl font-bold text-blue-600">{{ getVulnerabilitiesBySeverity('INFO') }}</div>
          <div class="text-sm text-blue-800">Informativa</div>
          <div class="text-xs text-blue-600">Monitorar</div>
        </div>
      </div>
    </div>

    <!-- Plano de Ação -->
    <div class="bg-white p-6 rounded-lg shadow">
      <h3 class="text-lg font-semibold mb-4">Plano de Ação Recomendado</h3>
      <div class="space-y-4">
        <div 
          v-for="(action, index) in getActionPlan()" 
          :key="index"
          class="flex items-center p-4 border rounded-lg"
        >
          <div :class="['w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold mr-4', action.priorityColor]">
            {{ index + 1 }}
          </div>
          <div class="flex-1">
            <div class="font-medium">{{ action.title }}</div>
            <div class="text-sm text-gray-600">{{ action.description }}</div>
          </div>
          <div class="text-right">
            <div class="text-sm font-medium">{{ action.timeframe }}</div>
            <div class="text-xs text-gray-500">{{ action.effort }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import MetricCard from '../MetricCard.vue'
import TrendChart from '../TrendChart.vue'

export default {
  name: 'SecurityTab',
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
    getRiskLevel() {
      const vulns = this.metrics.security.vulnerabilities
      if (vulns === 0) return 'BAIXO'
      if (vulns <= 3) return 'MODERADO'
      if (vulns <= 8) return 'ALTO'
      return 'CRÍTICO'
    },
    
    getRiskLevelStyle() {
      const level = this.getRiskLevel()
      const styles = {
        'BAIXO': 'bg-green-50 text-green-800',
        'MODERADO': 'bg-yellow-50 text-yellow-800',
        'ALTO': 'bg-orange-50 text-orange-800',
        'CRÍTICO': 'bg-red-50 text-red-800'
      }
      return styles[level]
    },
    
    getRiskDescription() {
      const level = this.getRiskLevel()
      const descriptions = {
        'BAIXO': 'Sistema seguro. Manter práticas atuais de segurança.',
        'MODERADO': 'Algumas vulnerabilidades detectadas. Monitoramento recomendado.',
        'ALTO': 'Vulnerabilidades significativas. Ação corretiva necessária.',
        'CRÍTICO': 'Alto risco de segurança. Ação imediata obrigatória.'
      }
      return descriptions[level]
    },
    
    getSecurityScore() {
      const rating = this.metrics.security.rating
      const scores = { 'A': 95, 'B': 85, 'C': 70, 'D': 55, 'E': 40 }
      return scores[rating] || 50
    },
    
    getDaysWithoutIncident() {
      // Simulação baseada na classificação de segurança
      const rating = this.metrics.security.rating
      const baseDays = { 'A': 90, 'B': 60, 'C': 30, 'D': 15, 'E': 5 }
      return baseDays[rating] || 0
    },
    
    getVulnerabilityCategories() {
      return [
        {
          name: 'Injeção SQL',
          description: 'Vulnerabilidades de injeção de código',
          count: Math.floor(this.metrics.security.vulnerabilities * 0.3),
          severity: 'Alta',
          icon: 'fas fa-database'
        },
        {
          name: 'XSS',
          description: 'Cross-Site Scripting',
          count: Math.floor(this.metrics.security.vulnerabilities * 0.25),
          severity: 'Média',
          icon: 'fas fa-code'
        },
        {
          name: 'Autenticação',
          description: 'Falhas de autenticação e autorização',
          count: Math.floor(this.metrics.security.vulnerabilities * 0.2),
          severity: 'Alta',
          icon: 'fas fa-key'
        },
        {
          name: 'Criptografia',
          description: 'Problemas criptográficos',
          count: Math.floor(this.metrics.security.vulnerabilities * 0.15),
          severity: 'Média',
          icon: 'fas fa-lock'
        },
        {
          name: 'Configuração',
          description: 'Configurações inseguras',
          count: Math.floor(this.metrics.security.vulnerabilities * 0.1),
          severity: 'Baixa',
          icon: 'fas fa-cog'
        }
      ]
    },
    
    getVulnerabilitiesBySeverity(severity) {
      const total = this.metrics.security.vulnerabilities
      const distribution = {
        'HIGH': 0.3,
        'MEDIUM': 0.4,
        'LOW': 0.25,
        'INFO': 0.05
      }
      return Math.floor(total * distribution[severity])
    },
    
    getActionPlan() {
      const vulns = this.metrics.security.vulnerabilities
      const actions = []
      
      if (vulns > 0) {
        actions.push({
          title: 'Correção de Vulnerabilidades Críticas',
          description: 'Priorizar correção de vulnerabilidades de alta severidade',
          timeframe: 'Imediato',
          effort: 'Alto',
          priorityColor: 'bg-red-500'
        })
        
        actions.push({
          title: 'Implementar Code Review de Segurança',
          description: 'Estabelecer processo de revisão focado em segurança',
          timeframe: '1-2 semanas',
          effort: 'Médio',
          priorityColor: 'bg-orange-500'
        })
        
        actions.push({
          title: 'Treinamento em Segurança',
          description: 'Capacitar equipe em práticas seguras de desenvolvimento',
          timeframe: '1 mês',
          effort: 'Médio',
          priorityColor: 'bg-yellow-500'
        })
      }
      
      actions.push({
        title: 'Monitoramento Contínuo',
        description: 'Implementar varreduras automáticas de segurança',
        timeframe: 'Contínuo',
        effort: 'Baixo',
        priorityColor: 'bg-blue-500'
      })
      
      return actions
    }
  }
}
</script>