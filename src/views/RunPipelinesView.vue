<template>
  <div class="container">
    <h1 class="header">Trigger Pipelines and View Files</h1>

    <div class="form-section">
      <!-- File List Section -->
      <div class="section file-section">
        <h2>Available Files</h2>
        <div class="file-controls">
          <button @click="fetchFiles" :disabled="loadingFiles" class="refresh-button">
            {{ loadingFiles ? 'Refreshing...' : 'Refresh Files' }}
          </button>
          <label class="select-all">
            <input type="checkbox" v-model="selectAll" @change="toggleSelectAll" />
            Select All
          </label>
        </div>
        <div class="file-list-container">
          <p v-if="loadingFiles" class="loading-text">Refreshing file list...</p>
          <p v-if="errorFiles" class="error">{{ errorFiles }}</p>
          <ul v-if="files.length > 0" class="file-list">
            <li v-for="(file, index) in files" :key="index" class="file-item">
              <input type="checkbox" v-model="selectedFiles" :value="file" />
              {{ getFilename(file) }}
            </li>
          </ul>
          <p v-if="files.length === 0 && !loadingFiles && !errorFiles" class="no-files">
            No files available.
          </p>
        </div>
      </div>

      <!-- Date Picker Section -->
      <div class="section date-section">
        <h2>Select Date</h2>
        <label for="date-picker" class="date-label">Pick a date:</label>
        <input id="date-picker" type="date" v-model="selectedDate" class="date-picker" />
      </div>

      <!-- Trigger Pipelines Section -->
      <div class="section pipeline-section">
        <h2>Trigger Process</h2>
        <p class="pipeline-instruction">Select one or both options to execute the pipelines:</p>
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
          :disabled="!isAnyPipelineSelected || loadingPipelines"
          class="button run-button"
        >
          {{ loadingPipelines ? 'Processing...' : 'Execute Selected Process' }}
        </button>
        <p v-if="errorPipelines" class="error">{{ errorPipelines }}</p>
        <p v-if="responsePipelines" class="response">{{ responsePipelines }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'

export default {
  data() {
    return {
      responsePipelines: null,
      errorPipelines: null,
      loadingPipelines: false,
      responseFiles: null,
      errorFiles: null,
      loadingFiles: false,
      files: [], // Array to hold fetched files
      selectedFiles: [], // Array of selected files
      selectedDate: this.getCurrentDateTime(), // Default to today's date
      pipelines: {
        runFiles: false,
        updateDatabase: false,
      },
      selectAll: false, // Checkbox to toggle select all files
    }
  },
  computed: {
    isAnyPipelineSelected() {
      return this.pipelines.runFiles || this.pipelines.updateDatabase
    },
  },
  methods: {
    getCurrentDateTime() {
      // Get the current date in the format YYYY-MM-DD
      const now = new Date()
      return now.toISOString().split('T')[0]
    },
    formatDateForPipeline(date) {
      // Convert YYYY-MM-DD to '%Y-%m-%dT%H:%M:%S.%f'
      const currentDate = new Date(date)
      const isoString = currentDate.toISOString()
      const [datePart, timePart] = isoString.split('T')
      const formattedTime = timePart.replace('Z', '1Z') // Add .000 before Z
      return `${datePart}T${formattedTime}`
    },
    async fetchFiles() {
      this.loadingFiles = true
      this.errorFiles = null
      try {
        const response = await axios.get('https://cas.rocox.co/api/fetch_files')
        const filesString = response.data
        this.files = filesString.split(',').map((file) => file.trim())
        this.selectAll = false // Reset select all checkbox
        this.selectedFiles = [] // Reset selected files
      } catch (error) {
        console.error('Error fetching files:', error.message)
        this.errorFiles = 'Failed to fetch files.'
      } finally {
        this.loadingFiles = false
      }
    },
    toggleSelectAll() {
      if (this.selectAll) {
        this.selectedFiles = [...this.files] // Select all files
      } else {
        this.selectedFiles = [] // Deselect all files
      }
    },
    getFilename(filePath) {
      return filePath.substring(filePath.lastIndexOf('/') + 1)
    },
    async runSelectedPipelines() {
      this.responsePipelines = null
      this.errorPipelines = null
      this.loadingPipelines = true

      try {
        const formattedDate = this.formatDateForPipeline(this.selectedDate)

        if (this.pipelines.runFiles) {
          // Prepare payload for "Run Files" pipeline
          const payload = {
            paths_to_process: this.selectedFiles.map((file) => `${file}`),
            runDate: formattedDate,
          }
          await this.executePipeline('run_files', payload)
        }

        if (this.pipelines.updateDatabase) {
          // Prepare payload for "Update Database" pipeline
          const payload = {
            paths_to_process: [],
            runDate: '',
          }
          await this.executePipeline('update_sql', payload)
        }

        this.responsePipelines = 'Selected pipelines executed successfully!'
      } catch (error) {
        console.error('Pipeline execution failed:', error.message)
        this.errorPipelines = 'Failed to execute pipelines.'
      } finally {
        this.loadingPipelines = false
      }
    },
    async executePipeline(pipelineName, payload) {
      console.log(payload)
      await axios.post(
        `https://cas.rocox.co/api/execute_pipeline?pipeline_name=${pipelineName}`,
        payload,
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

.section {
  margin-bottom: 20px;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 5px;
  background-color: #f8f9fa;
}

.file-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.select-all {
  font-size: 14px;
  color: #333;
}

.file-list-container {
  margin-top: 10px;
}

.file-list {
  list-style: none;
  padding: 0;
}

.file-item {
  background-color: #fff;
  margin: 5px 0;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  display: flex;
  align-items: center;
}

.date-label {
  font-size: 16px;
  margin-bottom: 8px;
  color: #333;
}

.date-picker {
  display: block;
  padding: 8px;
  font-size: 14px;
  margin-top: 10px;
  width: 100%;
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

.refresh-button {
  background-color: #28a745;
  color: #fff;
  padding: 8px 16px;
}

.error {
  color: red;
}

.response {
  color: green;
}

.loading-text {
  font-size: 14px;
  color: #555;
}

.no-files {
  font-size: 14px;
  color: #777;
}
</style>
