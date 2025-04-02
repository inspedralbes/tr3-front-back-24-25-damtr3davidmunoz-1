<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <h1>Bienvenido a CSController</h1>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12" md="6">
        <pie-chart />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import PieChart from '@/components/PieChart.vue'
</script>
