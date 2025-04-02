<template>
  <v-app>
    <v-main>
      <v-container>
        <v-row>
          <!-- Sección existente de velocidad del jugador -->
          <v-col cols="12" md="6">
            <v-card>
              <v-card-title class="primary white--text">
                Control del Juego
              </v-card-title>
              <v-card-text>
                <v-text-field
                  v-model.number="playerSpeed"
                  label="Velocidad del Jugador"
                  type="number"
                  outlined
                  class="mt-4"
                ></v-text-field>
                <v-btn 
                  @click="updatePlayerSpeed" 
                  color="primary"
                  block
                >
                  Actualizar Velocidad
                </v-btn>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Sección existente de gestión de imágenes -->
          <v-col cols="12" md="6">
            <v-card>
              <v-card-title class="primary white--text">
                Gestión de Skins
              </v-card-title>
              <v-card-text>
                <v-tabs v-model="imageTab" grow>
                  <v-tab value="upload">Subir Skin</v-tab>
                  <v-tab value="select">Seleccionar Skin</v-tab>
                </v-tabs>

                <v-window v-model="imageTab" class="mt-4">
                  <v-window-item value="upload">
                    <v-file-input
                      v-model="selectedImage"
                      accept="image/*"
                      label="Seleccionar archivo de skin"
                      prepend-icon="mdi-image"
                      outlined
                      class="mb-4"
                    ></v-file-input>
                    <v-btn 
                      @click="uploadImage" 
                      color="primary"
                      :disabled="!selectedImage"
                      block
                    >
                      Subir Skin
                    </v-btn>
                  </v-window-item>

                  <v-window-item value="select">
                    <v-subheader class="pl-0">Skins Disponibles</v-subheader>
                    <div class="image-grid">
                      <v-card
                        v-for="image in existingImages"
                        :key="image.id"
                        class="image-card"
                        @click="selectExistingImage(image)"
                        :class="{ 'selected-skin': selectedImageUrl === image.image_url }"
                      >
                        <v-img
                          :src="image.image_url"
                          height="150"
                          contain
                        ></v-img>
                        <v-card-actions class="justify-center">
                          <v-chip small>
                            {{ getUsageCount(image.image_url) }} usos
                          </v-chip>
                        </v-card-actions>
                      </v-card>
                    </div>
                  </v-window-item>
                </v-window>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Nueva sección de estadísticas -->
          <v-col cols="12">
            <v-card>
              <v-card-title class="primary white--text">
                Estadísticas de Skins
              </v-card-title>
              <v-card-text>
                <v-row>
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
                      outlined
                      dense
                      @update:modelValue="loadSkinStats"
                    ></v-select>
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-select
                      v-model="statsLimit"
                      :items="[5, 10, 20, 50]"
                      label="Mostrar"
                      outlined
                      dense
                      @update:modelValue="loadSkinStats"
                    ></v-select>
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-btn 
                      @click="loadSkinStats" 
                      color="primary"
                      block
                    >
                      Actualizar Estadísticas
                    </v-btn>
                  </v-col>
                </v-row>

                <v-data-table
                  :headers="skinStatsHeaders"
                  :items="skinStats"
                  :loading="loadingStats"
                  :items-per-page="statsLimit"
                  loading-text="Cargando estadísticas..."
                  no-data-text="No hay datos de estadísticas disponibles"
                  class="elevation-1 mt-4"
                >
                  <template v-slot:item._id="{ item }">
                    <div class="d-flex align-center">
                      <v-img
                        :src="item._id"
                        height="50"
                        width="50"
                        contain
                        class="mr-4"
                      ></v-img>
                      <span class="text-truncate" style="max-width: 200px;">
                        {{ item._id.split('/').pop() }}
                      </span>
                    </div>
                  </template>
                  <template v-slot:item.count="{ item }">
                    <v-chip color="primary">
                      {{ item.count }} usos
                    </v-chip>
                  </template>
                  <template v-slot:item.last_used="{ item }">
                    {{ formatDate(item.last_used) }}
                  </template>
                  <template v-slot:item.actions="{ item }">
                    <v-btn
                      icon
                      small
                      @click="selectStatsImage(item._id)"
                    >
                      <v-icon>mdi-check</v-icon>
                    </v-btn>
                  </template>
                </v-data-table>

                <v-divider class="my-4"></v-divider>

                <v-row v-if="skinStats.length > 0">
                  <v-col cols="12">
                    <v-card>
                      <v-card-title class="subtitle-1">
                        Distribución de Uso
                      </v-card-title>
                      <v-card-text>
                        <pie-chart
                          :data="skinStatsChartData"
                          :options="chartOptions"
                          style="height: 300px;"
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

      <v-snackbar v-model="snackbar.show" :color="snackbar.color">
        {{ snackbar.message }}
        <template v-slot:action="{ attrs }">
          <v-btn text v-bind="attrs" @click="snackbar.show = false">
            Cerrar
          </v-btn>
        </template>
      </v-snackbar>
    </v-main>
  </v-app>
</template>

<script>
import PieChart from './components/PieChart.vue';

export default {
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
.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  margin: 16px 0;
}

.image-card {
  cursor: pointer;
  transition: all 0.3s ease;
}

.image-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.selected-skin {
  border: 2px solid var(--v-primary-base);
  box-shadow: 0 0 0 2px var(--v-primary-lighten4);
}

.v-data-table >>> .v-data-table__wrapper tbody tr:hover {
  background-color: rgba(0, 0, 0, 0.02);
}
</style>