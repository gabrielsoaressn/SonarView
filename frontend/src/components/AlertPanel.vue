<template>
  <div class="relative">
    <!-- Botão de Alertas ou Status Saudável -->
    <div v-if="alerts.length === 0" class="flex items-center text-green-600">
      <i class="fas fa-check-circle mr-2"></i>
      <span class="text-sm font-medium">Todos os sistemas saudáveis</span>
    </div>
    
    <button
      v-else
      @click="showAlerts = !showAlerts"
      class="flex items-center px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium hover:bg-red-200"
    >
      <i class="fas fa-bell mr-2"></i>
      {{ alerts.length }} Alerta{{ alerts.length > 1 ? 's' : '' }}
      <i :class="['fas fa-chevron-down ml-2 transition-transform', showAlerts ? 'rotate-180' : '']"></i>
    </button>

    <!-- Painel de Alertas -->
    <div 
      v-if="showAlerts && alerts.length > 0" 
      class="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-20"
    >
      <div class="flex justify-between items-center mb-4">
        <h3 class="font-semibold text-gray-900">Alertas Ativos</h3>
        <button
          @click="showAlerts = false"
          class="text-gray-400 hover:text-gray-600"
        >
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="space-y-3 max-h-80 overflow-y-auto">
        <div 
          v-for="(alert, index) in alerts" 
          :key="index" 
          :class="['border rounded-lg p-3', getAlertColorClass(alert.type)]"
        >
          <div class="flex items-start">
            <i :class="[getAlertIcon(alert.type), 'mt-1 mr-3']"></i>
            <div class="flex-1">
              <div class="font-medium">{{ alert.title }}</div>
              <div class="text-sm opacity-75">{{ alert.message }}</div>
              <button 
                v-if="alert.action"
                class="text-sm font-medium mt-2 hover:underline"
              >
                {{ alert.action }} →
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-4 pt-4 border-t">
        <button class="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium">
          Ver Todos os Alertas
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue'

export default {
  name: 'AlertPanel',
  props: {
    metrics: {
      type: Object,
      required: true
    }
  },
  setup(props) {
    const alerts = ref([])
    const showAlerts = ref(false)

    const generateAlerts = () => {
      const newAlerts = []

      // Alertas de questões críticas
      if (props.metrics.reliability.bugs > 0) {
        newAlerts.push({
          type: 'error',
          title: 'Problemas de Confiabilidade',
          message: `${props.metrics.reliability.bugs} bugs detectados`,
          action: 'Ver Detalhes'
        })
      }

      if (props.metrics.security.vulnerabilities > 0) {
        newAlerts.push({
          type: 'error',
          title: 'Vulnerabilidades de Segurança',
          message: `${props.metrics.security.vulnerabilities} vulnerabilidades encontradas`,
          action: 'Corrigir Agora'
        })
      }

      // Alertas de aviso
      if (props.metrics.maintainability.debtRatio > 10) {
        newAlerts.push({
          type: 'warning',
          title: 'Alta Dívida Técnica',
          message: `Taxa de dívida: ${props.metrics.maintainability.debtRatio.toFixed(1)}%`,
          action: 'Planejar Refatoração'
        })
      }

      if (props.metrics.coverage.overall < 60) {
        newAlerts.push({
          type: 'warning',
          title: 'Baixa Cobertura de Testes',
          message: `Cobertura: ${props.metrics.coverage.overall.toFixed(1)}%`,
          action: 'Adicionar Testes'
        })
      }

      // Alertas de código novo
      if (props.metrics.newCode.bugs > 0 || props.metrics.newCode.vulnerabilities > 0 || props.metrics.newCode.codeSmells > 5) {
        newAlerts.push({
          type: 'info',
          title: 'Problemas no Código Novo',
          message: `${props.metrics.newCode.bugs + props.metrics.newCode.vulnerabilities + props.metrics.newCode.codeSmells} novos problemas`,
          action: 'Revisar'
        })
      }

      alerts.value = newAlerts
    }

    const getAlertIcon = (type) => {
      switch (type) {
        case 'error': return 'fas fa-exclamation-circle'
        case 'warning': return 'fas fa-exclamation-triangle'
        case 'info': return 'fas fa-info-circle'
        default: return 'fas fa-bell'
      }
    }

    const getAlertColorClass = (type) => {
      switch (type) {
        case 'error': return 'text-red-600 bg-red-50 border-red-200'
        case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
        case 'info': return 'text-blue-600 bg-blue-50 border-blue-200'
        default: return 'text-gray-600 bg-gray-50 border-gray-200'
      }
    }

    watch(() => props.metrics, generateAlerts, { immediate: true })

    return {
      alerts,
      showAlerts,
      getAlertIcon,
      getAlertColorClass
    }
  }
}
</script>