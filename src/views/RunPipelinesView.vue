<template>
  <div class="page-container">
    <!-- Header Section -->
    <div class="header">
      <h1>Data Pipeline Runner</h1>
      <p class="subtitle">
        Easily manage and run data pipelines by selecting files or performing updates.
      </p>
    </div>

    <div class="content-grid">
      <!-- FILE MANAGEMENT CARD -->
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
              {{ loadingFiles ? "Refreshing..." : "Refresh Files" }}
            </button>
            <label class="checkbox-label">
              <input type="checkbox" v-model="selectAll" @change="toggleSelectAll" />
              <span>Select All</span>
            </label>
          </div>

          <div class="file-list-container">
            <p v-if="loadingFiles" class="info-text">Refreshing file list...</p>
            <p v-if="errorFiles" class="error-text">{{ errorFiles }}</p>

            <ul v-if="paginatedFiles.length > 0" class="file-list">
              <li
                v-for="(fileObj, index) in paginatedFiles"
                :key="index"
                class="file-item"
              >
                <div class="file-info">
                  <label class="checkbox-label" :title="fileObj.fileName">
                    <input
                      type="checkbox"
                      v-model="selectedFiles"
                      :value="fileObj"
                    />
                    <span class="file-name truncate">{{ fileObj.fileName }}</span>
                  </label>
                  <p class="file-path truncate" :title="fileObj.folder + fileObj.company">
                    {{ fileObj.folder }}{{ fileObj.company }}
                  </p>
                </div>
                <div class="file-actions">
                  <button @click="deleteFile(fileObj)" class="btn action-btn danger">
                    Delete
                  </button>
                </div>
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
            <span class="page-info">Page {{ currentPage }} of {{ totalPages }}</span>
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

      <!-- TRIGGER PROCESS CARD -->
      <div class="card process-runner">
        <div class="card-header">
          <h2>Trigger Process</h2>
          <p class="card-description">
            Choose which pipeline to run and supply any required dates or files.
          </p>
        </div>
        <div class="card-body">
          <label class="dropdown-label">Select a Pipeline:</label>
          <select v-model="selectedPipeline" class="dropdown pipeline-select">
            <option value="runFiles">Run Files</option>
            <option value="updateDatabase">Update Database</option>
            <option value="binderVerification">Binder Verification</option>
          </select>

          <!-- If user selects "Run Files" -->
          <div v-if="selectedPipeline === 'runFiles'" class="pipeline-options">
            <label class="date-label">
              Select Date/Time:
              <!-- Users picks e.g. "2025-01-29T10:21" -->
              <input
                type="datetime-local"
                v-model="pipelineOptions.runFilesDate"
              />
            </label>
          </div>

          <!-- If user selects "Update Database" -->
          <div v-if="selectedPipeline === 'updateDatabase'" class="pipeline-options">
            <label class="date-label">
              Start Date:
              <input type="date" v-model="pipelineOptions.startDate" />
            </label>
            <label class="date-label">
              End Date:
              <input type="date" v-model="pipelineOptions.endDate" />
            </label>
          </div>

          <!-- If user selects "Binder Verification" -->
          <div v-if="selectedPipeline === 'binderVerification'" class="pipeline-options">
            <label class="date-label">
              Select Date:
              <input type="date" v-model="pipelineOptions.binderDate" />
            </label>
          </div>

          <button
            class="btn action-btn primary wide"
            @click="runSelectedPipeline"
            :disabled="loadingPipeline || !isPipelineValid"
          >
            {{ loadingPipeline ? "Processing..." : "Execute Pipeline" }}
          </button>

          <p v-if="errorPipeline" class="error-text">{{ errorPipeline }}</p>
          <p v-if="responsePipeline" class="success-text">{{ responsePipeline }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "RunPipelinesView",
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
      selectedPipeline: "runFiles",
      pipelineOptions: {
        // "Run Files" => auto-populate current date/time in "YYYY-MM-DDTHH:MM"
        runFilesDate: this.getLocalDateTime(),
        // "Update Database"
        startDate: this.getOneMonthAgo(),
        endDate: this.getToday(),
        // "Binder"
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
      if (this.selectedPipeline === "runFiles") {
        return this.selectedFiles.length > 0 && !!this.pipelineOptions.runFilesDate;
      } else if (this.selectedPipeline === "updateDatabase") {
        return this.pipelineOptions.startDate && this.pipelineOptions.endDate;
      } else if (this.selectedPipeline === "binderVerification") {
        return !!this.pipelineOptions.binderDate;
      }
      return false;
    },
  },
  methods: {
    // Date Helpers
    getToday() {
      const now = new Date();
      return now.toISOString().split("T")[0]; // "YYYY-MM-DD"
    },
    getOneMonthAgo() {
      const date = new Date();
      date.setMonth(date.getMonth() - 1);
      return date.toISOString().split("T")[0];
    },
    getFirstOfMonth() {
      const date = new Date();
      date.setDate(1);
      return date.toISOString().split("T")[0];
    },

    /**
     * For "runFilesDate" default, returns "YYYY-MM-DDTHH:MM"
     * e.g. "2025-01-29T10:21"
     */
    getLocalDateTime() {
      const now = new Date();
      // Shift to local time
      const offsetMs = now.getTime() - now.getTimezoneOffset() * 60000;
      const local = new Date(offsetMs);
      return local.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:MM"
    },

    /**
     * Reformat "YYYY-MM-DDTHH:MM" -> "YYYY-MM-DDTHH:MM:SS.ffffff"
     * So if user picks "2025-01-29T10:21",
     * We convert => "2025-01-29T10:21:00.000000"
     */
    formatDateTimeWithMicros(dtLocal) {
      if (!dtLocal) return null;
      // parse
      const dateObj = new Date(dtLocal);
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, "0");
      const day = String(dateObj.getDate()).padStart(2, "0");
      const hour = String(dateObj.getHours()).padStart(2, "0");
      const minute = String(dateObj.getMinutes()).padStart(2, "0");
      const second = String(dateObj.getSeconds()).padStart(2, "0");
      const micros = "000001"; // or parse from ms if you want partial
      return `${year}-${month}-${day}T${hour}:${minute}:${second}.${micros}`;
    },

    // File Data
    async fetchFiles() {
      this.loadingFiles = true;
      this.errorFiles = null;
      try {
        const response = await axios.get(`https://dev.rocox.co/api/fetch_files?code=${process.env.VUE_APP_FUNCTION_KEY}`);
        if (!Array.isArray(response.data)) {
          throw new Error("Expected an array of file paths from server");
        }
        this.files = response.data.map((rawPath) => {
          const parts = rawPath.split("/");
          const fileName = parts.pop();
          const company = parts.pop() || "";
          const folder = parts.pop() || "";
          return {
            path: rawPath,
            fileName,
            folder: folder ? folder + " => " : "",
            company,
          };
        });
      } catch (error) {
        this.errorFiles = "Failed to fetch files.";
      } finally {
        this.loadingFiles = false;
      }
    },
    toggleSelectAll() {
      if (this.selectAll) {
        this.selectedFiles = [...this.files];
      } else {
        this.selectedFiles = [];
      }
    },
    async deleteFile(fileObj) {
      try {
        await axios.post(`https://dev.rocox.co/api/delete_files?code=${process.env.VUE_APP_FUNCTION_KEY}`, {
          filePath: fileObj.path,
        });
        this.fetchFiles();
      } catch (error) {
        this.errorFiles = "Failed to delete file.";
      }
    },

    // Pipeline
    async runSelectedPipeline() {
      this.loadingPipeline = true;
      this.errorPipeline = null;
      this.responsePipeline = null;

      try {
        let endpoint = "";
        let payload = {};

        if (this.selectedPipeline === "runFiles") {
          endpoint = "run_files";

          // Convert user-chosen "2025-01-29T10:21" => "2025-01-29T10:21:00.000000"
          const finalDate = this.formatDateTimeWithMicros(
            this.pipelineOptions.runFilesDate
          );

          payload = {
            paths_to_process: this.selectedFiles.map((f) => f.path),
            runDate: finalDate,
          };
        } else if (this.selectedPipeline === "updateDatabase") {
          endpoint = "update_sql";
          payload = {
            startDate: this.pipelineOptions.startDate,
            endDate: this.pipelineOptions.endDate,
          };
        } else if (this.selectedPipeline === "binderVerification") {
          endpoint = "run_binder_verification";
          payload = {
            runDate: this.pipelineOptions.binderDate,
          };
        }

        const resp = await axios.post(
          `https://dev.rocox.co/api/execute_pipeline?pipeline_name=${endpoint}&code=${process.env.VUE_APP_FUNCTION_KEY}`,
          payload,
          { headers: { "Content-Type": "application/json" } }
        );
        this.responsePipeline = resp.data.message || "Pipeline executed successfully!";
      } catch (error) {
        this.errorPipeline =
          error.response?.data?.message || "Pipeline execution failed.";
      } finally {
        this.loadingPipeline = false;
      }
    },
  },
};
</script>

<style>
/* Container */
.page-container {
  background-color: #f3f4f6;
  color: #333;
  padding: 2rem;
  border-radius: 8px;
  font-family: "Segoe UI", sans-serif;
}

.header {
  text-align: center;
  margin-bottom: 2rem;
}
.subtitle {
  margin-top: 0.5rem;
  font-size: 1rem;
  color: #555;
}

/* Layout grid */
.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}
@media (max-width: 900px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}

/* Card */
.card {
  background: #fff;
  color: #333;
  border-radius: 8px;
  box-shadow: 0 0 4px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
}
.card-header {
  padding: 1.2rem;
  border-bottom: 1px solid #e5e7eb;
}
.card-header h2 {
  margin: 0;
  font-size: 1.2rem;
  color: #111827;
}
.card-description {
  margin: 0.4rem 0 0;
  font-size: 0.9rem;
  color: #6b7280;
}
.card-body {
  padding: 1.2rem;
  flex: 1;
}

/* File Management Card */
.file-management {
  max-height: calc(100vh - 200px);
  overflow-y: auto;
}
.controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.file-list-container {
  margin-top: 1rem;
}
.file-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.file-item {
  background-color: #fafafa;
  border: 1px solid #eee;
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
}
.file-path {
  font-size: 0.8rem;
  color: #777;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 250px;
}
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.9rem;
  cursor: pointer;
}

/* Pagination */
.pagination-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 1rem;
}
.page-btn {
  background-color: #777;
  border: none;
  border-radius: 4px;
  padding: 0.6rem 1rem;
  color: #fff;
}
.page-btn:disabled {
  background-color: #aaa;
}
.page-info {
  font-size: 0.9rem;
}

/* Process Runner Card */
.process-runner .dropdown-label {
  margin-bottom: 0.4rem;
  font-weight: 600;
}
.pipeline-select {
  width: 100%;
  padding: 0.5rem;
  border-radius: 6px;
  border: 1px solid #ccc;
  font-size: 0.9rem;
  margin-bottom: 1rem;
}
.pipeline-options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1rem;
}
.date-label {
  font-size: 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
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
.action-btn.refresh {
  background-color: #10b981; /* green */
}
.action-btn.danger {
  background-color: #ef4444; /* red */
}
.action-btn.primary {
  background-color: #3b82f6; /* blue */
}
.action-btn:hover:not(:disabled) {
  filter: brightness(1.1);
}
.wide {
  width: 100%;
}
.btn:disabled {
  background-color: #aaa;
  cursor: not-allowed;
}

/* Info & Error Messages */
.info-text {
  font-size: 0.9rem;
  color: #444;
}
.error-text {
  color: #dc3545;
  margin-top: 0.5rem;
}
.success-text {
  color: #10b981;
  margin-top: 0.5rem;
}

/* Utility */
.truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.file-actions {
  margin-left: auto;
}
</style>
