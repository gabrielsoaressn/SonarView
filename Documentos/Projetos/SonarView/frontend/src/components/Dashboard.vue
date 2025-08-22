<template>
  <div class="space-y-6">
    <!-- Navegação por Abas -->
    <div class="border-b border-gray-200">
      <nav class="-mb-px flex space-x-8">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="[
            'py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2',
            activeTab === tab.id
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          ]"
        >
          <i :class="tab.icon"></i>
          <span>{{ tab.name }}</span>
        </button>
      </nav>
    </div>

    <!-- Filtros de Tempo -->
    <div class="flex justify-between items-center">
      <div class="flex space-x-2">
        <button
          v-for="range in timeRanges"
          :key="range"
          @click="timeRange = range"
          :class="[
            'px-3 py-1 text-sm rounded',
            timeRange === range
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:bg-gray-100'
          ]"
        >
          {{ range }}
        </button>
      </div>
      
      <AlertPanel v-if="metrics" :metrics="metrics" />
    </div>

    <!-- Quality Gate -->
    <QualityGate v-if="metrics" :metrics="metrics" />

    <!-- Conteúdo Principal -->
    <div v-if="!metrics && !loading" class="text-center py-12">
      <div class="text-gray-400 text-6xl mb-4">
        <i class="fas fa-chart-line"></i>
      </div>
      <h3 class="text-xl font-semibold text-gray-700">Nenhum Dado Disponível</h3>
      <p class="text-gray-500">Aguardando primeira coleta de métricas...</p>
    </div>

    <div v-else-if="metrics" class="grid grid-cols-1 gap-6">
      <!-- Aba Visão Geral -->
      <OverviewTab 
        v-if="activeTab === 'overview'" 
        :metrics="metrics" 
        :history="history" 
        :time-range="timeRange" 
      />
      
      <!-- Aba Confiabilidade -->
      <ReliabilityTab 
        v-if="activeTab === 'reliability'" 
        :metrics="metrics" 
        :history="history" 
        :time-range="timeRange" 
      />
      
      <!-- Aba Segurança -->
      <SecurityTab 
        v-if="activeTab === 'security'" 
        :metrics="metrics" 
        :history="history" 
        :time-range="timeRange" 
      />
      
      <!-- Aba Manutenibilidade -->
      <MaintainabilityTab 
        v-if="activeTab === 'maintainability'" 
        :metrics="metrics" 
        :history="history" 
        :time-range="timeRange" 
      />
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import QualityGate from './QualityGate.vue'
import AlertPanel from './AlertPanel.vue'
import OverviewTab from './tabs/OverviewTab.vue'
import ReliabilityTab from './tabs/ReliabilityTab.vue'
import SecurityTab from './tabs/SecurityTab.vue'
import MaintainabilityTab from './tabs/MaintainabilityTab.vue'

export default {
  name: 'Dashboard',
  components: {
    QualityGate,
    AlertPanel,
    OverviewTab,
    ReliabilityTab,
    SecurityTab,
    MaintainabilityTab
  },
  props: {
    metrics: Object,
    history: Array,
    loading: Boolean,
    error: String
  },
  setup() {
    const activeTab = ref('overview')
    const timeRange = ref('24h')

    const tabs = [
      { id: 'overview', name: 'Visão Geral', icon: 'fas fa-tachometer-alt' },
      { id: 'reliability', name: 'Confiabilidade', icon: 'fas fa-shield-alt' },
      { id: 'security', name: 'Segurança', icon: 'fas fa-lock' },
      { id: 'maintainability', name: 'Manutenibilidade', icon: 'fas fa-tools' }
    ]

    const timeRanges = ['6h', '12h', '24h', '3d', '7d']

    return {
      activeTab,
      timeRange,
      tabs,
      timeRanges
    }
  }
}
</script>