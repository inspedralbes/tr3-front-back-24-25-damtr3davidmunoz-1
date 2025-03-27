<template>
  <v-app>
    <v-container>
      <v-row>
        <v-col cols="12">
          <v-card>
            <v-card-title>Control del Juego</v-card-title>
            <v-card-text>
              <v-text-field
                v-model.number="playerSpeed"
                label="Velocidad del Jugador"
                type="number"
                outlined
              ></v-text-field>
              <v-btn @click="updatePlayerSpeed" color="primary">Actualizar</v-btn>
            </v-card-text>
          </v-card>
        </v-col>
        
        <v-col cols="12">
          <v-card>
            <v-card-title>Gestión de Imágenes</v-card-title>
            <v-card-text>
              <v-subheader>Imágenes Disponibles</v-subheader>
              <div class="image-grid">
                <v-card
                  v-for="image in existingImages"
                  :key="image.id"
                  class="image-card"
                  @click="selectExistingImage(image)"
                >
                  <v-img
                    :src="image.image_url"
                    height="150"
                    contain
                  ></v-img>
                </v-card>
              </div>
              
              <v-divider class="my-4"></v-divider>
              
              <v-subheader>Subir Nueva Imagen</v-subheader>
              <v-file-input
                v-model="selectedImage"
                accept="image/*"
                label="Seleccionar archivo"
                prepend-icon="mdi-camera"
                outlined
              ></v-file-input>
              <v-btn 
                @click="uploadImage" 
                color="primary" 
                :disabled="!selectedImage"
                block
              >
                Subir Imagen
              </v-btn>
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
  </v-app>
</template>

<script>
export default {
  data() {
    return {
      playerSpeed: 5,
      selectedImage: null,
      existingImages: [],
      snackbar: {
        show: false,
        message: '',
        color: 'success'
      }
    };
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
        this.showSnackbar("Imagen subida correctamente", "success");
        this.loadExistingImages();
        this.selectedImage = null;
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
        }
      } catch (error) {
        this.showSnackbar("Error al cargar imágenes existentes", "error");
        console.error("Error al cargar imágenes existentes:", error);
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
          throw new Error(errorData.message || "Error al seleccionar imagen");
        }

        const data = await response.json();
        this.showSnackbar("Imagen seleccionada correctamente", "success");
      } catch (error) {
        this.showSnackbar(error.message, "error");
        console.error("Error:", error);
      }
    },
    
    showSnackbar(message, color) {
      this.snackbar.message = message;
      this.snackbar.color = color;
      this.snackbar.show = true;
    }
  },
  async created() {
    const response = await fetch("http://localhost:3000/api/player-speed");
    const data = await response.json();
    this.playerSpeed = data.speed;
    
    this.loadExistingImages();
  }
};
</script>

<style>
.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.image-card {
  cursor: pointer;
  transition: transform 0.2s;
}

.image-card:hover {
  transform: scale(1.05);
}
</style>