<template>
  <div class="container">
    <!-- File Upload Section -->
    <div class="form-section">
      <label for="file-input" class="file-upload-label">
        <i class="fas fa-cloud-upload-alt"></i>
        Click to select files
      </label>
      <input id="file-input" type="file" multiple @change="handleFileSelect" class="file-input" />
      <p v-if="selectedFiles.length" class="file-info">
        Selected Files: {{ selectedFiles.map((file) => file.name).join(', ') }}
      </p>
    </div>

    <!-- File Configuration Section -->
    <div v-if="selectedFiles.length" class="file-config-section">
      <h2>Configure Each File</h2>
      <div v-for="(fileConfig, index) in fileConfigs" :key="index" class="file-config">
        <div class="file-details">
          <p>
            <strong>{{ fileConfig.file.name }}</strong>
          </p>
          <div v-if="uploading && uploadProgress[fileConfig.file.name]">
            <progress :value="uploadProgress[fileConfig.file.name]" max="100"></progress>
            <span>{{ uploadProgress[fileConfig.file.name] }}%</span>
          </div>
        </div>

        <div class="dropdowns">
          <label class="dropdown-label">Select Folder:</label>
          <select v-model="fileConfig.folder" @change="handleFolderChange(index)" class="dropdown">
            <option value="" disabled>Select Folder</option>
            <option value="MVR">MVR</option>
            <option value="Services & Deductions">Services & Deductions</option>
            <option value="Company Statements">Company Statements</option>
          </select>

          <div v-if="fileConfig.folder === 'MVR'" class="dropdown-group">
            <label class="dropdown-label">Select Company:</label>
            <select v-model="fileConfig.company" class="dropdown">
              <option value="AmWINS">AmWINS</option>
              <option value="Bristol W Ins Co">Bristol W Ins Co</option>
              <option value="Infinity Ins Co">Infinity Ins Co</option>
              <option value="United Automobile Ins Co">United Automobile Ins Co</option>
              <option value="National Flood Ins Co">National Flood Ins Co</option>
              <option value="Progressive Amer Ins Co">Progressive Amer Ins Co</option>
              <option value="Responsive Auto Ins Co">Responsive Auto Ins Co</option>
            </select>
          </div>

          <div v-else-if="fileConfig.folder === 'Company Statements'" class="dropdown-group">
            <label class="dropdown-label">Select Company:</label>
            <select v-model="fileConfig.company" class="dropdown">
              <option value="Aetna Hlth Inc FL Corp">Aetna Hlth Inc FL Corp</option>
              <option value="Aetna Override">Aetna Override</option>
              <option value="Ambetter">Ambetter</option>
              <option value="Ameritas Mut Holding Grp">Ameritas Mut Holding Grp</option>
              <option value="American Integrity Ins Co">American Integrity Ins Co</option>
              <option value="AmWINS Access">AmWINS Access</option>
              <option value="Appalachian Ins Co">Appalachian Ins Co</option>
              <option value="ASCENDANT BUSINESS INSURANCE SOLUTIONS">
                ASCENDANT BUSINESS INSURANCE SOLUTIONS
              </option>
              <option value="BASS UNDER WRITERS">BASS UNDER WRITERS</option>
              <option value="Bristol W Ins Co">Bristol W Ins Co</option>
              <option value="Cigna Hlth Grp">Cigna Hlth Grp</option>
              <option value="Citizens Prop Ins Corp">Citizens Prop Ins Corp</option>
              <option value="Florida Blue">Florida Blue</option>
              <option value="Geico Ind Co">Geico Ind Co</option>
              <option value="Geovera Holdings Inc Grp">Geovera Holdings Inc Grp</option>
              <option value="Granada Ins Co">Granada Ins Co</option>
              <option value="HAGERTY">HAGERTY</option>
              <option value="Infinity Ind Ins Co">Infinity Ind Ins Co</option>
              <option value="Molina Hlthcare Of FL Inc">Molina Hlthcare Of FL Inc</option>
              <option value="Monarch Ins Co Inc">Monarch Ins Co Inc</option>
              <option value="National Automotive Ins Co">National Automotive Ins Co</option>
              <option value="National Flood Ins Co">National Flood Ins Co</option>
              <option value="Next Insurance US COMPANY">Next Insurance US COMPANY</option>
              <option value="Oscar Ins Corp">Oscar Ins Corp</option>
              <option value="Oscar Override">Oscar Override</option>
              <option value="Progressive Amer Ins Co">Progressive Amer Ins Co</option>
              <option value="Responsive Auto Ins Co">Responsive Auto Ins Co</option>
              <option value="Security First Ins Co">Security First Ins Co</option>
              <option value="Slide Ins Co">Slide Ins Co</option>
              <option value="Southern Oak Ins Co">Southern Oak Ins Co</option>
              <option value="THIMBLE INSURANCE">THIMBLE INSURANCE</option>
              <option value="Traverlers">Traverlers</option>
              <option value="United Automobile Ins Co">United Automobile Ins Co</option>
              <option value="United HealthCare">United HealthCare</option>
              <option value="US ASSURE">US ASSURE</option>
              <option value="Wright Natl Flood Ins Co">Wright Natl Flood Ins Co</option>
            </select>
          </div>

          <div v-else-if="fileConfig.folder === 'Services & Deductions'" class="info-text">
            No company selection needed for Services & Deductions.
          </div>
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
          :class="{
            'upload-success': result.status === 'success',
            'upload-failed': result.status === 'failed',
          }"
        >
          {{ result.fileName }}: {{ result.message }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import axios from 'axios'

export default {
  data() {
    return {
      selectedFiles: [],
      fileConfigs: [],
      uploading: false,
      uploadResponse: null,
      uploadResults: [],
      uploadProgress: {},
    }
  },
  methods: {
    handleFileSelect(event) {
      const files = Array.from(event.target.files)
      this.selectedFiles = files
      this.fileConfigs = files.map((file) => ({
        file,
        folder: '',
        company: '',
      }))
    },
    handleFolderChange(index) {
      const folder = this.fileConfigs[index].folder
      if (folder !== 'MVR' && folder !== 'Company Statements') {
        this.fileConfigs[index].company = ''
      }
    },
    async uploadFiles() {
      this.uploading = true
      this.uploadResponse = null
      this.uploadResults = []

      for (let i = 0; i < this.fileConfigs.length; i++) {
        const config = this.fileConfigs[i]
        const formData = new FormData()
        formData.append('file', config.file)
        formData.append('folder', config.folder)
        formData.append('company', config.company)

        try {
          const response = await axios.post('https://dev.rocox.co/api/upload_files', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
              const percentComplete = Math.round((progressEvent.loaded * 100) / progressEvent.total)
              this.uploadProgress[config.file.name] = percentComplete
            },
          })

          this.uploadResults.push({
            fileName: config.file.name,
            status: 'success',
            message: 'Uploaded successfully',
          })
        } catch (error) {
          console.error(`Error uploading file '${config.file.name}':`, error.message)
          this.uploadResults.push({
            fileName: config.file.name,
            status: 'failed',
            message: 'Upload failed',
          })
        }
      }

      this.uploadResponse = 'File upload process completed.'
      this.uploading = false
    },
  },
}
</script>

<style scoped>
.container {
  max-width: 800px;
  margin: 20px auto;
  padding: 20px;
  font-family: Arial, sans-serif;
  background: #ffffff;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  color: #333;
}

.header {
  text-align: center;
  font-size: 28px;
  font-weight: bold;
  margin-bottom: 20px;
  color: #007bff;
}

/* File Upload Section */
.file-upload-label {
  display: block;
  text-align: center;
  background-color: #007bff;
  color: white;
  padding: 15px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  transition: background-color 0.3s ease;
}

.file-upload-label:hover {
  background-color: #0056b3;
}

.file-input {
  display: none;
}

.file-info {
  margin-top: 10px;
  font-size: 14px;
  color: #555;
}

/* Dropdown Section */
.file-config {
  margin: 15px 0;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: #f9f9f9;
}

.dropdown-label {
  display: block;
  margin: 5px 0;
  font-size: 14px;
  font-weight: bold;
}

.dropdown {
  width: 100%;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ccc;
  font-size: 14px;
}

.dropdown-group {
  margin-top: 10px;
}

.info-text {
  font-size: 14px;
  color: #555;
}

/* Submit Section */
.upload-button {
  background-color: #28a745;
  color: white;
  font-size: 16px;
  font-weight: bold;
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.upload-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.upload-button:hover:not(:disabled) {
  background-color: #218838;
}

/* Upload Results */
.upload-results {
  list-style: none;
  padding: 0;
}

.upload-success {
  color: #28a745;
}

.upload-failed {
  color: #dc3545;
}
</style>
