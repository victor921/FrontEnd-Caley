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
                  {{ getFilename(fileObj.path) }}
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
import axios from "axios";

export default {
  data() {
    return {
      responsePipelines: null,
      errorPipelines: null,
      loadingPipelines: false,
      responseFiles: null,
      errorFiles: null,
      loadingFiles: false,

      // files will now store an array of objects: [{ path, folder, company }, ...]
      files: [],
      selectedFiles: [],
      selectedDate: this.getCurrentDateTime(),
      pipelines: {
        runFiles: false,
        updateDatabase: false,
      },
      selectAll: false,
    };
  },
  computed: {
    isAnyPipelineSelected() {
      return this.pipelines.runFiles || this.pipelines.updateDatabase;
    },
  },
  methods: {
    // Returns today's date in YYYY-MM-DD format
    getCurrentDateTime() {
      const now = new Date();
      return now.toISOString().split("T")[0];
    },

    // Convert from YYYY-MM-DD to the pipeline's desired format
    formatDateForPipeline(date) {
      const currentDate = new Date(date);
      const isoString = currentDate.toISOString(); // e.g. "2023-09-08T15:47:05.000Z"
      const [datePart, timePart] = isoString.split("T");
      // For example, "2023-09-08T15:47:05.000Z"
      // might become "2023-09-08T15:47:05.0001Z" or similar
      const formattedTime = timePart.replace("Z", "1Z");
      return `${datePart}T${formattedTime}`;
    },

    // Fetch file paths from the API, parse them into objects
    async fetchFiles() {
      this.loadingFiles = true;
      this.errorFiles = null;
      try {
        const response = await axios.get("https://dev.rocox.co/api/fetch_files");
        // The backend returns an array or possibly a string.
        // If it's an array, we can store it directly; if it's a single string, we might need to split it.
        // Let's assume it's an array of paths:
        let filePaths = response.data;
        if (typeof filePaths === "string") {
          // If it's a string with comma-separated paths
          filePaths = filePaths.split(",").map((s) => s.trim());
        }

        // Convert each path into an object with { path, folder, company }
        this.files = filePaths.map((path) => {
          // Example path:
          // /caley-operations-dev/input_files/Company Statements/Aetna Hlth Inc FL Corp/AetnaOct.xls
          const parts = path.split("/");
          // ["", "caley-operations-dev", "input_files", "Company Statements", "Aetna Hlth Inc FL Corp", "AetnaOct.xls"]

          // The file name is the last element
          const fileName = parts[parts.length - 1] || "";
          // The company is the second-to-last element
          let companyName = parts.length > 1 ? parts[parts.length - 2] : "";
          // The folder is the third-to-last element (like "Company Statements" or "MVR")
          let folderName =
            parts.length > 2 ? parts[parts.length - 3] : "";

          // Override folderName if the path contains "Services & Deductions"
          if (path.includes("Services & Deductions")) {
            companyName = ""
            folderName = "Services & Deductions";
          } else {
            folderName += " => "
          }

          return {
            path,
            folder: folderName,
            company: companyName,
          };
        });

        this.selectAll = false;
        this.selectedFiles = [];
      } catch (error) {
        console.error("Error fetching files:", error.message);
        this.errorFiles = "Failed to fetch files.";
      } finally {
        this.loadingFiles = false;
      }
    },

    // Toggle all or none of the checkboxes
    toggleSelectAll() {
      if (this.selectAll) {
        // select all file objects
        this.selectedFiles = [...this.files];
      } else {
        this.selectedFiles = [];
      }
    },

    // Extract just the filename from the path
    getFilename(fullPath) {
      // Example:
      // /caley-operations-dev/input_files/Company Statements/.../AetnaOct.xls
      // => "AetnaOct.xls"
      return fullPath.substring(fullPath.lastIndexOf("/") + 1);
    },

    // Pipeline Execution
    async runSelectedPipelines() {
      this.responsePipelines = null;
      this.errorPipelines = null;
      this.loadingPipelines = true;
      try {
        const formattedDate = this.formatDateForPipeline(this.selectedDate);

        // If user checked 'Run Files'
        if (this.pipelines.runFiles) {
          const payload = {
            // We only send the file paths
            paths_to_process: this.selectedFiles.map((f) => f.path),
            runDate: formattedDate,
          };
          await this.executePipeline("run_files", payload);
        }

        // If user checked 'Update Database'
        if (this.pipelines.updateDatabase) {
          const payload = {
            paths_to_process: [],
            runDate: "",
          };
          await this.executePipeline("update_sql", payload);
        }

        this.responsePipelines = "Selected pipelines executed successfully!";
      } catch (error) {
        console.error("Pipeline execution failed:", error.message);
        this.errorPipelines = "Failed to execute pipelines.";
      } finally {
        this.loadingPipelines = false;
      }
    },

    // Helper to call the pipeline endpoint
    async executePipeline(pipelineName, payload) {
      console.log("Executing", pipelineName, "with", payload);
      await axios.post(
        `https://dev.rocox.co/api/execute_pipeline?pipeline_name=${pipelineName}`,
        payload,
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
</style>
