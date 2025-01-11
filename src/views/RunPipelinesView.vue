<template>
  <div class="page-container">
    <div class="header">
      <h1>Data Pipeline Runner</h1>
      <p class="subtitle">
        Easily manage and run data pipelines by selecting files or performing updates.
      </p>
    </div>

    <div class="content-grid">
      <!-- File Management -->
      <div class="card file-management">
        <div class="card-header">
          <h2>File Management</h2>
          <p class="card-description">
            View and refresh your files below. Select multiple files to run them in the pipeline.
          </p>
        </div>
        <div class="card-body">
          <div class="controls">
            <button
              @click="fetchFiles"
              :disabled="loadingFiles"
              class="btn action-btn refresh"
            >
              {{ loadingFiles ? 'Refreshing...' : 'Refresh Files' }}
            </button>
            <label class="checkbox-label">
              <input type="checkbox" v-model="selectAll" @change="toggleSelectAll" />
              <span>Select All</span>
            </label>
          </div>

          <div class="file-list-container">
            <p v-if="loadingFiles" class="info-text">
              Refreshing file list...
            </p>
            <p v-if="errorFiles" class="error-text">{{ errorFiles }}</p>

            <!-- Show paginated files instead of all files at once -->
            <ul v-if="paginatedFiles.length > 0" class="file-list">
              <li
                v-for="(fileObj, index) in paginatedFiles"
                :key="index"
                class="file-item"
              >
                <div class="file-info">
                  <!-- Use "title" to show the full file name on hover -->
                  <label
                    class="checkbox-label"
                    :title="fileObj.fileName"
                  >
                    <input
                      type="checkbox"
                      v-model="selectedFiles"
                      :value="fileObj"
                    />
                    <!-- Truncated file name -->
                    <span class="file-name preserve-spaces">
                      {{ fileObj.fileName }}
                    </span>
                  </label>
                  <!-- Truncated folder => company path with smaller font -->
                  <p
                    class="file-path"
                    :title="fileObj.folder + fileObj.company"
                  >
                    {{ fileObj.folder }}{{ fileObj.company }}
                  </p>
                </div>
                <button
                  @click="deleteFile(fileObj)"
                  class="btn action-btn danger"
                >
                  Delete
                </button>
              </li>
            </ul>

            <p
              v-else-if="files.length > 0 && !loadingFiles"
              class="info-text"
            >
              No files on this page.
            </p>
            <p
              v-if="files.length === 0 && !loadingFiles && !errorFiles"
              class="info-text"
            >
              No files available.
            </p>
          </div>

          <!-- Pagination Controls -->
          <div v-if="totalPages > 1" class="pagination-controls">
            <button
              class="btn page-btn"
              :disabled="currentPage === 1"
              @click="currentPage--"
            >
              Prev
            </button>
            <span class="page-info">
              Page {{ currentPage }} of {{ totalPages }}
            </span>
            <button
              class="btn page-btn"
              :disabled="currentPage === totalPages"
              @click="currentPage++"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <!-- Trigger Process -->
      <div class="card process-runner">
        <div class="card-header">
          <h2>Trigger Process</h2>
          <p class="card-description">
            Choose which actions to run on the selected files or system.
          </p>
        </div>
        <div class="card-body">
          <p class="info-text bold">
            Select processes to execute:
          </p>

          <div class="process-options">
            <!-- Run Files Toggle + Date Picker side by side -->
            <div class="run-files-date">
              <label class="checkbox-label">
                <input type="checkbox" v-model="pipelines.runFiles" />
                <span>Run Files</span>
              </label>

              <div class="date-control">
                <label for="date-picker">Date</label>
                <input
                  id="date-picker"
                  type="date"
                  v-model="selectedDate"
                  class="date-picker"
                />
              </div>
            </div>

            <label class="checkbox-label">
              <input type="checkbox" v-model="pipelines.updateDatabase" />
              <span>Update Database</span>
            </label>

            <label class="checkbox-label">
              <input type="checkbox" v-model="pipelines.binderVerification" />
              <span>Binder Verification (Under Dev)</span>
            </label>
          </div>

          <button
            @click="runSelectedPipelines"
            :disabled="!isAnyPipelineSelected || loadingPipelines"
            class="btn action-btn primary wide"
          >
            {{ loadingPipelines ? 'Processing...' : 'Execute Selected Process' }}
          </button>

          <p v-if="errorPipelines" class="error-text">
            {{ errorPipelines }}
          </p>
          <p v-if="responsePipelines" class="success-text">
            {{ responsePipelines }}
          </p>
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
      // Pipeline Execution
      responsePipelines: null,
      errorPipelines: null,
      loadingPipelines: false,

      // File Management
      responseFiles: null,
      errorFiles: null,
      loadingFiles: false,
      files: [],
      selectedFiles: [],
      selectAll: false,

      // Pagination
      currentPage: 1,
      itemsPerPage: 4,

      // Date & Pipeline Options
      selectedDate: this.getCurrentDate(),
      pipelines: {
        runFiles: false,
        updateDatabase: false,
        binderVerification: false,
      },

      // Additional error for file deletion
      errorDelete: null,
    }
  },
  computed: {
    isAnyPipelineSelected() {
      return (
        this.pipelines.runFiles ||
        this.pipelines.updateDatabase ||
        this.pipelines.binderVerification
      )
    },
    totalPages() {
      return Math.ceil(this.files.length / this.itemsPerPage) || 0
    },
    paginatedFiles() {
      const startIndex = (this.currentPage - 1) * this.itemsPerPage
      const endIndex = startIndex + this.itemsPerPage
      return this.files.slice(startIndex, endIndex)
    },
  },
  methods: {
    /* Format date as YYYY-MM-DD */
    getCurrentDate() {
      const now = new Date()
      return now.toISOString().split('T')[0]
    },

    /* Convert user-selected date into pipeline-ready ISO format */
    formatDateForPipeline(date) {
      const currentDate = new Date(date)
      const isoString = currentDate.toISOString()
      const [datePart, timePart] = isoString.split('T')
      const formattedTime = timePart.replace('Z', '1Z')
      return `${datePart}T${formattedTime}`
    },

    /* Fetch list of files from server */
    async fetchFiles() {
      this.loadingFiles = true
      this.errorFiles = null
      this.currentPage = 1 // Reset to page 1 on fetch

      try {
        const response = await axios.get("https://dev.rocox.co/api/fetch_files")
        if (!Array.isArray(response.data)) {
          throw new Error("Expected an array from the backend, but got something else.")
        }

        this.files = response.data.map((path) => {
          const parts = path.split('/')
          const fileName = parts.pop()
          let companyName = parts.length > 0 ? parts.pop() : ''
          let folderName = parts.length > 0 ? parts.pop() : ''

          // If "Services & Deductions", just show that
          if (path.includes('Deduction & Services')) {
            folderName = 'Deduction & Services'
            companyName = '' // clear out company
          } else {
            // otherwise, build "folder => " and keep companyName
            folderName = folderName ? folderName + ' => ' : ''
          }

          return {
            path,
            folder: folderName,
            company: companyName,
            fileName,
          }
        })

        // Reset selection
        this.selectAll = false
        this.selectedFiles = []
      } catch (error) {
        console.error("Error fetching files:", error.message)
        this.errorFiles = "Failed to fetch files."
      } finally {
        this.loadingFiles = false
      }
    },

    /* Check/uncheck all files */
    toggleSelectAll() {
      if (this.selectAll) {
        this.selectedFiles = [...this.files]
      } else {
        this.selectedFiles = []
      }
    },

    /* Run selected pipelines */
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

        // Binder Verification (Under Development)...

        this.responsePipelines = 'Selected pipelines executed successfully!'
      } catch (error) {
        console.error('Pipeline execution failed:', error.message)
        this.errorPipelines = 'Failed to execute pipelines.'
      } finally {
        this.loadingPipelines = false
      }
    },

    /* Helper: execute a pipeline by name with given payload */
    async executePipeline(pipelineName, payload) {
      console.log(`Executing ${pipelineName} with:`, payload)
      await axios.post(
        `https://dev.rocox.co/api/execute_pipeline?pipeline_name=${pipelineName}`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    },

    /* Delete a file from Azure, then refresh the list */
    async deleteFile(fileObj) {
      try {
        // If folder is "Services & Deductions", pass that as is
        // otherwise it might be "folder => "
        let folder = fileObj.folder.includes('Services & Deductions')
          ? 'Services & Deductions'
          : fileObj.folder.replace(' => ', '').trim()

        const payload = {
          folder,
          filePath: fileObj.path.replace('/caley-operations-dev/', ''),
        }

        await axios.post("https://dev.rocox.co/api/delete_files", payload, {
          headers: {
            "Content-Type": "application/json",
          },
        })

        this.fetchFiles()
      } catch (error) {
        console.error("Error deleting file:", error.message)
        this.errorDelete = `Failed to delete file: ${fileObj.fileName}`
      }
    },
  },
}
</script>

<style>
:root {
  --bg-color: #f3f4f6;         /* Light background */
  --card-bg: #ffffff;          /* White for cards */
  --text-color: #000000;       /* Black text */
  --accent-color: #3f94b5;     /* Accent color for primary actions */
  --danger-color: #dc3545;     /* Red for Delete */
  --success-color: #28a745;    /* Green for Refresh */
  --border-color: #ececec;     /* Light gray for borders */
  --shadow: 0 2px 10px rgba(0,0,0,0.08);
}

/* Overall Container */
.page-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  background-color: var(--bg-color);
  color: var(--text-color);
  border-radius: 8px;
}

/* Header */
.header {
  text-align: center;
  margin-bottom: 2rem;
}
.header h1 {
  margin: 0;
  font-size: 2rem;
}
.subtitle {
  margin-top: 0.5rem;
  font-size: 1rem;
  color: #555555;
}

/* Content Grid */
.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}
@media(max-width: 900px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}

/* Cards */
.card {
  background-color: var(--card-bg);
  border-radius: 8px;
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
}
/* Fix the card width so it does not expand horizontally */
.file-management {
  max-width: 500px;
}
.card-header {
  padding: 1.2rem;
  border-bottom: 1px solid var(--border-color);
}
.card-header h2 {
  margin: 0;
  font-size: 1.2rem;
}
.card-description {
  margin: 0.4rem 0 0;
  font-size: 0.9rem;
  color: #666666;
}
.card-body {
  padding: 1.2rem;
  flex: 1;
}

/* Controls & Checkboxes */
.controls,
.process-options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.file-management .controls {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.9rem;
  cursor: pointer;
}

/* File List */
.file-list-container {
  margin-top: 1rem;
}
.file-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.file-item {
  width: 100%;
  background-color: #fafafa;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 0.8rem;
  margin-bottom: 0.8rem;

  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.8rem;
}
.file-info {
  flex: 1;
  min-width: 0; /* Required for text-overflow in a flex item */
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.file-name {
  font-weight: 600;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.file-path {
  font-size: 0.8rem;
  color: #777777;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

/* Pagination Controls */
.pagination-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 1rem;
}
.page-btn {
  background-color: #777;
}
.page-info {
  font-size: 0.9rem;
}

/* Trigger Process */
.process-runner .info-text.bold {
  font-weight: 600;
}
.run-files-date {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.date-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Buttons */
.btn {
  border: none;
  border-radius: 4px;
  padding: 0.6rem 1.2rem;
  font-size: 0.9rem;
  color: #ffffff;
  cursor: pointer;
  transition: background-color 0.2s ease-in-out;
}
.btn:disabled {
  background-color: #aaaaaa;
  cursor: not-allowed;
}
.action-btn.refresh {
  background-color: var(--success-color);
}
.action-btn.danger {
  background-color: var(--danger-color);
}
.action-btn.primary {
  background-color: var(--accent-color);
}
.action-btn:hover:not(:disabled) {
  filter: brightness(1.1);
}
.wide {
  width: 100%;
  margin-top: 1rem;
}

/* Status & Text Colors */
.info-text {
  font-size: 0.9rem;
  color: #444444;
}
.error-text {
  color: var(--danger-color);
  font-weight: 500;
  margin-top: 0.5rem;
}
.success-text {
  color: var(--success-color);
  font-weight: 500;
  margin-top: 0.5rem;
}

/* Date picker styling */
.date-picker {
  font-size: 0.9rem;
  padding: 0.3rem 0.4rem;
  border: 1px solid white;
  border-radius: 4px;
  color: white; /* or #000 if you prefer black text */
  background-color: #999;
}

/* Preserve exact spacing in file names */
.preserve-spaces {
  white-space: pre;
}
</style>
