<template>
  <div>
    <canvas ref="chartCanvas"></canvas>
  </div>
</template>

<script>
import { Chart, PieController, ArcElement, Legend, Tooltip } from 'chart.js';

Chart.register(PieController, ArcElement, Legend, Tooltip);

export default {
  name: 'PieChart',
  props: {
    data: {
      type: Object,
      required: true
    },
    options: {
      type: Object,
      default: () => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          }
        },
        animation: {
          animateScale: true,
          animateRotate: true
        }
      })
    }
  },
  data() {
    return {
      chart: null,
      defaultData: {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: []
        }]
      }
    };
  },
  mounted() {
    this.initChart();
  },
  methods: {
    initChart() {
      const ctx = this.$refs.chartCanvas.getContext('2d');
      if (this.chart) {
        this.chart.destroy();
      }
      
      this.chart = new Chart(ctx, {
        type: 'pie',
        data: this.data || this.defaultData,
        options: {
          ...this.defaultOptions,
          ...this.options
        }
      });
    },
    updateChart() {
      if (!this.chart) {
        this.initChart();
        return;
      }

      this.chart.data = this.data || this.defaultData;
      this.chart.options = {
        ...this.defaultOptions,
        ...this.options
      };
      
      this.chart.update('none'); // Usar 'none' para evitar animaciones durante la actualización
    }
  },
  watch: {
    data: {
      handler(newData) {
        if (newData && this.chart) {
          this.updateChart();
        }
      },
      deep: true
    },
    options: {
      handler(newOptions) {
        if (newOptions && this.chart) {
          this.updateChart();
        }
      },
      deep: true
    }
  },
  beforeUnmount() {
    if (this.chart) {
      this.chart.destroy();
    }
  }
};
</script>