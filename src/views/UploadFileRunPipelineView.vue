<template>
  <div class="container">
    <h1 class="header">Trigger Pipelines and Upload Files</h1>

    <div class="form-section">
      <!-- File Upload Section -->
      <div class="section">
        <h2>Upload Files</h2>
        <p>Select one or more files to upload:</p>
        <input type="file" multiple @change="handleFileSelection" class="file-input" />

        <!-- Selected Files List -->
        <div v-if="selectedFiles.length > 0" class="selected-files">
    <div v-for="(item, index) in selectedFiles" :key="index" class="file-item">
      <p>{{ item.file.name }}</p>

      <!-- Folder Selection Dropdown -->
      <select v-model="item.folder" class="folder-select">
        <option disabled value="">Select Folder</option>
        <option value="florida blue">Florida Blue</option>
        <option value="aetna">Aetna</option>
        <option value="national-flood">National Flood</option>
      </select>

      <!-- Remove File Button -->
      <button @click="removeFile(index)" class="remove-button">Remove</button>
    </div>
  </div>

        <button
          @click="uploadFiles"
          :disabled="loading || selectedFiles.length === 0 || !allFoldersSelected"
          class="button"
        >
          Upload Files
        </button>

        <!-- Progress Bar Section -->
        <div v-if="fileProgress.length > 0" class="progress-container">
          <div v-for="(progress, index) in fileProgress" :key="index" class="progress-bar-wrapper">
            <p>{{ selectedFiles[index]?.name || 'Uploading...' }}</p>
            <div class="progress-bar">
              <div class="progress" :style="{ width: progress + '%' }"></div>
            </div>
            <p>{{ progress }}%</p>
          </div>
        </div>
      </div>

      <!-- Trigger Pipelines Section -->
      <div class="section">
        <h2>Trigger Process</h2>
        <p>Select one or both options to execute the pipelines:</p>
        <div class="checkbox-group">
          <label>
            <input type="checkbox" v-model="pipelines.runFiles" />
            Run Files
          </label>
          <label>
            <input type="checkbox" v-model="pipelines.updateDatabase" />
            Update Database
          </label>
        </div>
        <button
          @click="runSelectedPipelines"
          :disabled="!isAnyPipelineSelected || loading"
          class="button"
        >
          Execute Selected Process
        </button>
      </div>
    </div>

    <!-- Response and Error Messages -->
    <div v-if="response || error" class="message-section">
      <p v-if="response" class="response">Response: {{ response }}</p>
      <p v-if="error" class="error">Error: {{ error }}</p>
    </div>

    <!-- Loading Overlay -->
    <div v-if="loading" class="overlay">
      <div class="spinner"></div>
      <p class="loading-text">Processing, please wait...</p>
    </div>
  </div>
</template>

<script>
import { BlobServiceClient } from "@azure/storage-blob";
import axios from "axios"; // Import axios for HTTP requests

export default {
  data() {
    return {
      response: null,
      error: null,
      loading: false,
      selectedFiles: [], // Now an array of objects { file: File, folder: '' }
      fileProgress: [], // Tracks upload progress for each file
      pipelines: {
        runFiles: false,
        updateDatabase: false,
      },
    };
  },
  computed: {
    // Check if all selected files have folders assigned
    allFoldersSelected() {
      return this.selectedFiles.every((item) => item.folder !== "");
    },
    // Check if any pipeline is selected
    isAnyPipelineSelected() {
      return this.pipelines.runFiles || this.pipelines.updateDatabase;
    },
  },
  methods: {
    handleFileSelection(event) {
      const newFiles = Array.from(event.target.files).map((file) => ({
        file,
        folder: "",
      }));
      this.selectedFiles = [...this.selectedFiles, ...newFiles];
      this.fileProgress = [...this.fileProgress, ...new Array(newFiles.length).fill(0)];
    },
    removeFile(index) {
      this.selectedFiles.splice(index, 1);
      this.fileProgress.splice(index, 1);
    },
    async uploadFiles() {
  if (!this.selectedFiles.length || !this.allFoldersSelected) {
    this.error = "Please ensure all files have a folder assigned.";
    return;
  }

  this.loading = true; // Set loading state to true
  this.error = null; // Reset previous error

  try {
    // Define your storage account URL and container name
    const accountURL = import.meta.env["VITE_APP_AZURE_STORAGE_ACCOUNT_URL"];
    const containerName = import.meta.env["VITE_APP_AZURE_CONTAINER_NAME"];
    const sasToken = import.meta.env["VITE_APP_AZURE_STORAGE_SAS_TOKEN"]; // Replace with your SAS token


    // Initialize BlobServiceClient with the account URL and SAS token
    const blobServiceClient = new BlobServiceClient(`${accountURL}?${sasToken}`);

    // Get the container client using the container name
    const containerClient = blobServiceClient.getContainerClient(containerName);

    // Alternatively, you can create the ContainerClient directly
    // const containerURL = `${accountURL}/${containerName}`;
    // const containerClient = new ContainerClient(`${containerURL}?${sasToken}`);

    for (const [index, item] of this.selectedFiles.entries()) {
      const folder = item.folder;
      const file = item.file;

      if (!folder) {
        this.error = "All files must have a folder assigned.";
        return;
      }

      const blobName = `input_files/${folder}/${file.name}`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      console.log(`Uploading to blob: ${blobName}`); // Debug log to verify blob name

      // Upload each file
      await blockBlobClient.uploadBrowserData(file, {
        onProgress: (progressEvent) => {
          if (progressEvent.loadedBytes && file.size) {
            this.fileProgress[index] = Math.round(
              (progressEvent.loadedBytes / file.size) * 100
            );
          }
        },
      });
    }

    this.response = "Files uploaded successfully!";
  } catch (err) {
    console.error("Error uploading files:", err);
    this.error = "Failed to upload files.";
  } finally {
    this.loading = false; // Reset loading state
    this.selectedFiles = []; // Clear selected files
    this.fileProgress = []; // Reset progress tracking
  }
},
    async runSelectedPipelines() {
      this.response = null // Reset previous response
      this.error = null // Reset previous error
      this.loading = true // Set loading state to true

      try {
        // Execute pipelines based on the selected checkboxes
        if (this.pipelines.runFiles) {
          await this.executePipeline('trigger_automation')
        }
        if (this.pipelines.updateDatabase) {
          await this.executePipeline('update_sql')
        }
        this.response = 'Selected pipelines executed successfully!'
      } catch (err) {
        this.error = err.response?.data?.message || 'Failed to trigger process.'
      } finally {
        this.loading = false // Reset loading state
      }
    },
    async executePipeline(pipelineName) {
      await axios.post(
        `https://caley-function-app-centralus.azurewebsites.net/api/execute_pipeline?pipeline_name=${pipelineName}`,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    },
  },
}
</script>

<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
  text-align: center;
  background: #f8f9fa;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header {
  font-size: 24px;
  margin-bottom: 20px;
  color: #333;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section {
  background: #ffffff;
  padding: 15px 20px;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  text-align: left;
}

.section h2 {
  font-size: 20px;
  color: #007bff;
  margin-bottom: 10px;
}

.section p {
  font-size: 14px;
  color: #555;
  margin-bottom: 15px;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 15px;
}

.checkbox-group label {
  font-size: 14px;
  color: #333;
}

.file-input {
  display: block;
  margin-bottom: 10px;
}

.button {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  cursor: pointer;
  border-radius: 4px;
  font-size: 14px;
  transition: background-color 0.2s;
}

.button:disabled {
  background-color: #aaa;
  cursor: not-allowed;
}

.button:hover:not(:disabled) {
  background-color: #0056b3;
}

.progress-container {
  margin-top: 20px;
}

.progress-bar-wrapper {
  margin-bottom: 15px;
}

.progress-bar {
  width: 100%;
  height: 10px;
  background-color: #f3f3f3;
  border-radius: 5px;
  overflow: hidden;
  margin-top: 5px;
}

.progress {
  height: 100%;
  background-color: #007bff;
  transition: width 0.3s ease;
}

.response {
  color: #28a745;
  font-weight: bold;
}

.error {
  color: #dc3545;
  font-weight: bold;
}

.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-radius: 50%;
  border-top: 4px solid #007bff;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.loading-text {
  color: white;
  font-size: 16px;
  margin-top: 10px;
}
</style>
