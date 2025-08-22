<template>
  <div class="chart-container">
    <canvas :id="chartId" class="w-full h-64"></canvas>
    <div v-if="!data || data.length === 0" class="absolute inset-0 flex items-center justify-center bg-gray-50 rounded">
      <div class="text-center">
        <i class="fas fa-chart-line text-gray-400 text-4xl mb-2"></i>
        <p class="text-gray-500">Nenhum dado de tendência disponível</p>
      </div>
    </div>
  </div>
</template>

<script>
import { onMounted, onUnmounted, watch, nextTick } from 'vue'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

export default {
  name: 'TrendChart',
  props: {
    data: Array,
    metric: String,
    timeRange: String,
    color: {
      type: String,
      default: '#3B82F6'
    },
    chartId: {
      type: String,
      required: true
    }
  },
  setup(props) {
    let chartInstance = null

    const createChart = async () => {
      await nextTick()
      
      if (!props.data || props.data.length === 0) return
      
      const ctx = document.getElementById(props.chartId)
      if (!ctx) return

      // Destruir gráfico anterior se existir
      if (chartInstance) {
        chartInstance.destroy()
      }

      // Filtrar dados baseado no timeRange
      const filteredData = filterDataByTimeRange(props.data, props.timeRange)
      const chartData = prepareChartData(filteredData, props.metric)

      chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: chartData.labels,
          datasets: [{
            label: getMetricLabel(props.metric),
            data: chartData.values,
            borderColor: props.color,
            backgroundColor: props.color + '20',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: props.color,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: '#F3F4F6'
              },
              ticks: {
                font: {
                  size: 12
                }
              }
            },
            x: {
              grid: {
                color: '#F3F4F6'
              },
              ticks: {
                font: {
                  size: 12
                },
                maxTicksLimit: 10
              }
            }
          },
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              mode: 'index',
              intersect: false,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              titleColor: '#fff',
              bodyColor: '#fff',
              borderColor: props.color,
              borderWidth: 1,
              cornerRadius: 6,
              displayColors: false,
              callbacks: {
                title: function(context) {
                  return `Horário: ${context[0].label}`
                },
                label: function(context) {
                  const label = getMetricLabel(props.metric)
                  let value = context.parsed.y
                  
                  // Formatação específica por tipo de métrica
                  if (props.metric.includes('minutes')) {
                    const hours = Math.floor(value / 60)
                    const minutes = value % 60
                    value = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
                  } else if (props.metric.includes('Ratio')) {
                    value = `${value.toFixed(1)}%`
                  } else if (props.metric === 'ratings') {
                    const ratings = ['', 'E', 'D', 'C', 'B', 'A']
                    value = `${ratings[Math.round(value)]} (${value.toFixed(1)})`
                  }
                  
                  return `${label}: ${value}`
                }
              }
            }
          },
          interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
          },
          elements: {
            point: {
              hoverRadius: 8
            }
          }
        }
      })
    }

    const filterDataByTimeRange = (data, timeRange) => {
      const now = new Date()
      let cutoffTime

      switch (timeRange) {
        case '6h':
          cutoffTime = new Date(now - 6 * 60 * 60 * 1000)
          break
        case '12h':
          cutoffTime = new Date(now - 12 * 60 * 60 * 1000)
          break
        case '24h':
          cutoffTime = new Date(now - 24 * 60 * 60 * 1000)
          break
        case '3d':
          cutoffTime = new Date(now - 3 * 24 * 60 * 60 * 1000)
          break
        case '7d':
          cutoffTime = new Date(now - 7 * 24 * 60 * 60 * 1000)
          break
        default:
          cutoffTime = new Date(now - 24 * 60 * 60 * 1000)
      }

      return data.filter(item => new Date(item.timestamp) > cutoffTime)
    }

    const prepareChartData = (data, metric) => {
      const labels = []
      const values = []

      data.forEach(item => {
        const timestamp = new Date(item.timestamp)
        
        // Formato da label baseado no timeRange
        let labelFormat
        if (props.timeRange === '6h' || props.timeRange === '12h') {
          labelFormat = timestamp.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })
        } else if (props.timeRange === '24h') {
          labelFormat = timestamp.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })
        } else {
          labelFormat = timestamp.toLocaleDateString('pt-BR', { 
            day: '2-digit', 
            month: '2-digit' 
          })
        }
        
        labels.push(labelFormat)
        
        let value = 0
        
        if (metric === 'ratings') {
          // Converter rating para valor numérico para plotagem
          const ratingValues = { A: 5, B: 4, C: 3, D: 2, E: 1 }
          value = (ratingValues[item.reliability.rating] + 
                   ratingValues[item.security.rating] + 
                   ratingValues[item.maintainability.rating]) / 3
        } else {
          // Lidar com métricas aninhadas
          const keys = metric.split('.')
          value = keys.reduce((obj, key) => obj?.[key], item) || 0
        }
        
        values.push(value)
      })

      return { labels, values }
    }

    const getMetricLabel = (metric) => {
      const labels = {
        'technicalDebtMinutes': 'Dívida Técnica (minutos)',
        'reliability.bugs': 'Bugs',
        'security.vulnerabilities': 'Vulnerabilidades',
        'maintainability.codeSmells': 'Code Smells',
        'maintainability.debtRatio': 'Taxa de Dívida (%)',
        'ratings': 'Classificação Média'
      }
      
      return labels[metric] || metric
    }

    onMounted(() => {
      createChart()
    })

    onUnmounted(() => {
      if (chartInstance) {
        chartInstance.destroy()
      }
    })

    watch(() => [props.data, props.metric, props.timeRange, props.color], () => {
      createChart()
    }, { deep: true })

    return {
      createChart
    }
  }
}
</script>

<style scoped>
.chart-container {
  position: relative;
  height: 250px;
  width: 100%;
}
</style>