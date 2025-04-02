<template>
  <v-app>
    <v-app-bar app color="deep-purple" dark elevation="4">
      <v-app-bar-title class="text-h5 font-weight-bold">
        <v-icon size="large" class="mr-2">mdi-sail-boat</v-icon>
        PVP Arena Controller
      </v-app-bar-title>
      <v-spacer></v-spacer>
      <v-btn icon="mdi-refresh" @click="loadExistingImages"></v-btn>
    </v-app-bar>

    <v-main class="bg-grey-lighten-4">
      <v-container fluid>
        <!-- Control Panel - Full Width -->
        <v-row>
          <v-col cols="12">
            <v-card class="elevation-3 rounded-lg gradient-card">
              <v-card-title class="text-h5 bg-deep-purple text-white py-6 rounded-t-lg d-flex align-center">
                <v-icon size="32" class="mr-4">mdi-speedometer</v-icon>
                Control de Velocidad
              </v-card-title>
              <v-card-text class="pa-6">
                <v-row align="center" justify="center">
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model.number="playerSpeed"
                      label="Velocidad del Jugador"
                      type="number"
                      variant="outlined"
                      class="speed-input"
                      hide-details
                      bg-color="white"
                    >
                      <template v-slot:prepend>
                        <v-icon color="deep-purple">mdi-speedometer</v-icon>
                      </template>
                    </v-text-field>
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-btn 
                      @click="updatePlayerSpeed" 
                      color="deep-purple"
                      size="large"
                      block
                      elevation="2"
                      class="px-6 py-3"
                    >
                      <v-icon start class="mr-2">mdi-send</v-icon>
                      Actualizar Velocidad
                    </v-btn>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Skin Management -->
        <v-row class="mt-6">
          <v-col cols="12">
            <v-card class="elevation-3 rounded-lg">
              <v-card-title class="text-h5 bg-indigo text-white py-6 rounded-t-lg d-flex align-center">
                <v-icon size="32" class="mr-4">mdi-palette</v-icon>
                Gestión de Skins
              </v-card-title>
              <v-card-text class="pa-6">
                <v-tabs
                  v-model="imageTab"
                  grow
                  class="mb-6 custom-tabs"
                  color="indigo"
                  bg-color="grey-lighten-4"
                >
                  <v-tab value="upload" class="text-subtitle-1 px-6">
                    <v-icon start class="mr-2">mdi-upload</v-icon>
                    Subir Skin
                  </v-tab>
                  <v-tab value="select" class="text-subtitle-1 px-6">
                    <v-icon start class="mr-2">mdi-view-grid</v-icon>
                    Seleccionar Skin
                  </v-tab>
                </v-tabs>

                <v-window v-model="imageTab">
                  <v-window-item value="upload">
                    <v-row justify="center">
                      <v-col cols="12" md="8">
                        <v-file-input
                          v-model="selectedImage"
                          accept="image/*"
                          label="Seleccionar archivo de skin"
                          prepend-icon="mdi-image"
                          variant="outlined"
                          class="mb-6"
                          hide-details
                          bg-color="white"
                        ></v-file-input>
                        <v-btn 
                          @click="uploadImage" 
                          color="indigo"
                          :disabled="!selectedImage"
                          block
                          size="large"
                          elevation="2"
                          class="px-6 py-3"
                        >
                          <v-icon start class="mr-2">mdi-cloud-upload</v-icon>
                          Subir Skin
                        </v-btn>
                      </v-col>
                    </v-row>
                  </v-window-item>

                  <v-window-item value="select">
                    <div class="image-grid">
                      <v-hover v-for="image in existingImages" :key="image.id">
                        <template v-slot:default="{ isHovering, props }">
                          <v-card
                            v-bind="props"
                            :elevation="isHovering ? 8 : 2"
                            @click="selectExistingImage(image)"
                            :class="{ 'selected-skin': selectedImageUrl === image.image_url }"
                            class="transition-swing skin-card"
                          >
                            <v-img
                              :src="image.image_url"
                              height="180"
                              cover
                              class="bg-grey-lighten-2"
                            >
                              <template v-slot:placeholder>
                                <div class="d-flex align-center justify-center fill-height">
                                  <v-progress-circular indeterminate color="indigo"></v-progress-circular>
                                </div>
                              </template>
                            </v-img>
                            <v-card-actions class="justify-center pa-3">
                              <v-chip
                                color="indigo"
                                size="small"
                                variant="elevated"
                                class="px-4"
                              >
                                <v-icon start size="small">mdi-counter</v-icon>
                                {{ getUsageCount(image.image_url) }} usos
                              </v-chip>
                            </v-card-actions>
                          </v-card>
                        </template>
                      </v-hover>
                    </div>
                  </v-window-item>
                </v-window>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Statistics -->
        <v-row class="mt-6">
          <v-col cols="12">
            <v-card class="elevation-3 rounded-lg">
              <v-card-title class="text-h5 bg-purple text-white py-6 rounded-t-lg d-flex align-center">
                <v-icon size="32" class="mr-4">mdi-chart-box</v-icon>
                Estadísticas de Skins
              </v-card-title>
              <v-card-text class="pa-6">
                <v-row align="center" class="mb-6">
                  <v-col cols="12" md="4">
                    <v-select
                      v-model="statsDaysFilter"
                      :items="[
                        { text: 'Todos los tiempos', value: null },
                        { text: 'Últimos 7 días', value: 7 },
                        { text: 'Últimos 30 días', value: 30 },
                        { text: 'Últimos 90 días', value: 90 }
                      ]"
                      label="Filtrar por"
                      variant="outlined"
                      hide-details
                      bg-color="white"
                      class="stats-select custom-select"
                      density="comfortable"
                      @update:modelValue="loadSkinStats"
                    ></v-select>
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-select
                      v-model="statsLimit"
                      :items="[5, 10, 20, 50]"
                      label="Mostrar"
                      variant="outlined"
                      hide-details
                      bg-color="white"
                      class="stats-select custom-select"
                      density="comfortable"
                      @update:modelValue="loadSkinStats"
                    ></v-select>
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-btn 
                      @click="loadSkinStats" 
                      color="purple"
                      block
                      size="large"
                      elevation="2"
                      class="px-6"
                    >
                      <v-icon start class="mr-2">mdi-refresh</v-icon>
                      Actualizar Estadísticas
                    </v-btn>
                  </v-col>
                </v-row>

                <v-card class="stats-table-card mb-6" elevation="1">
                  <v-data-table
                    :headers="skinStatsHeaders"
                    :items="skinStats"
                    :loading="loadingStats"
                    :items-per-page="statsLimit"
                    loading-text="Cargando estadísticas..."
                    no-data-text="No hay datos de estadísticas disponibles"
                  >
                    <template v-slot:item._id="{ item }">
                      <div class="d-flex align-center">
                        <v-img
                          :src="item._id"
                          height="50"
                          width="50"
                          cover
                          class="mr-4 rounded"
                        ></v-img>
                        <span class="text-subtitle-2">
                          {{ item._id.split('/').pop() }}
                        </span>
                      </div>
                    </template>
                    <template v-slot:item.count="{ item }">
                      <v-chip color="purple" variant="elevated" size="small" class="px-4">
                        {{ item.count }} usos
                      </v-chip>
                    </template>
                    <template v-slot:item.last_used="{ item }">
                      <span class="text-subtitle-2">{{ formatDate(item.last_used) }}</span>
                    </template>
                    <template v-slot:item.actions="{ item }">
                      <v-btn
                        icon
                        color="purple"
                        size="small"
                        variant="flat"
                        @click="selectStatsImage(item._id)"
                      >
                        <v-icon>mdi-check-circle</v-icon>
                      </v-btn>
                    </template>
                  </v-data-table>
                </v-card>

                <v-row v-if="skinStats.length > 0">
                  <v-col cols="12">
                    <v-card class="chart-card" elevation="2">
                      <v-card-title class="text-h6 pa-4 bg-purple-lighten-5">
                        <v-icon start color="purple" class="mr-2">mdi-chart-pie</v-icon>
                        Distribución de Uso
                      </v-card-title>
                      <v-card-text class="pa-6">
                        <pie-chart
                          :data="skinStatsChartData"
                          :options="{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                position: 'right',
                                labels: {
                                  boxWidth: 15,
                                  padding: 15,
                                  font: {
                                    size: 13
                                  }
                                }
                              }
                            }
                          }"
                          style="height: 400px;"
                        ></pie-chart>
                      </v-card-text>
                    </v-card>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>

      <!-- Notifications -->
      <v-snackbar
        v-model="snackbar.show"
        :color="snackbar.color"
        location="top"
        elevation="24"
        rounded="pill"
        timeout="3000"
      >
        <div class="d-flex align-center">
          <v-icon
            :icon="snackbar.color === 'success' ? 'mdi-check-circle' : 'mdi-alert-circle'"
            start
            class="mr-2"
          ></v-icon>
          {{ snackbar.message }}
        </div>
      </v-snackbar>
    </v-main>
  </v-app>
</template>

<script>
import PieChart from './components/PieChart.vue';

export default {
  name: 'App',
  components: {
    PieChart
  },
  data() {
    return {
      playerSpeed: 5,
      selectedImage: null,
      existingImages: [],
      selectedImageUrl: null,
      imageTab: 'select',
      
      // Estadísticas
      skinStats: [],
      loadingStats: false,
      statsDaysFilter: null,
      statsLimit: 5,
      skinStatsHeaders: [
        { text: 'Skin', value: '_id', sortable: false },
        { text: 'Usos', value: 'count', align: 'center' },
        { text: 'Último uso', value: 'last_used', align: 'center' },
        { text: 'Acciones', value: 'actions', align: 'center', sortable: false }
      ],
      chartOptions: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right'
          }
        }
      },
      
      // Snackbar
      snackbar: {
        show: false,
        message: '',
        color: 'success'
      }
    };
  },
  computed: {
    skinStatsChartData() {
      return {
        labels: this.skinStats.map(item => item._id.split('/').pop()),
        datasets: [
          {
            data: this.skinStats.map(item => item.count),
            backgroundColor: [
              '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
              '#9966FF', '#FF9F40', '#8AC249', '#EA5F89',
              '#00BFFF', '#FFD700'
            ]
          }
        ]
      };
    }
  },
  methods: {
    async updatePlayerSpeed() {
      try {
        const response = await fetch("http://localhost:3000/api/player-speed", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ speed: Number(this.playerSpeed) }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Error al actualizar la velocidad");
        }

        const data = await response.json();
        this.showSnackbar("Velocidad actualizada correctamente", "success");
      } catch (error) {
        this.showSnackbar(error.message, "error");
        console.error("Error:", error);
      }
    },
    
    async uploadImage() {
      if (!this.selectedImage) return;

      try {
        const formData = new FormData();
        formData.append("image", this.selectedImage);

        const response = await fetch("http://localhost:3000/api/upload-image", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Error al subir la imagen");
        }

        const data = await response.json();
        this.showSnackbar("Skin subida correctamente", "success");
        this.loadExistingImages();
        this.selectedImage = null;
        this.imageTab = 'select';
      } catch (error) {
        this.showSnackbar(error.message, "error");
        console.error("Error:", error);
      }
    },
    
    async loadExistingImages() {
      try {
        const response = await fetch("http://localhost:3000/api/player-images");
        const data = await response.json();
        
        if (data.success) {
          this.existingImages = data.images;
          // Cargar estadísticas de uso para cada imagen
          await this.loadSkinStats();
        }
      } catch (error) {
        this.showSnackbar("Error al cargar skins existentes", "error");
        console.error("Error al cargar skins existentes:", error);
      }
    },
    
    async selectExistingImage(image) {
      try {
        const response = await fetch("http://localhost:3000/api/select-image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ imageUrl: image.image_url }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Error al seleccionar skin");
        }

        const data = await response.json();
        this.selectedImageUrl = image.image_url;
        this.showSnackbar("Skin seleccionada correctamente", "success");
        // Actualizar estadísticas después de seleccionar
        await this.loadSkinStats();
      } catch (error) {
        this.showSnackbar(error.message, "error");
        console.error("Error:", error);
      }
    },
    
    async selectStatsImage(imageUrl) {
      try {
        const image = this.existingImages.find(img => img.image_url === imageUrl);
        if (image) {
          await this.selectExistingImage(image);
        } else {
          this.showSnackbar("Esta skin no está en la lista actual", "warning");
        }
      } catch (error) {
        this.showSnackbar("Error al seleccionar skin", "error");
        console.error("Error:", error);
      }
    },
    
    async loadSkinStats() {
      this.loadingStats = true;
      try {
        let url = `http://localhost:3000/api/skin-stats?limit=${this.statsLimit}`;
        if (this.statsDaysFilter) {
          url += `&days=${this.statsDaysFilter}`;
        }

        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
          this.skinStats = data.stats;
        } else {
          throw new Error(data.message || "Error al cargar estadísticas");
        }
      } catch (error) {
        this.showSnackbar(error.message, "error");
        console.error("Error:", error);
      } finally {
        this.loadingStats = false;
      }
    },
    
    getUsageCount(imageUrl) {
      const stat = this.skinStats.find(item => item._id === imageUrl);
      return stat ? stat.count : 0;
    },
    
    formatDate(dateString) {
      if (!dateString) return 'Nunca';
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    },
    
    showSnackbar(message, color) {
      this.snackbar.message = message;
      this.snackbar.color = color;
      this.snackbar.show = true;
    }
  },
  async created() {
    // Cargar velocidad inicial
    const speedResponse = await fetch("http://localhost:3000/api/player-speed");
    const speedData = await speedResponse.json();
    this.playerSpeed = speedData.speed;
    
    // Cargar última imagen seleccionada
    const imageResponse = await fetch("http://localhost:3000/api/last-player-image");
    const imageData = await imageResponse.json();
    if (imageData.success && imageData.imageUrl) {
      this.selectedImageUrl = imageData.imageUrl;
    }
    
    // Cargar imágenes existentes y estadísticas
    await this.loadExistingImages();
  }
};
</script>

<style scoped>
.gradient-card {
  background: linear-gradient(135deg, #fff 0%, #f4f0ff 100%);
}

.speed-input {
  font-size: 1.2rem;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 24px;
  padding: 16px 0;
}

.skin-card {
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.skin-card:hover {
  transform: translateY(-4px);
}

.selected-skin {
  border: 3px solid rgb(var(--v-theme-indigo));
}

.stats-select {
  background-color: white;
  border-radius: 8px;
}

.custom-select :deep(.v-field__input) {
  padding-top: 8px !important;
  padding-bottom: 8px !important;
  font-size: 0.95rem;
}

.custom-select :deep(.v-field__outline) {
  --v-field-border-width: 1px;
}

.custom-select :deep(.v-field__overlay) {
  display: none;
}

.custom-tabs {
  border: 1px solid rgb(var(--v-theme-indigo));
}

.custom-tabs :deep(.v-tab) {
  opacity: 1;
  border-radius: 0;
  font-weight: 500;
  min-height: 48px;
}

.custom-tabs :deep(.v-tab--selected) {
  background-color: rgb(var(--v-theme-indigo));
  color: white;
}

.custom-tabs :deep(.v-tab:not(.v-tab--selected)) {
  background-color: var(--v-theme-grey-lighten-4);
  color: rgb(var(--v-theme-indigo));
}

.stats-table-card {
  border-radius: 8px;
  overflow: hidden;
}

.chart-card {
  border-radius: 12px;
  overflow: hidden;
}

.v-card-title {
  letter-spacing: 0.5px;
}

.v-btn {
  text-transform: none;
  letter-spacing: 0.5px;
  font-weight: 500;
}

:deep(.v-data-table) {
  background-color: white !important;
}

:deep(.v-data-table-header) {
  background-color: #f5f5f5 !important;
}

:deep(.v-data-table-header th) {
  font-weight: 600 !important;
  color: rgba(0, 0, 0, 0.87) !important;
  text-transform: uppercase;
  font-size: 0.875rem !important;
}
</style>