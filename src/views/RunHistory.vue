<template>
  <div class="container">
    <h1>Run History</h1>
    <div class="current-datetime">
      Current EST Time: {{ currentDatetime }}
    </div>
    <ul v-if="formattedFiles.length" class="file-list">
      <li v-for="(file, index) in formattedFiles" :key="index" class="file-item">
        <a href="#" @click.prevent="openFileDetails(file.fullPath)" class="file-link">
          {{ file.displayName }}
        </a>
      </li>
    </ul>
    <p v-else class="loading-text">No valid files to display.</p>

    <!-- Modal -->
    <div v-if="isModalVisible" class="modal-overlay">
      <div class="modal-content">
        <h2>File Details</h2>

        <!-- Status Section -->
        <div class="status-section">
          <p v-if="status === 'RUNNING'" class="status-running">
            <span class="spinner"></span> Job is currently running...
          </p>
          <p v-else-if="status === 'COMPLETED'" class="status-completed">
            <strong>Job completed successfully!</strong>
          </p>
          <p v-else class="status-unknown">
            <strong>Status:</strong> {{ status }}
          </p>
        </div>

        <!-- Results Section -->
        <div class="modal-body">
          <ul>
            <li v-for="(output, index) in selectedFileDetails.RESULT" :key="index" class="output-item">
              <p><strong>Status:</strong> {{ output.status }}</p>
              <p v-if="output.error_details"><strong>Error Details:</strong> {{ output.error_details }}</p>
              <p><strong>Notebook Path:</strong> {{ output.parameters.notebook_path }}</p>
              <p><strong>Source:</strong> {{ output.parameters.source }}</p>
              <p>
                <strong>Run Page:</strong>
                <a :href="output.run_page_url" target="_blank" class="link-button">View Run</a>
              </p>
              <hr v-if="index < selectedFileDetails.RESULT.length - 1" />
            </li>
          </ul>
        </div>

        <button @click="closeModal" class="close-button">Close</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      files: [], // Stores raw file data
      formattedFiles: [], // Stores processed file data with display name and status
      isModalVisible: false, // Controls modal visibility
      selectedFileDetails: {}, // Stores details of the selected file (includes STATUS and RESULT)
      status: "", // Stores the STATUS from the response
      currentDatetime: "", // Current datetime in EST
    };
  },
  methods: {
    async loadFiles() {
      try {
        const response = await fetch("https://dev.rocox.co/api/fetch_files?folder=logs");
        const filePaths = await response.json();

        // Process files to extract display names and filter invalid timestamps
        this.files = filePaths.map((filePath) => {
          const fullPath = filePath; // Full path of the file
          const fileName = fullPath.split("/").pop(); // Extract the timestamped file name
          const timestamp = parseInt(fileName.split(".")[0], 10); // Extract timestamp

          // Convert the timestamp to EST
          let displayName = null;
          try {
            const date = new Date(timestamp);
            if (isNaN(date.getTime())) {
              throw new Error("Invalid timestamp");
            }

            // Convert to EST (Eastern Standard Time)
            const options = { timeZone: "America/New_York", timeZoneName: "short" };
            displayName = date.toLocaleString("en-US", options);
          } catch {
            return null; // Exclude invalid timestamps
          }

          return { fullPath, displayName };
        }).filter(file => file !== null); // Remove invalid entries

        // Initialize formattedFiles with the valid files
        this.formattedFiles = [...this.files];
      } catch (error) {
        console.error("Error fetching files:", error);
      }
    },
    async openFileDetails(filePath) {
      try {
        const response = await fetch(`https://dev.rocox.co/api/get_file_content?path=${filePath}`);
        const fileData = await response.json();

        // Store the file details and show the modal
        this.selectedFileDetails = fileData;
        this.status = fileData.STATUS;
        this.isModalVisible = true;
      } catch (error) {
        console.error("Error fetching file content:", error);
      }
    },
    closeModal() {
      // Close the modal and clear selected file details
      this.isModalVisible = false;
      this.selectedFileDetails = {};
      this.status = "";
    },
    updateCurrentDatetime() {
      // Get the current time in EST
      const options = { timeZone: "America/New_York", timeZoneName: "short" };
      const now = new Date().toLocaleString("en-US", options);
      this.currentDatetime = now;
    },
  },
  mounted() {
    this.updateCurrentDatetime();
    this.loadFiles();

    // Update the current datetime every second
    setInterval(this.updateCurrentDatetime, 1000);
  },
};
</script>

<style>
/* General container styling */
.container {
  max-width: 800px;
  margin: 20px auto;
  font-family: Arial, sans-serif;
  color: #333;
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

/* Header styling */
h1 {
  text-align: center;
  color: #007bff;
  font-size: 24px;
  margin-bottom: 10px;
}

/* Current datetime styling */
.current-datetime {
  text-align: center;
  color: #555;
  font-size: 14px;
  margin-bottom: 20px;
  font-style: italic;
}

/* File list styling */
.file-list {
  list-style: none;
  padding: 0;
}

.file-item {
  margin: 10px 0;
}

.file-link {
  color: #007bff;
  text-decoration: none;
  font-size: 16px;
  font-weight: bold;
}

.file-link:hover {
  text-decoration: underline;
  color: #0056b3;
}

/* Loading text */
.loading-text {
  text-align: center;
  font-size: 18px;
  color: #888;
}

/* Modal styling */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  max-width: 600px;
  width: 90%;
  text-align: left;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Status section styling */
.status-section {
  margin-bottom: 15px;
}

.status-running {
  color: #ff9800;
  font-weight: bold;
  display: flex;
  align-items: center;
}

.spinner {
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-top: 3px solid #007bff;
  border-radius: 50%;
  width: 14px;
  height: 14px;
  margin-right: 8px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.status-completed {
  color: #4caf50;
  font-weight: bold;
}

.status-unknown {
  color: #f44336;
  font-weight: bold;
}

/* Buttons */
.close-button {
  background-color: #ff4d4f;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  margin-top: 10px;
}

.close-button:hover {
  background-color: #d9363e;
}

.link-button {
  color: #007bff;
  text-decoration: none;
  font-weight: bold;
}

.link-button:hover {
  text-decoration: underline;
  color: #0056b3;
}

/* Scrolling modal body */
.modal-body {
  overflow-y: auto;
  flex: 1;
}
</style>
