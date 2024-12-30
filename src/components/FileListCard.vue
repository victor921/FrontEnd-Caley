<script setup>
import { ref, onMounted } from 'vue';

const files = ref([]);
const fetchFiles = async () => {
  try {
    const response = await fetch("https://dev.rocox.co/api/fetch_files?folder=input_files/");
    files.value = await response.json();
  } catch (error) {
    console.error("Error fetching files:", error);
  }
};

onMounted(fetchFiles);
</script>

<template>
  <div class="card">
    <h2>Uploaded Files</h2>
    <p v-if="!files.length">No files found in this folder.</p>
    <ul v-else>
      <li v-for="file in files" :key="file">{{ file }}</li>
    </ul>
  </div>
</template>

<style scoped>
.card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}

.card h2 {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.card ul {
  list-style-type: none;
  padding: 0;
}

.card ul li {
  padding: 0.5rem 0;
  border-bottom: 1px solid #eee;
}
</style>
