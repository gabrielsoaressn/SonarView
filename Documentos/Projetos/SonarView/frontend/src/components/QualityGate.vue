<template>
  <div class="bg-white rounded-lg shadow p-6">
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center">
        <h2 class="text-xl font-semibold text-gray-900 mr-4">Quality Gate</h2>
        <div :class="['flex items-center px-3 py-1 rounded-full border', statusColorClass]">
          <i :class="[statusIcon, 'mr-2']"></i>
          <span class="font-semibold capitalize">{{ statusText }}</span>
        </div>
      </div>
      <div class="text-sm text-gray-500">
        Projeto: {{ metrics.projectKey }}
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div 
        v-for="(condition, index) in conditions" 
        :key="index" 
        class="border rounded-lg p-4"
      >
        <div class="flex items-center justify-between mb-2">
          <span class="font-medium text-gray-700">{{ condition.name }}</span>
          <i :class="[getStatusIcon(condition.status), getStatusColorText(condition.status)]"></i>
        </div>
        <div class="text-2xl font-bold text-gray-900 mb-1">
          {{ condition.value }}
        </div>
        <div class="text-sm text-gray-500">
          {{ condition.detail }}
        </div>
      </div>
    </div>

    <!-- Resumo do Quality Gate -->
    <div class="mt-6 pt-6 border-t">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
        <div>
          <div class="text-2xl font-bold text-green-600">
            {{ passedCount }}
          </div>
          <div class="text-sm text-gray-600">Condições Aprovadas</div>
        </div>
        <div>
          <div class="text-2xl font-bold text-yellow-600">
            {{ warningCount }}
          </div>
          <div class="text-sm text-gray-600">Avisos</div>
        </div>
        <div>
          <div class="text-2xl font-bold text-red-600">
            {{ failedCount }}
          </div>
          <div class="text-sm text-gray-600">Condições Falharam</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'

export default {
  name: 'QualityGate',
  props: {
    metrics: {
      type: Object,
      required: true
    }
  },
  setup(props) {
    const overallStatus = computed(() => {
      const rating = props.metrics.overallRating
      if (rating === 'A' || rating === 'B') return 'passed'
      if (rating === 'C') return 'warning'
      return 'failed'
    })

    const statusText = computed(() => {
      switch (overallStatus.value) {
        case 'passed': return 'aprovado'
        case 'warning': return 'alerta'
        case 'failed': return 'falharam'
        default: return 'desconhecido'
      }
    })

    const statusColorClass = computed(() => {
      switch (overallStatus.value) {
        case 'passed': return 'text-green-600 bg-green-100 border-green-200'
        case 'warning': return 'text-yellow-600 bg-yellow-100 border-yellow-200'
        case 'failed': return 'text-red-600 bg-red-100 border-red-200'
        default: return 'text-gray-600 bg-gray-100 border-gray-200'
      }
    })

    const statusIcon = computed(() => {
      switch (overallStatus.value) {
        case 'passed': return 'fas fa-check-circle'
        case 'warning': return 'fas fa-exclamation-triangle'
        case 'failed': return 'fas fa-times-circle'
        default: return 'fas fa-question-circle'
      }
    })

    const conditions = computed(() => [
      {
        name: 'Confiabilidade',
        status: props.metrics.reliability.rating <= 'B' ? 'passed' : 'failed',
        value: props.metrics.reliability.rating,
        detail: `${props.metrics.reliability.bugs} bugs`
      },
      {
        name: 'Segurança',
        status: props.metrics.security.rating <= 'B' ? 'passed' : 'failed',
        value: props.metrics.security.rating,
        detail: `${props.metrics.security.vulnerabilities} vulnerabilidades`
      },
      {
        name: 'Manutenibilidade',
        status: props.metrics.maintainability.rating <= 'B' && props.metrics.maintainability.debtRatio < 10 ? 'passed' : 'failed',
        value: props.metrics.maintainability.rating,
        detail: `${props.metrics.maintainability.debtRatio.toFixed(1)}% taxa de dívida`
      },
      {
        name: 'Cobertura',
        status: props.metrics.coverage.overall >= 80 ? 'passed' : props.metrics.coverage.overall >= 60 ? 'warning' : 'failed',
        value: `${props.metrics.coverage.overall.toFixed(1)}%`,
        detail: 'cobertura de testes'
      }
    ])

    const passedCount = computed(() => 
      conditions.value.filter(c => c.status === 'passed').length
    )

    const warningCount = computed(() => 
      conditions.value.filter(c => c.status === 'warning').length
    )

    const failedCount = computed(() => 
      conditions.value.filter(c => c.status === 'failed').length
    )

    const getStatusIcon = (status) => {
      switch (status) {
        case 'passed': return 'fas fa-check-circle'
        case 'warning': return 'fas fa-exclamation-triangle'
        case 'failed': return 'fas fa-times-circle'
        default: return 'fas fa-question-circle'
      }
    }

    const getStatusColorText = (status) => {
      switch (status) {
        case 'passed': return 'text-green-600'
        case 'warning': return 'text-yellow-600'
        case 'failed': return 'text-red-600'
        default: return 'text-gray-600'
      }
    }

    return {
      overallStatus,
      statusText,
      statusColorClass,
      statusIcon,
      conditions,
      passedCount,
      warningCount,
      failedCount,
      getStatusIcon,
      getStatusColorText
    }
  }
}
</script>