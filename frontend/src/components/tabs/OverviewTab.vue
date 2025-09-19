<template>
  <div class="space-y-6">
    <!-- Cartões de Métricas Principais -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="Classificação Geral"
        :value="metrics.overallRating"
        type="rating"
        trend="stable"
        icon="fas fa-star"
      />
      <MetricCard
        title="Dívida Técnica"
        :value="Math.round(metrics.technicalDebtMinutes / 60)"
        suffix=" horas"
        type="debt"
        icon="fas fa-clock"
      />
      <MetricCard
        title="Linhas de Código"
        :value="metrics.size.linesOfCode"
        type="info"
        icon="fas fa-code"
      />
      <MetricCard
        title="Cobertura de Testes"
        :value="metrics.coverage.overall.toFixed(1)"
        suffix="%"
        type="coverage"
        icon="fas fa-vial"
      />
    </div>

    <!-- Gráficos de Tendência -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="bg-white p-6 rounded-lg shadow">
        <h3 class="text-lg font-semibold mb-4">Tendência da Dívida Técnica</h3>
        <TrendChart
          :data="history"
          metric="technicalDebtMinutes"
          :time-range="timeRange"
          color="#EF4444"
          chart-id="debt-trend"
        />
      </div>
      <div class="bg-white p-6 rounded-lg shadow">
        <h3 class="text-lg font-semibold mb-4">Classificações de Qualidade</h3>
        <TrendChart
          :data="history"
          metric="ratings"
          :time-range="timeRange"
          color="#3B82F6"
          chart-id="ratings-trend"
        />
      </div>
    </div>

    <!-- Qualidade do Código Novo vs Legacy -->
    <div class="bg-white p-6 rounded-lg shadow">
      <h3 class="text-lg font-semibold mb-4">Qualidade do Código Novo</h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="text-center">
          <div class="text-3xl font-bold text-red-500">{{ metrics.newCode.bugs }}</div>
          <div class="text-sm text-gray-600">Novos Bugs</div>
        </div>
        <div class="text-center">
          <div class="text-3xl font-bold text-orange-500">{{ metrics.newCode.vulnerabilities }}</div>
          <div class="text-sm text-gray-600">Novas Vulnerabilidades</div>
        </div>
        <div class="text-center">
          <div class="text-3xl font-bold text-yellow-500">{{ metrics.newCode.codeSmells }}</div>
          <div class="text-sm text-gray-600">Novos Code Smells</div>
        </div>
      </div>
    </div>

    <!-- Resumo de Complexidade e Duplicação -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="bg-white p-6 rounded-lg shadow">
        <h3 class="text-lg font-semibold mb-4">Métricas de Complexidade</h3>
        <div class="space-y-4">
          <div class="flex justify-between items-center">
            <span class="text-gray-600">Complexidade Ciclomática</span>
            <span class="font-semibold">{{ metrics.size.complexity }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-600">Densidade de Duplicação</span>
            <span class="font-semibold">{{ metrics.duplication.density.toFixed(1) }}%</span>
          </div>
        </div>
      </div>
      
      <div class="bg-white p-6 rounded-lg shadow">
        <h3 class="text-lg font-semibold mb-4">Esforço de Remediação</h3>
        <div class="space-y-4">
          <div class="flex justify-between items-center">
            <span class="text-gray-600">Confiabilidade</span>
            <span class="font-semibold">{{ Math.round(metrics.reliability.remediationEffort / 60) }}h</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-600">Segurança</span>
            <span class="font-semibold">{{ Math.round(metrics.security.remediationEffort / 60) }}h</span>
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
  name: 'OverviewTab',
  components: {
    MetricCard,
    TrendChart
  },
  props: {
    metrics: Object,
    history: Array,
    timeRange: String
  }
}
</script>