<template>
  <div class="container">
    <h1 class="header">Upload Files with Folder and Company Selection</h1>

    <!-- File Upload Section -->
    <div class="form-section">
      <input type="file" multiple @change="handleFileSelect" class="file-input" />
      <p v-if="selectedFiles.length" class="file-info">
        Selected Files: {{ selectedFiles.map((file) => file.name).join(', ') }}
      </p>
    </div>

    <!-- File Configuration Section -->
    <div v-if="selectedFiles.length" class="file-config-section">
      <h2>Configure Each File</h2>
      <div v-for="(fileConfig, index) in fileConfigs" :key="index" class="file-config">
        <p>
          <strong>{{ fileConfig.file.name }}</strong>
        </p>
        <!-- Display progress bar if uploading -->
        <div v-if="uploading && uploadProgress[fileConfig.file.name]">
          <progress :value="uploadProgress[fileConfig.file.name]" max="100"></progress>
          <span>{{ uploadProgress[fileConfig.file.name] }}%</span>
        </div>

        <!-- Folder and company selections -->
        <label>Folder:</label>
        <select v-model="fileConfig.folder" @change="handleFolderChange(index)">
          <option value="" disabled>Select Folder</option>
          <option value="MVR">MVR</option>
          <option value="Services & Deductions">Services & Deductions</option>
          <option value="Company Statements">Company Statements</option>
        </select>

        <div v-if="fileConfig.folder === 'MVR'">
          <label>Company:</label>
          <select v-model="fileConfig.company">
            <option value="AmWINS">AmWINS</option>
            <option value="Bristol W Ins Co">Bristol W Ins Co</option>
            <option value="Infinity Ins Co">Infinity Ins Co</option>
          </select>
        </div>

        <div v-else-if="fileConfig.folder === 'Company Statements'">
          <label>Company:</label>
          <select v-model="fileConfig.company">
            <option value="Florida Blue">Florida Blue</option>
            <option value="Ambetter">Ambetter</option>
            <option value="Slide Ins Co">Slide Ins Co</option>
          </select>
        </div>

        <div v-else-if="fileConfig.folder === 'Services & Deductions'">
          <p>No company selection needed for Services & Deductions.</p>
        </div>
      </div>
    </div>

    <!-- Submit Section -->
    <div class="submit-section">
      <button
        @click="uploadFiles"
        :disabled="!selectedFiles.length || uploading"
        class="upload-button"
      >
        {{ uploading ? 'Uploading...' : 'Upload Files' }}
      </button>
      <p v-if="uploadResponse" class="upload-response">{{ uploadResponse }}</p>
      <ul class="upload-results">
        <li
          v-for="(result, index) in uploadResults"
          :key="index"
          :class="{ 'upload-success': result.status === 'success', 'upload-failed': result.status === 'failed' }"
        >
          {{ result.fileName }}: {{ result.message }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  data() {
    return {
      selectedFiles: [], // Holds the selected files
      fileConfigs: [], // Holds configuration for each file
      uploading: false, // Tracks the upload state
      uploadResponse: null, // Upload success message
      uploadResults: [], // Upload results for each file
      uploadProgress: {}, // Tracks upload progress per file
    };
  },
  methods: {
    handleFileSelect(event) {
      const files = Array.from(event.target.files);
      this.selectedFiles = files;

      // Initialize configurations for each selected file
      this.fileConfigs = files.map((file) => ({
        file,
        folder: '', // Default empty folder
        company: '', // Default empty company
      }));
    },
    handleFolderChange(index) {
      // Reset company if folder changes
      const folder = this.fileConfigs[index].folder;
      if (folder !== 'MVR' && folder !== 'Company Statements') {
        this.fileConfigs[index].company = ''; // No company needed
      }
    },
    async uploadFiles() {
      this.uploading = true;
      this.uploadResponse = null;
      this.uploadResults = []; // Reset results

      for (let i = 0; i < this.fileConfigs.length; i++) {
        const config = this.fileConfigs[i];
        const formData = new FormData();
        formData.append('file', config.file);
        formData.append('folder', config.folder);
        formData.append('company', config.company);

        try {
          const response = await axios.post('https://dev.rocox.co/api/upload_files', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
              const percentComplete = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              this.uploadProgress[config.file.name] = percentComplete;
            },
          });

          // Add success result
          this.uploadResults.push({
            fileName: config.file.name,
            status: 'success',
            message: 'Uploaded successfully',
          });
        } catch (error) {
          console.error(`Error uploading file '${config.file.name}':`, error.message);
          // Add failure result
          this.uploadResults.push({
            fileName: config.file.name,
            status: 'failed',
            message: 'Upload failed',
          });
        }
      }

      this.uploadResponse = 'File upload process completed.';
      this.uploading = false;
    },
  },
};
</script>

<style scoped>
/* Overall Container Styling */
.container {
  max-width: 800px;
  margin: 20px auto;
  padding: 20px;
  font-family: 'Arial', sans-serif;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  color: #333;
}

/* Header Styling */
.header {
  text-align: center;
  font-size: 32px;
  font-weight: bold;
  margin-bottom: 30px;
  color: #007bff;
}

/* File Results Styling */
.upload-results {
  list-style-type: none;
  padding: 0;
  margin: 15px 0;
}

.upload-results li {
  font-size: 16px;
  margin: 5px 0;
}

.upload-success {
  color: #28a745; /* Green for success */
}

.upload-failed {
  color: #dc3545; /* Red for failure */
}

/* Other Existing Styles... */
/* Include the remaining styles from your current setup here */
</style>
