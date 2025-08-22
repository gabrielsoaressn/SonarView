<template>
  <div :class="['p-4 rounded-lg border', cardClasses]">
    <div class="flex items-center justify-between">
      <div class="flex items-center">
        <i v-if="icon" :class="[icon, 'text-lg mr-3']"></i>
        <div>
          <p class="text-sm font-medium opacity-75">{{ title }}</p>
          <p class="text-2xl font-bold">
            {{ formattedValue }}{{ suffix }}
          </p>
        </div>
      </div>
      <div v-if="trend" class="flex flex-col items-center">
        <i :class="trendIcon"></i>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'

export default {
  name: 'MetricCard',
  props: {
    title: String,
    value: [String, Number],
    suffix: {
      type: String,
      default: ''
    },
    type: {
      type: String,
      default: 'info'
    },
    trend: String,
    icon: String
  },
  setup(props) {
    const formattedValue = computed(() => {
      if (typeof props.value === 'number') {
        return props.value.toLocaleString('pt-BR')
      }
      return props.value
    })

    const cardClasses = computed(() => {
      switch (props.type) {
        case 'rating':
          return getRatingColors(props.value)
        case 'bugs':
          return props.value === 0 ? 'text-green-600 bg-green-50 border-green-200' : 
                 props.value < 5 ? 'text-yellow-600 bg-yellow-50 border-yellow-200' :
                 'text-red-600 bg-red-50 border-red-200'
        case 'vulnerabilities':
          return props.value === 0 ? 'text-green-600 bg-green-50 border-green-200' :
                 'text-red-600 bg-red-50 border-red-200'
        case 'smells':
          return props.value < 10 ? 'text-green-600 bg-green-50 border-green-200' :
                 props.value < 50 ? 'text-yellow-600 bg-yellow-50 border-yellow-200' :
                 'text-red-600 bg-red-50 border-red-200'
        case 'coverage':
          return props.value >= 80 ? 'text-green-600 bg-green-50 border-green-200' :
                 props.value >= 60 ? 'text-yellow-600 bg-yellow-50 border-yellow-200' :
                 'text-red-600 bg-red-50 border-red-200'
        case 'debt':
          return 'text-orange-600 bg-orange-50 border-orange-200'
        case 'effort':
          return 'text-purple-600 bg-purple-50 border-purple-200'
        case 'duplication':
          return props.value < 5 ? 'text-green-600 bg-green-50 border-green-200' :
                 props.value < 10 ? 'text-yellow-600 bg-yellow-50 border-yellow-200' :
                 'text-red-600 bg-red-50 border-red-200'
        default:
          return 'text-blue-600 bg-blue-50 border-blue-200'
      }
    })

    const trendIcon = computed(() => {
      switch (props.trend) {
        case 'up': return 'fas fa-arrow-up text-green-500'
        case 'down': return 'fas fa-arrow-down text-red-500'
        case 'stable': return 'fas fa-minus text-gray-500'
        default: return ''
      }
    })

    const getRatingColors = (rating) => {
      switch (rating) {
        case 'A': return 'text-green-600 bg-green-50 border-green-200'
        case 'B': return 'text-blue-600 bg-blue-50 border-blue-200'
        case 'C': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
        case 'D': return 'text-orange-600 bg-orange-50 border-orange-200'
        case 'E': return 'text-red-600 bg-red-50 border-red-200'
        default: return 'text-gray-600 bg-gray-50 border-gray-200'
      }
    }

    return {
      formattedValue,
      cardClasses,
      trendIcon
    }
  }
}
</script>