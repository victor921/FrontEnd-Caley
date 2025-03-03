<template>
  <div class="pipeline-runner">
    <!-- Header -->
    <header class="header">
      <h1>Data Pipeline Runner</h1>
      <p class="subtitle">Run and manage your data pipelines with ease.</p>
    </header>

    <!-- Main Content -->
    <main class="content">
      <!-- File Management Section -->
      <section class="file-section">
        <div class="section-header">
          <h2>Files</h2>
          <div class="file-actions">
            <button
              class="btn refresh-btn"
              @click="fetchFiles"
              :disabled="loadingFiles"
              :aria-label="loadingFiles ? 'Refreshing files...' : 'Refresh file list'"
            >
              <i class="pi pi-refresh" :class="{ 'spinning': loadingFiles }"></i>
              <span>{{ loadingFiles ? "Refreshing" : "Refresh" }}</span>
            </button>
            <label class="select-all">
              <input
                type="checkbox"
                v-model="selectAll"
                @change="toggleSelectAll"
                :disabled="loadingFiles || !files.length"
              />
              <span>Select All</span>
            </label>
          </div>
        </div>

        <!-- File List -->
        <div class="file-list" v-if="!errorFiles && !loadingFiles">
          <div
            v-for="(fileObj, index) in paginatedFiles"
            :key="index"
            class="file-card"
          >
            <div class="file-details">
              <label class="file-checkbox">
                <input
                  type="checkbox"
                  v-model="selectedFiles"
                  :value="fileObj"
                  :disabled="loadingFiles"
                />
                <span class="file-name">{{ fileObj.fileName }}</span>
              </label>
              <p class="file-path">{{ fileObj.folder }}{{ fileObj.company }}</p>
            </div>
            <button
              class="btn delete-btn"
              @click="deleteFile(fileObj)"
              :disabled="loadingFiles"
              aria-label="Delete file"
            >
              <i class="pi pi-trash"></i>
            </button>
          </div>
          <p v-if="!paginatedFiles.length && files.length > 0" class="no-files">
            No files on this page.
          </p>
          <p v-else-if="!files.length" class="no-files">No files available.</p>
        </div>

        <!-- Loading/Error States -->
        <div class="status" v-if="loadingFiles || errorFiles">
          <p v-if="loadingFiles" class="loading">Loading files...</p>
          <p v-if="errorFiles" class="error">{{ errorFiles }}</p>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="pagination">
          <button
            class="btn pagination-btn"
            :disabled="currentPage === 1 || loadingFiles"
            @click="currentPage--"
          >
            <i class="pi pi-angle-left"></i>
          </button>
          <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
          <button
            class="btn pagination-btn"
            :disabled="currentPage === totalPages || loadingFiles"
            @click="currentPage++"
          >
            <i class="pi pi-angle-right"></i>
          </button>
        </div>
      </section>

      <!-- Pipeline Runner Section -->
      <section class="pipeline-section">
        <div class="section-header">
          <h2>Run Pipeline</h2>
        </div>

        <div class="pipeline-form">
          <!-- Pipeline Selection -->
          <div class="form-group">
            <label for="pipeline-select">Pipeline</label>
            <select
              id="pipeline-select"
              v-model="selectedPipeline"
              class="select"
              :disabled="loadingPipeline"
            >
              <option value="runFiles">Run Files</option>
              <option value="updateDatabase">Update Database</option>
              <option value="binderVerification">Binder Verification</option>
            </select>
          </div>

          <!-- Pipeline Options -->
          <div class="pipeline-options">
            <!-- Run Files -->
            <div v-if="selectedPipeline === 'runFiles'" class="form-group">
              <label for="run-files-date">Run Date/Time</label>
              <input
                id="run-files-date"
                type="datetime-local"
                v-model="pipelineOptions.runFilesDate"
                class="input"
                :disabled="loadingPipeline"
              />
            </div>

            <!-- Update Database -->
            <div v-if="selectedPipeline === 'updateDatabase'" class="form-group">
              <label for="start-date">Start Date</label>
              <input
                id="start-date"
                type="date"
                v-model="pipelineOptions.startDate"
                class="input"
                :disabled="loadingPipeline"
              />
              <label for="end-date">End Date</label>
              <input
                id="end-date"
                type="date"
                v-model="pipelineOptions.endDate"
                class="input"
                :disabled="loadingPipeline"
              />
            </div>

            <!-- Binder Verification -->
            <div v-if="selectedPipeline === 'binderVerification'" class="form-group">
              <label for="binder-date">Run Date</label>
              <input
                id="binder-date"
                type="date"
                v-model="pipelineOptions.binderDate"
                class="input"
                :disabled="loadingPipeline"
              />
            </div>
          </div>

          <!-- Execute Button -->
          <button
            class="btn execute-btn"
            @click="runSelectedPipeline"
            :disabled="loadingPipeline || !isPipelineValid"
          >
            <i class="pi pi-play" v-if="!loadingPipeline"></i>
            <i class="pi pi-spin pi-spinner" v-else></i>
            {{ loadingPipeline ? "Running..." : "Run Pipeline" }}
          </button>

          <!-- Status Messages -->
          <p v-if="errorPipeline" class="error">{{ errorPipeline }}</p>
          <p v-if="responsePipeline" class="success">{{ responsePipeline }}</p>
        </div>
      </section>
    </main>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'RunPipelinesView',
  data() {
    return {
      // FILES
      files: [],
      selectedFiles: [],
      loadingFiles: false,
      errorFiles: null,
      currentPage: 1,
      itemsPerPage: 5,
      selectAll: false,

      // PIPELINE
      selectedPipeline: 'runFiles',
      pipelineOptions: {
        runFilesDate: this.getLocalDateTime(),
        startDate: this.getOneMonthAgo(),
        endDate: this.getToday(),
        binderDate: this.getFirstOfMonth(),
      },
      loadingPipeline: false,
      responsePipeline: null,
      errorPipeline: null,
    };
  },
  computed: {
    totalPages() {
      return Math.ceil(this.files.length / this.itemsPerPage) || 0;
    },
    paginatedFiles() {
      const startIndex = (this.currentPage - 1) * this.itemsPerPage;
      return this.files.slice(startIndex, startIndex + this.itemsPerPage);
    },
    isPipelineValid() {
      if (this.selectedPipeline === 'runFiles') {
        return this.selectedFiles.length > 0 && !!this.pipelineOptions.runFilesDate;
      } else if (this.selectedPipeline === 'updateDatabase') {
        return this.pipelineOptions.startDate && this.pipelineOptions.endDate;
      } else if (this.selectedPipeline === 'binderVerification') {
        return !!this.pipelineOptions.binderDate;
      }
      return false;
    },
  },
  methods: {
    // Date Helpers
    getToday() {
      return new Date().toISOString().split('T')[0];
    },
    getOneMonthAgo() {
      const date = new Date();
      date.setMonth(date.getMonth() - 1);
      return date.toISOString().split('T')[0];
    },
    getFirstOfMonth() {
      const date = new Date();
      date.setDate(1);
      return date.toISOString().split('T')[0];
    },
    getLocalDateTime() {
      const now = new Date();
      const offsetMs = now.getTime() - now.getTimezoneOffset() * 60000;
      return new Date(offsetMs).toISOString().slice(0, 16);
    },
    formatDateTimeWithMicros(dtLocal) {
      if (!dtLocal) return null;
      const dateObj = new Date(dtLocal);
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      const hour = String(dateObj.getHours()).padStart(2, '0');
      const minute = String(dateObj.getMinutes()).padStart(2, '0');
      const second = String(dateObj.getSeconds()).padStart(2, '0');
      const micros = '000001';
      return `${year}-${month}-${day}T${hour}:${minute}:${second}.${micros}`;
    },

    // File Data
    async fetchFiles() {
      this.loadingFiles = true;
      this.errorFiles = null;
      try {
        const response = await axios.get(`/api/fetch_files?code=${process.env.VUE_APP_FUNCTION_KEY}`);
        if (!Array.isArray(response.data)) {
          throw new Error('Expected an array of file paths from server');
        }
        this.files = response.data.map(rawPath => {
          const parts = rawPath.split('/');
          const fileName = parts.pop();
          const company = parts.pop() || '';
          const folder = parts.pop() || '';
          return {
            path: rawPath,
            fileName,
            folder: folder ? folder + ' => ' : '',
            company,
          };
        });
      } catch (error) {
        this.errorFiles = 'Failed to fetch files.';
      } finally {
        this.loadingFiles = false;
      }
    },
    toggleSelectAll() {
      this.selectedFiles = this.selectAll ? [...this.files] : [];
    },
    async deleteFile(fileObj) {
      try {
        await axios.post(`/api/delete_files?code=${process.env.VUE_APP_FUNCTION_KEY}`, {
          filePath: fileObj.path,
        });
        this.fetchFiles();
      } catch (error) {
        this.errorFiles = 'Failed to delete file.';
      }
    },

    // Pipeline
    async runSelectedPipeline() {
      this.loadingPipeline = true;
      this.errorPipeline = null;
      this.responsePipeline = null;

      try {
        let endpoint = '';
        let payload = {};

        if (this.selectedPipeline === 'runFiles') {
          endpoint = 'run_files';
          const finalDate = this.formatDateTimeWithMicros(this.pipelineOptions.runFilesDate);
          payload = {
            paths_to_process: this.selectedFiles.map(f => f.path),
            runDate: finalDate,
          };
        } else if (this.selectedPipeline === 'updateDatabase') {
          endpoint = 'update_sql';
          payload = {
            startDate: this.pipelineOptions.startDate,
            endDate: this.pipelineOptions.endDate,
          };
        } else if (this.selectedPipeline === 'binderVerification') {
          endpoint = 'run_binder_verification';
          payload = {
            runDate: this.pipelineOptions.binderDate,
          };
        }

        const resp = await axios.post(
          `/api/execute_pipeline?pipeline_name=${endpoint}&code=${process.env.VUE_APP_FUNCTION_KEY}`,
          payload,
          { headers: { 'Content-Type': 'application/json' } }
        );
        this.responsePipeline = resp.data.message || 'Pipeline executed successfully!';
      } catch (error) {
        this.errorPipeline = error.response?.data?.message || 'Pipeline execution failed.';
      } finally {
        this.loadingPipeline = false;
      }
    },
  },
};
</script>

<style scoped>
.pipeline-runner {
  background: #f5f7fa;
  min-height: 100vh;
  padding: 2rem;
  font-family: 'Inter', sans-serif;
  color: #2d3748;
}

/* Header */
.header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.header h1 {
  font-size: 2rem;
  font-weight: 700;
  color: #1a202c;
  margin-bottom: 0.5rem;
}

.subtitle {
  font-size: 1rem;
  color: #718096;
}

/* Content Layout */
.content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

@media (max-width: 1024px) {
  .content {
    grid-template-columns: 1fr;
  }
}

/* Section Styling */
.file-section,
.pipeline-section {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #2d3748;
}

/* File Actions */
.file-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #48bb78;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  transition: background 0.2s ease;
}

.refresh-btn:hover:not(:disabled) {
  background: #38a169;
}

.refresh-btn:disabled {
  background: #a0aec0;
  cursor: not-allowed;
}

.spinning {
  animation: spin 1s linear infinite;
}

.select-all {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #4a5568;
}

/* File List */
.file-list {
  flex: 1;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.file-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f9fafb;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 0.75rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.file-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.file-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.file-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.file-name {
  font-size: 0.95rem;
  font-weight: 500;
  color: #2d3748;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
}

.file-path {
  font-size: 0.85rem;
  color: #718096;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
}

.delete-btn {
  background: #f56565;
  color: white;
  padding: 0.5rem;
  border-radius: 6px;
  transition: background 0.2s ease;
}

.delete-btn:hover:not(:disabled) {
  background: #e53e3e;
}

.delete-btn:disabled {
  background: #a0aec0;
  cursor: not-allowed;
}

/* Status Messages */
.status {
  text-align: center;
  padding: 2rem 0;
}

.loading {
  color: #4a5568;
  font-size: 1rem;
}

.error {
  color: #e53e3e;
  font-size: 1rem;
}

.no-files {
  color: #718096;
  font-size: 0.9rem;
  text-align: center;
  padding: 2rem 0;
}

/* Pagination */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 1rem;
}

.pagination-btn {
  background: #e2e8f0;
  color: #2d3748;
  padding: 0.5rem;
  border-radius: 6px;
  transition: background 0.2s ease;
}

.pagination-btn:hover:not(:disabled) {
  background: #cbd5e0;
}

.pagination-btn:disabled {
  background: #edf2f7;
  color: #a0aec0;
  cursor: not-allowed;
}

.page-info {
  font-size: 0.9rem;
  color: #4a5568;
}

/* Pipeline Form */
.pipeline-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.95rem;
  font-weight: 500;
  color: #4a5568;
}

.select,
.input {
  padding: 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.9rem;
  background: #fff;
  transition: border-color 0.2s ease;
}

.select:focus,
.input:focus {
  border-color: #4299e1;
  outline: none;
}

.select:disabled,
.input:disabled {
  background: #edf2f7;
  color: #a0aec0;
  cursor: not-allowed;
}

.pipeline-options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.execute-btn {
  background: #4299e1;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: background 0.2s ease;
}

.execute-btn:hover:not(:disabled) {
  background: #3182ce;
}

.execute-btn:disabled {
  background: #a0aec0;
  cursor: not-allowed;
}

.success {
  color: #38a169;
  font-size: 0.9rem;
  text-align: center;
  margin-top: 1rem;
}

/* Animations */
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
