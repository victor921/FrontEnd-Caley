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
          <div
            v-for="(item, index) in selectedFiles"
            :key="index"
            class="file-item"
          >
            <!-- File Name -->
            <p class="file-name">{{ item.file.name }}</p>

            <!-- File Type Selection Dropdown -->
            <div class="field-group">
              <label for="fileType" class="field-label">File Type:</label>
              <select
                v-model="item.type"
                @change="handleFileTypeChange(index)"
                class="type-select"
              >
                <option disabled value="">Select File Type</option>
                <option value="Services & Deductions">Services & Deductions</option>
                <option value="Company Statement">Company Statement</option>
                <option value="MVR">MVR</option>
              </select>
            </div>

            <!-- Sub-Type Dropdown (for specific types) -->
            <div
              v-if="item.type === 'Company Statement' || item.type === 'MVR'"
              class="field-group"
            >
              <label for="subType" class="field-label">Sub-Type:</label>
              <select v-model="item.subType" class="subtype-select">
                <option disabled value="">Select Sub-Type</option>
                <option v-if="item.type === 'Company Statement'" value="florida blue">Florida Blue</option>
                <option v-if="item.type === 'Company Statement'" value="aetna">Aetna</option>
                <option v-if="item.type === 'Company Statement'" value="national flood">National Flood</option>
                <option v-if="item.type === 'MVR'" value="AmWINS">AmWINS</option>
                <option v-if="item.type === 'MVR'" value="Bristol">Bristol</option>
              </select>
            </div>

            <!-- Remove File Button -->
            <button @click="removeFile(index)" class="remove-button">Remove</button>
          </div>
        </div>

        <button
          @click="uploadFiles"
          :disabled="loading || selectedFiles.length === 0 || !allFieldsValid"
          class="button"
        >
          Upload Files
        </button>

        <!-- Progress Bar Section -->
        <div v-if="fileProgress.length > 0" class="progress-container">
          <div
            v-for="(progress, index) in fileProgress"
            :key="index"
            class="progress-bar-wrapper"
          >
            <p>{{ selectedFiles[index]?.file.name || 'Uploading...' }}</p>
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
import axios from "axios";

export default {
  data() {
    window.env = {
      VITE_APP_AZURE_STORAGE_SAS_TOKEN:"%VITE_APP_AZURE_STORAGE_SAS_TOKEN%",
      VITE_APP_AZURE_CONTAINER_NAME:"%VITE_APP_AZURE_CONTAINER_NAME%",
      VITE_APP_AZURE_STORAGE_ACCOUNT_URL:"%VITE_APP_AZURE_STORAGE_ACCOUNT_URL%"
  };
    return {
      response: null,
      error: null,
      loading: false,
      selectedFiles: [], // Array of objects { file, type, subType }
      fileProgress: [], // Tracks upload progress
      pipelines: {
        runFiles: false,
        updateDatabase: false,
      },
    };
  },
  computed: {
    allFieldsValid() {
      return this.selectedFiles.every(
        (item) =>
          item.type !== "" &&
          (item.type !== "MVR" || item.subType !== "") &&
          (item.type !== "Company Statement" || item.subType !== "")
      );
    },
    isAnyPipelineSelected() {
      return this.pipelines.runFiles || this.pipelines.updateDatabase;
    },
  },
  methods: {
    handleFileSelection(event) {
      const newFiles = Array.from(event.target.files).map((file) => ({
        file,
        type: "",
        subType: "",
      }));
      this.selectedFiles = [...this.selectedFiles, ...newFiles];
      this.fileProgress = [...this.fileProgress, ...new Array(newFiles.length).fill(0)];
    },
    handleFileTypeChange(index) {
      this.selectedFiles[index].subType = "";
    },
    removeFile(index) {
      this.selectedFiles.splice(index, 1);
      this.fileProgress.splice(index, 1);
    },
    async uploadFiles() {
      if (!this.allFieldsValid) {
        this.error = "Please ensure all fields are filled correctly.";
        return;
      }

      this.loading = true;
      this.error = null;

      try {
        console.log("All environment variables:", import.meta.env || window.env);

        const accountURL = import.meta.env.VITE_APP_AZURE_STORAGE_ACCOUNT_URL;
        const sasToken = import.meta.env.VITE_APP_AZURE_STORAGE_SAS_TOKEN;
        const containerName = import.meta.env.VITE_APP_AZURE_CONTAINER_NAME;

        const blobServiceClient = new BlobServiceClient(`${accountURL}?${sasToken}`);
        const containerClient = blobServiceClient.getContainerClient(containerName);

        for (const [index, item] of this.selectedFiles.entries()) {
          const file = item.file;
          let path = `input_files/${item.type}`;
          if (item.subType) {
            path += `/${item.subType}`;
          }
          const blobName = `${path}/${file.name}`;
          const blockBlobClient = containerClient.getBlockBlobClient(blobName);

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
      } catch (error) {
        console.error("Upload failed:", error.message);
        this.error = "Failed to upload files.";
      } finally {
        this.loading = false;
        this.selectedFiles = [];
        this.fileProgress = [];
      }
    },
    async runSelectedPipelines() {
      this.response = null;
      this.error = null;
      this.loading = true;

      try {
        if (this.pipelines.runFiles) {
          await this.executePipeline("trigger_automation");
        }
        if (this.pipelines.updateDatabase) {
          await this.executePipeline("update_sql");
        }
        this.response = "Selected pipelines executed successfully!";
      } catch (error) {
        console.error("Pipeline execution failed:", error.message);
        this.error = "Failed to execute pipelines.";
      } finally {
        this.loading = false;
      }
    },
    async executePipeline(pipelineName) {
      await axios.post(
        `https://caley-function-app-centralus.azurewebsites.net/api/execute_pipeline?pipeline_name=${pipelineName}`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    },
  },
};
</script>


<style scoped>
/* Overall Container Styling */
.container {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  color: #333;
}

.header {
  text-align: center;
  color: #007bff;
  font-size: 28px;
  margin-bottom: 20px;
}

.file-input {
  display: block;
  margin: 10px auto;
  padding: 5px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  width: 100%;
  max-width: 400px;
}

.file-item {
  background-color: #f9f9f9;
  margin: 10px 0;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
  display: flex;
  flex-direction: column; /* Stack elements vertically */
  align-items: flex-start; /* Align items to the left */
}

.file-name {
  font-size: 16px;
  font-weight: bold;
  color: #555;
  margin-bottom: 10px;
}

.field-group {
  margin-bottom: 10px;
  width: 100%;
}

.field-label {
  display: block;
  margin-bottom: 5px;
  font-size: 14px;
  color: #333;
}

.type-select,
.subtype-select {
  width: 100%;
  padding: 8px;
  font-size: 14px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: #fff;
}

.remove-button {
  background-color: #dc3545;
  color: #fff;
  border: none;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 4px;
  font-size: 12px;
  align-self: flex-end; /* Align the button to the right */
}

.remove-button:hover {
  background-color: #b02a37;
}

.button {
  background-color: #007bff;
  color: #fff;
  border: none;
  padding: 10px 20px;
  cursor: pointer;
  border-radius: 4px;
  font-size: 14px;
  margin-top: 20px;
  transition: background-color 0.3s;
}

.button:disabled {
  background-color: #aaa;
  cursor: not-allowed;
}

.button:hover:not(:disabled) {
  background-color: #0056b3;
}
</style>
