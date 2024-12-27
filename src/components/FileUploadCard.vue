<script setup>
const handleFileUpload = (event) => {
  const files = event.target.files;
  console.log("Uploading files:", files);
};
</script>

<template>
  <div class="card">
    <h2>Upload Files</h2>
    <p>Select files to upload them to the system.</p>
    <input type="file" multiple @change="handleFileUpload" />
    <button>Upload</button>
  </div>
</template>

<style scoped>
.card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.card h2 {
  font-size: 1.5rem;
}

.card input {
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 0.5rem;
  font-size: 1rem;
}

.card button {
  background: #4A4AFF;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.3s ease;
}

.card button:hover {
  background: #6A89FF;
}
</style>
