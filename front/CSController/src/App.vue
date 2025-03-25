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
            <v-card-title>Subir Imagen del Jugador</v-card-title>
            <v-card-text>
              <input type="file" @change="handleImageUpload" accept="image/*" />
              <v-btn @click="uploadImage" color="primary">Subir Imagen</v-btn>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </v-app>
</template>

<script>
export default {
  data() {
    return {
      playerSpeed: 5,
      selectedImage: null,
    };
  },
  methods: {
    async updatePlayerSpeed() {
      console.log("Sending speed update request:", this.playerSpeed);

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
          console.error("Error:", errorData);
          alert(`Error al actualizar la velocidad: ${errorData.message}`);
          return;
        }

        const data = await response.json();
        if (data.success) {
          alert("Velocidad actualizada correctamente");
        }
      } catch (error) {
        console.error("Error al actualizar la velocidad:", error);
        alert("Error al actualizar la velocidad");
      }
    },
    handleImageUpload(event) {
      this.selectedImage = event.target.files[0];
    },
    async uploadImage() {
      if (!this.selectedImage) {
        alert("Por favor, selecciona una imagen.");
        return;
      }

      const formData = new FormData();
      formData.append("image", this.selectedImage);

      try {
        const response = await fetch("http://localhost:3000/api/upload-image", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Error:", errorData);
          alert(`Error al subir la imagen: ${errorData.message}`);
          return;
        }

        const data = await response.json();
        if (data.success) {
          alert("Imagen subida correctamente");
        }
      } catch (error) {
        console.error("Error al subir la imagen:", error);
        alert("Error al subir la imagen");
      }
    },
  },
  async created() {
    const response = await fetch("http://localhost:3000/api/player-speed");
    const data = await response.json();
    this.playerSpeed = data.speed;
  },
};
</script>