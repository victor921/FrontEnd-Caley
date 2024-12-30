<template>
  <div class="container">
    <div class="row">
      <!-- Column 1: Available Files -->
      <div class="column">
        <div class="card">
          <h2 class="card-header">Available Files</h2>
          <div class="card-content">
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
                <li v-for="(fileObj, index) in files" :key="index" class="file-item">
                  <input type="checkbox" v-model="selectedFiles" :value="fileObj" />
                  <span class="preserve-spaces">{{ fileObj.fileName }}</span>
                  <span v-if="fileObj.folder || fileObj.company">
                    ({{ fileObj.folder }}{{ fileObj.company }})
                  </span>
                </li>
              </ul>
              <p v-if="files.length === 0 && !loadingFiles && !errorFiles" class="no-files">
                No files available.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Column 2: Other Cards -->
      <div class="column">
        <!-- Date Picker Card -->
        <div class="card">
          <h2 class="card-header">Select Date</h2>
          <div class="card-content">
            <label for="date-picker" class="date-label">Pick a date:</label>
            <input id="date-picker" type="date" v-model="selectedDate" class="date-picker" />
          </div>
        </div>

        <!-- Pipeline Trigger Card -->
        <div class="card">
          <h2 class="card-header">Trigger Process</h2>
          <div class="card-content">
            <p class="pipeline-instruction">Select one or more options to execute the pipelines:</p>
            <div class="checkbox-group">
              <label class="checkbox-item">
                <input type="checkbox" v-model="pipelines.runFiles" />
                Run Files
              </label>
              <label class="checkbox-item">
                <input type="checkbox" v-model="pipelines.updateDatabase" />
                Update Database
              </label>
              <label class="checkbox-item">
                <input type="checkbox" v-model="pipelines.binderVerification" />
                Run Binder Verification (Under Development)
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
      files: [],
      selectedFiles: [],
      selectedDate: this.getCurrentDateTime(),
      pipelines: {
        runFiles: false,
        updateDatabase: false,
      },
      selectAll: false,
    }
  },
  computed: {
    isAnyPipelineSelected() {
      return this.pipelines.runFiles || this.pipelines.updateDatabase
    },
  },
  methods: {
    getCurrentDateTime() {
      const now = new Date()
      return now.toISOString().split('T')[0]
    },

    formatDateForPipeline(date) {
      const currentDate = new Date(date)
      const isoString = currentDate.toISOString()
      const [datePart, timePart] = isoString.split('T')
      const formattedTime = timePart.replace('Z', '1Z')
      return `${datePart}T${formattedTime}`
    },

    async fetchFiles() {
      this.loadingFiles = true
      this.errorFiles = null
      try {
        const response = await axios.get("https://dev.rocox.co/api/fetch_files");

        // Ensure response is an array
        if (!Array.isArray(response.data)) {
          throw new Error("Expected an array from the backend, but got something else.");
        }

        // Map the file paths into objects without altering spaces
        this.files = response.data.map((path) => {
          const parts = path.split('/');
          const fileName = parts.pop(); // Extract the file name exactly as is
          const companyName = parts.length > 1 ? parts.pop() : ''; // Extract company name if available
          let folderName = parts.length > 2 ? parts.pop() : '';
          if (path.includes('Services & Deductions')) {
            folderName = 'Services & Deductions';
          } else {
            folderName += ' => ';
          }
          return {
            path,
            folder: folderName,
            company: companyName,
            fileName, // Include the exact file name as its own property
          };
        });

        this.selectAll = false
        this.selectedFiles = []
      } catch (error) {
        console.error("Error fetching files:", error.message)
        this.errorFiles = "Failed to fetch files."
      } finally {
        this.loadingFiles = false
      }
    },

    toggleSelectAll() {
      if (this.selectAll) {
        this.selectedFiles = [...this.files]
      } else {
        this.selectedFiles = []
      }
    },

    async runSelectedPipelines() {
      this.responsePipelines = null
      this.errorPipelines = null
      this.loadingPipelines = true
      try {
        const formattedDate = this.formatDateForPipeline(this.selectedDate)

        if (this.pipelines.runFiles) {
          const payload = {
            paths_to_process: this.selectedFiles.map((f) => f.path),
            runDate: formattedDate,
          }
          await this.executePipeline('run_files', payload)
        }

        if (this.pipelines.updateDatabase) {
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
      console.log('Executing', pipelineName, 'with', payload)
      await axios.post(
        `https://dev.rocox.co/api/execute_pipeline?pipeline_name=${pipelineName}`,
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
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
  color: #333;
}

.header {
  text-align: center;
  color: #007bff;
  font-size: 28px;
  margin-bottom: 20px;
}

/* Row Layout */
.row {
  display: flex;
  gap: 20px;
}

/* Column Layout */
.column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Card Style */
.card {
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.card-header {
  font-size: 20px;
  background-color: #007bff;
  color: #fff;
  padding: 10px 20px;
}

.card-content {
  padding: 20px;
}

.file-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
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
  border: 1px solid #ddd;
  border-radius: 4px;
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

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.checkbox-item {
  display: flex;
  align-items: center;
  font-size: 14px;
  color: #333;
}

.checkbox-item input {
  margin-right: 8px;
}

.preserve-spaces {
  white-space: pre; /* Preserve spaces exactly as they are */
}
</style>
