<template>
  <div class="container">
    <h1 class="page-title">Run History</h1>

    <!-- Current Time in EST -->
    <div class="current-datetime">Current EST Time: {{ currentDatetime }}</div>

    <!-- Loading indicator for file list and statuses -->
    <div v-if="filesLoading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading run history...</p>
    </div>

    <!-- Run History List -->
    <ul v-else-if="paginatedFiles.length" class="file-list">
      <li
        v-for="(file, index) in paginatedFiles"
        :key="file.fullPath"
        class="file-item"
        :class="{ latest: index === 0 && currentPage === 1 }"
      >
        <a href="#" @click.prevent="openFileDetails(file.fullPath)" class="file-link">
          {{ file.displayName }}
        </a>
        <!-- Status Badge -->
        <span :class="statusBadgeClass(file.status)" class="status-badge">
          {{ file.status }}
        </span>
      </li>
    </ul>
    <p v-else class="loading-text">No valid files to display.</p>

    <!-- Pagination Controls -->
    <div class="pagination" v-if="totalPages > 1">
      <button @click="previousPage" :disabled="currentPage === 1">Previous</button>
      <span>Page {{ currentPage }} of {{ totalPages }}</span>
      <button @click="nextPage" :disabled="currentPage === totalPages">Next</button>
    </div>

    <!-- Modal for Detailed Info -->
    <div
      v-if="isModalVisible"
      class="modal-overlay"
      @click.self="closeModal"
      ref="modalOverlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div class="modal-content" ref="modalContent" tabindex="-1" @keydown.tab.prevent="handleTab">
        <!-- Modal Header -->
        <div class="modal-header">
          <h2 class="modal-title" id="modal-title">File Details</h2>
          <button @click="closeModal" class="close-button" aria-label="Close Modal">×</button>
        </div>

        <!-- Status Section -->
        <div class="status-section">
          <p v-if="status === 'RUNNING'" class="status-running-text">
            <span class="spinner small-spinner"></span>
            Job is currently running...
          </p>
          <p v-else-if="status === 'COMPLETED'" class="status-completed-text">
            <strong>Job completed successfully!</strong>
          </p>
          <p v-else-if="status === 'PENDING'" class="status-pending-text">
            <strong>Job is pending. Please wait...</strong>
          </p>
          <p v-else-if="status === 'FAIL'" class="status-fail-text">
            <strong>Job failed. Please see details below.</strong>
          </p>
          <p v-else><strong>Status:</strong> {{ status }}</p>
        </div>

        <!-- Real-time countdown for RUNNING status -->
        <div v-if="status === 'RUNNING'" class="update-timer">
          <p>Page updating in {{ pollingCountdown }} seconds...</p>
        </div>

        <!-- Results Section -->
        <div class="modal-body">
          <!-- Optional Company Information -->
          <div v-if="selectedFileDetails.company" class="company-info">
            <p><strong>Company:</strong> {{ selectedFileDetails.company }}</p>
          </div>

          <!-- FAIL scenario with a simple string in RESULT -->
          <div v-if="status === 'FAIL' && resultIsString" class="fail-details">
            <p><strong>Error:</strong> {{ selectedFileDetails.RESULT }}</p>
            <p v-if="selectedFileDetails.RUN_URL">
              <strong>Run Page:</strong>
              <a :href="selectedFileDetails.RUN_URL" target="_blank" class="link-button">
                View Run
              </a>
            </p>
          </div>

          <!-- SUCCESS or other statuses with RESULT as an array -->
          <ul
            v-else-if="
              selectedFileDetails.RESULT &&
              Array.isArray(selectedFileDetails.RESULT) &&
              selectedFileDetails.RESULT.length
            "
            class="results-list"
          >
            <li v-for="(output, i) in selectedFileDetails.RESULT" :key="i" class="output-item">
              <p><strong>Status:</strong> {{ output.status }}</p>
              <p v-if="output.error_details">
                <strong>Error Details:</strong> {{ output.error_details }}
              </p>
              <p>
                <strong>Notebook Path:</strong>
                <span>
                  {{
                    output.parameters && output.parameters.notebook_path
                      ? output.parameters.notebook_path
                      : 'N/A'
                  }}
                </span>
              </p>
              <p>
                <strong>Source:</strong>
                {{
                  output.parameters && output.parameters.source ? output.parameters.source : 'N/A'
                }}
              </p>
              <p v-if="output.run_page_url">
                <strong>Run Page:</strong>
                <a :href="output.run_page_url" target="_blank" class="link-button"> View Run </a>
              </p>
              <hr v-if="i < selectedFileDetails.RESULT.length - 1" />
            </li>
          </ul>
          <p v-else>No output details available.</p>
        </div>

        <!-- Close Button -->
        <button @click="closeModal" class="close-button-bottom">Close</button>
      </div>
    </div>
  </div>
</template>

<script>
import { createFocusTrap } from 'focus-trap'
import { useUserStore } from '@/stores/userStore'

export default {
  data() {
    return {
      files: [], // Raw file data
      formattedFiles: [], // { fullPath, displayName, status }
      isModalVisible: false, // Modal toggle
      selectedFileDetails: {}, // Data from the log file
      status: '', // Current status from the file
      currentDatetime: '', // Current time in EST

      filesLoading: true, // Show spinner while loading

      // Pagination
      currentPage: 1,
      pageSize: 10,

      // Polling
      pollingInterval: null, // Interval reference
      pollingCountdown: 0, // Countdown in seconds for next poll
      pollIntervalSeconds: 10, // Interval for re-fetch in seconds

      // Focus Trap
      trap: null,
    }
  },
  setup() {
    const userStore = useUserStore()
    return { userStore }
  },
  computed: {
    // Check if selectedFileDetails.RESULT is a string for FAIL scenario
    resultIsString() {
      return (
        this.status === 'FAIL' &&
        this.selectedFileDetails.RESULT &&
        typeof this.selectedFileDetails.RESULT === 'string'
      )
    },
    // Sorted files descending by displayName (latest first)
    sortedFiles() {
      return this.formattedFiles.slice().sort((a, b) => {
        const aTime = new Date(a.displayName).getTime()
        const bTime = new Date(b.displayName).getTime()
        return bTime - aTime
      })
    },
    // Paginated files based on current page and pageSize
    paginatedFiles() {
      const start = (this.currentPage - 1) * this.pageSize
      const end = start + this.pageSize
      return this.sortedFiles.slice(start, end)
    },
    totalPages() {
      return Math.ceil(this.sortedFiles.length / this.pageSize)
    },
  },
  methods: {
    async loadFiles() {
      this.filesLoading = true
      try {
        const response = await fetch(
          `https://dev.rocox.co/api/fetch_files?folder=logs&code=${process.env.VUE_APP_FUNCTION_KEY}`,
        )
        if (!response.ok) {
          throw new Error(`Could not load files. HTTP ${response.status}`)
        }

        const filePaths = await response.json()

        // Convert each path into { fullPath, displayName, status: "PENDING" }
        const rawFiles = filePaths
          .map((fullPath) => {
            const fileName = fullPath.split('/').pop() || ''
            const timestamp = parseInt(fileName.split('.')[0], 10)

            let displayName = null
            try {
              const dateObj = new Date(timestamp)
              if (isNaN(dateObj.getTime())) {
                throw new Error('Invalid timestamp')
              }
              const options = {
                timeZone: 'America/New_York',
                timeZoneName: 'short',
              }
              displayName = dateObj.toLocaleString('en-US', options)
            } catch {
              return null
            }

            return { fullPath, displayName, status: 'PENDING' }
          })
          .filter((f) => f !== null)

        // Show all files instead of slicing to 10
        this.formattedFiles = rawFiles

        // Fetch the actual status from get_file_content for each file
        await Promise.all(this.formattedFiles.map((file) => this.fetchFileStatus(file)))
      } catch (error) {
        console.error('Error loading files:', error)
        alert('Error loading run history. Please try again later.')
      } finally {
        this.filesLoading = false
      }
    },

    async fetchFileStatus(file) {
      try {
        const resp = await fetch(
          `https://dev.rocox.co/api/get_file_content?path=${file.fullPath}&code=${process.env.VUE_APP_FUNCTION_KEY}`,
        )
        if (!resp.ok) {
          throw new Error(`Status fetch failed with HTTP ${resp.status}`)
        }
        const data = await resp.json()
        file.status = data.STATUS || 'PENDING'
      } catch (err) {
        file.status = 'FAIL'
      }
    },

    async openFileDetails(filePath) {
      this.stopPolling()

      try {
        const resp = await fetch(
          `https://dev.rocox.co/api/get_file_content?path=${filePath}&code=${process.env.VUE_APP_FUNCTION_KEY}`,
        )
        if (!resp.ok) {
          throw new Error(`Failed to open file. HTTP ${resp.status}`)
        }
        const fileData = await resp.json()

        this.selectedFileDetails = fileData
        this.status = fileData.STATUS || 'PENDING'
        this.isModalVisible = true

        const fileRef = this.formattedFiles.find((f) => f.fullPath === filePath)
        if (fileRef) fileRef.status = this.status

        if (this.status === 'RUNNING') {
          this.startPolling(filePath)
        }

        this.$nextTick(() => {
          if (this.isModalVisible) {
            this.trap = createFocusTrap(this.$refs.modalContent, {
              escapeDeactivates: true,
              clickOutsideDeactivates: true,
              onDeactivate: this.closeModal,
            })
            this.trap.activate()
          }
        })
      } catch (error) {
        console.error('Error fetching file content:', error)
        alert('Could not load file details. Please try again later.')
      }
    },

    startPolling(filePath) {
      this.pollingCountdown = this.pollIntervalSeconds
      this.stopPolling()

      this.pollingInterval = setInterval(async () => {
        this.pollingCountdown--

        if (this.pollingCountdown <= 0) {
          this.pollingCountdown = this.pollIntervalSeconds

          try {
            if (this.status !== 'RUNNING') {
              this.stopPolling()
              return
            }

            const resp = await fetch(
              `https://dev.rocox.co/api/get_file_content?path=${filePath}&code=${process.env.VUE_APP_FUNCTION_KEY}`,
            )
            if (!resp.ok) {
              throw new Error(`Poll error. HTTP ${resp.status}`)
            }
            const fileData = await resp.json()
            this.selectedFileDetails = fileData
            this.status = fileData.STATUS

            const fileRef = this.formattedFiles.find((f) => f.fullPath === filePath)
            if (fileRef) fileRef.status = fileData.STATUS

            if (this.status !== 'RUNNING') {
              this.stopPolling()
            }
          } catch (err) {
            console.error('Polling error:', err)
            alert('Error polling the job status. Please try again.')
            this.stopPolling()
          }
        }
      }, 1000)
    },

    stopPolling() {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval)
        this.pollingInterval = null
      }
      this.pollingCountdown = 0

      if (this.trap) {
        this.trap.deactivate()
        this.trap = null
      }
    },

    closeModal() {
      this.isModalVisible = false
      this.selectedFileDetails = {}
      this.status = ''
      this.stopPolling()
    },

    updateCurrentDatetime() {
      const options = {
        timeZone: 'America/New_York',
        timeZoneName: 'short',
      }
      this.currentDatetime = new Date().toLocaleString('en-US', options)
    },

    statusBadgeClass(status) {
      switch (status) {
        case 'RUNNING':
          return 'badge-running'
        case 'COMPLETED':
          return 'badge-completed'
        case 'PENDING':
          return 'badge-pending'
        case 'FAIL':
          return 'badge-fail'
        default:
          return 'badge-unknown'
      }
    },

    handleTab(e) {
      e.preventDefault()
    },

    // Pagination controls
    goToPage(pageNumber) {
      if (pageNumber >= 1 && pageNumber <= this.totalPages) {
        this.currentPage = pageNumber
      }
    },

    nextPage() {
      if (this.currentPage < this.totalPages) {
        this.currentPage++
      }
    },

    previousPage() {
      if (this.currentPage > 1) {
        this.currentPage--
      }
    },
  },
  mounted() {
    this.updateCurrentDatetime()
    this.loadFiles()
    this.datetimeInterval = setInterval(this.updateCurrentDatetime, 1000)
  },
  beforeUnmount() {
    this.stopPolling()
    clearInterval(this.datetimeInterval)
  },
}
</script>

<style scoped>
/* Overall container styling */
.container {
  max-width: 850px;
  margin: 20px auto;
  padding: 20px;
  background: #fafafa;
  border-radius: 8px;
  font-family: Arial, sans-serif;
  color: #333;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

/* Title */
.page-title {
  text-align: center;
  font-size: 24px;
  margin-bottom: 10px;
  color: #007bff;
}

/* Current time styling */
.current-datetime {
  text-align: center;
  color: #555;
  font-size: 14px;
  margin-bottom: 20px;
  font-style: italic;
}

/* Loading state */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 40px;
}
.loading-state .spinner {
  border: 6px solid rgba(0, 0, 0, 0.1);
  border-top: 6px solid #007bff;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* File list */
.file-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.file-item {
  background: #fff;
  margin: 10px 0;
  padding: 12px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-left: 4px solid transparent;
  transition: border-color 0.3s;
}
.file-item.latest {
  border-left: 4px solid #007bff;
}
.file-link {
  color: #007bff;
  text-decoration: none;
  font-size: 16px;
  font-weight: bold;
  flex: 1;
  margin-right: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.file-link:hover {
  text-decoration: underline;
  color: #0056b3;
}

/* Status badges for listing */
.status-badge {
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: bold;
  color: #fff;
  margin-left: 10px;
  white-space: nowrap;
}

.badge-running {
  background: #1a69d7;
}
.badge-completed {
  background: #4caf50;
}
.badge-pending {
  background: #ffa500;
}
.badge-fail {
  background: #f44336;
}
.badge-unknown {
  background: #9e9e9e;
}

/* Pagination styling */
.pagination {
  display: flex;
  justify-content: center;
  margin-top: 20px;
  gap: 10px;
}
.pagination button {
  padding: 6px 12px;
  font-size: 14px;
  border: 1px solid #ccc;
  background: #fff;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s ease;
}
.pagination button:hover {
  background: #f0f0f0;
}
.pagination button:disabled {
  background: #e0e0e0;
  cursor: not-allowed;
}

/* No valid files */
.loading-text {
  text-align: center;
  font-size: 16px;
  margin-top: 20px;
  color: #888;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
}

.modal-content {
  background: #fff;
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  border-radius: 8px;
  position: relative;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

/* Modal Header */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.modal-title {
  margin: 0;
  font-size: 20px;
  color: #333;
}
.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #888;
  transition: color 0.3s;
}
.close-button:hover {
  color: #333;
}

/* Status text in the modal */
.status-running-text {
  color: #007bff;
  display: flex;
  align-items: center;
  font-weight: bold;
}
.status-completed-text {
  color: #4caf50;
  font-weight: bold;
}
.status-pending-text {
  color: #ffa500;
  font-weight: bold;
}
.status-fail-text {
  color: #f44336;
  font-weight: bold;
}

/* Spinner for small usage */
.spinner.small-spinner {
  width: 14px;
  height: 14px;
  margin-right: 8px;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-top: 3px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* Timer text for run updates */
.update-timer p {
  font-size: 14px;
  color: #666;
  margin-top: 5px;
  font-style: italic;
}

/* Modal body */
.modal-body {
  overflow-y: auto;
  flex: 1;
  border-top: 1px solid #eee;
  margin-top: 10px;
  padding-top: 10px;
}
.company-info {
  margin-bottom: 10px;
}
.results-list {
  list-style: none;
  padding: 0;
}
.output-item {
  margin-bottom: 15px;
}
.fail-details {
  margin-bottom: 15px;
}

/* Close button at the bottom */
.close-button-bottom {
  align-self: flex-end;
  background: #ff4d4f;
  color: #fff;
  border: none;
  padding: 10px 18px;
  border-radius: 5px;
  cursor: pointer;
  margin-top: 10px;
  font-weight: bold;
  font-size: 14px;
  transition: background-color 0.3s;
}
.close-button-bottom:hover {
  background: #d9363e;
}

/* Link for run page */
.link-button {
  color: #007bff;
  text-decoration: none;
  font-weight: bold;
}
.link-button:hover {
  text-decoration: underline;
  color: #0056b3;
}
</style>
