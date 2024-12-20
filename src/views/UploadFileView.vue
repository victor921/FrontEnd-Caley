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

        <!-- Folder and company selections remain as they are -->
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
      <p v-if="uploadError" class="upload-error">{{ uploadError }}</p>
    </div>
  </div>
</template>

<script>
import axios from 'axios'

export default {
  data() {
    return {
      selectedFiles: [], // Holds the selected files
      fileConfigs: [], // Holds configuration for each file
      uploading: false, // Tracks the upload state
      uploadResponse: null, // Upload success message
      uploadError: null, // Upload error message
      uploadProgress: {},
    }
  },
  methods: {
    handleFileSelect(event) {
      const files = Array.from(event.target.files)
      this.selectedFiles = files

      // Initialize configurations for each selected file
      this.fileConfigs = files.map((file) => ({
        file,
        folder: '', // Default empty folder
        company: '', // Default empty company
      }))
    },
    handleFolderChange(index) {
      // Reset company if folder changes
      const folder = this.fileConfigs[index].folder
      if (folder !== 'MVR' && folder !== 'Company Statements') {
        this.fileConfigs[index].company = '' // No company needed
      }
    },
    async uploadFiles() {
      this.uploading = true
      this.uploadResponse = null
      this.uploadError = null
      this.uploadProgress = {} // An object to track progress by filename

      const results = [] // To store info about each uploaded file

      for (let i = 0; i < this.fileConfigs.length; i++) {
        const config = this.fileConfigs[i]
        const formData = new FormData()
        formData.append('file', config.file)
        formData.append('folder', config.folder)
        formData.append('company', config.company)

        try {
          const response = await axios.post('https://cas.rocox.co/api/upload_files', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
              const percentComplete = Math.round((progressEvent.loaded * 100) / progressEvent.total)
              this.uploadProgress[config.file.name] = percentComplete // Direct assignment
            },
          })

          // If the response contains uploadedFiles info, add it to results.
          if (response.data && response.data.uploadedFiles) {
            results.push(...response.data.uploadedFiles)
          } else {
            // If no uploadedFiles array, just note success.
            results.push({
              fileName: config.file.name,
              status: response.status,
              message: 'Uploaded successfully',
            })
          }
        } catch (error) {
          console.error(`Error uploading file '${config.file.name}':`, error.message)
          results.push({
            fileName: config.file.name,
            status: 'failed',
            message: error.message,
          })
        }
      }

      // After all uploads, update the user with results.
      this.uploadResponse =
        // `File upload process completed.\n` +
        `Uploaded files:\n` + results.map((r) => `${r.fileName}: ${r.message}`).join('\n')

      // Reset state if desired
      this.selectedFiles = []
      this.fileConfigs = []
      this.uploading = false
    },
  },
}
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

/* Form Section Styling */
.form-section {
  margin-bottom: 20px;
}

.file-input {
  display: block;
  width: 100%;
  padding: 10px;
  font-size: 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  margin-bottom: 15px;
  background-color: #f9f9f9;
}

.file-info {
  font-size: 14px;
  color: #555;
}

/* File Configuration Section */
.file-config-section {
  background-color: #f7f8fa;
  padding: 15px;
  border-radius: 10px;
  border: 1px solid #ddd;
  margin-top: 20px;
}

.file-config {
  margin-bottom: 20px;
  padding: 15px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  background-color: #ffffff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.file-config p {
  font-weight: bold;
  margin-bottom: 10px;
  font-size: 16px;
}

label {
  font-size: 14px;
  color: #555;
  font-weight: bold;
  margin-bottom: 5px;
  display: inline-block;
}

select {
  width: 100%;
  padding: 10px;
  font-size: 14px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: #f9f9f9;
  margin-bottom: 15px;
  transition: border-color 0.3s ease-in-out;
}

select:focus {
  border-color: #007bff;
  outline: none;
}

/* Submit Section Styling */
.submit-section {
  text-align: center;
  margin-top: 30px;
}

.upload-button {
  background-color: #007bff;
  color: #ffffff;
  font-size: 16px;
  padding: 12px 30px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition:
    background-color 0.3s ease-in-out,
    transform 0.2s;
}

.upload-button:disabled {
  background-color: #ddd;
  cursor: not-allowed;
}

.upload-button:hover:not(:disabled) {
  background-color: #0056b3;
  transform: scale(1.05);
}

/* Response and Error Messages */
.upload-response {
  margin-top: 15px;
  color: #28a745;
  font-size: 16px;
  font-weight: bold;
}

.upload-error {
  margin-top: 15px;
  color: #dc3545;
  font-size: 16px;
  font-weight: bold;
}

/* Responsive Design */
@media (max-width: 768px) {
  .container {
    padding: 15px;
  }

  .header {
    font-size: 28px;
  }

  .file-config {
    padding: 10px;
  }

  .upload-button {
    padding: 10px 20px;
    font-size: 14px;
  }
}
</style>
