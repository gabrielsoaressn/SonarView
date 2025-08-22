<template>
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
            @click="$emit('refresh')"
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
</template>

<script>
export default {
  name: 'Header',
  props: {
    lastUpdate: Date,
    loading: Boolean
  },
  emits: ['refresh'],
  methods: {
    formatTime(date) {
      return date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    }
  }
}
</script>