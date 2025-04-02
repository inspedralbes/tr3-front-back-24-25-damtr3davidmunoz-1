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
        default: () => ({})
      }
    },
    data() {
      return {
        chart: null
      };
    },
    mounted() {
      this.renderChart();
    },
    watch: {
      data: {
        deep: true,
        handler() {
          if (this.chart) {
            this.chart.data = this.data;
            this.chart.update();
          } else {
            this.renderChart();
          }
        }
      },
      options: {
        deep: true,
        handler() {
          if (this.chart) {
            this.chart.options = this.options;
            this.chart.update();
          }
        }
      }
    },
    methods: {
      renderChart() {
        if (this.chart) {
          this.chart.destroy();
        }
        
        const ctx = this.$refs.chartCanvas.getContext('2d');
        this.chart = new Chart(ctx, {
          type: 'pie',
          data: this.data,
          options: this.options
        });
      }
    },
    beforeUnmount() {
      if (this.chart) {
        this.chart.destroy();
      }
    }
  };
  </script>