<template>
  <div class="container">
    <!-- FILE SELECTION -->
    <div class="form-section">
      <label for="file-input" class="file-upload-label">
        <i class="fas fa-cloud-upload-alt"></i>
        Click to select files (CSV, Pipe, XLS, XLSX)
      </label>
      <input id="file-input" type="file" multiple @change="handleFileSelect" class="file-input" />
      <p v-if="selectedFiles.length" class="file-info">
        Selected Files: {{ selectedFiles.map((f) => f.name).join(', ') }}
      </p>
    </div>

    <!-- FILE CONFIG SECTION -->
    <div v-if="selectedFiles.length" class="file-config-section">
      <h2>Configure Each File</h2>

      <div v-for="(fc, index) in fileConfigs" :key="index" class="file-config">
        <!-- Basic File Info -->
        <div class="file-details">
          <p>
            <strong>{{ fc.file.name }}</strong>
          </p>
          <p v-if="fc.invalidFormat" class="invalid-format">
            ❌ Unsupported format. Only CSV, Pipe, XLS, XLSX are allowed.
          </p>
        </div>

        <!-- If valid format => user picks auto/manual row, folder, company -->
        <div v-if="!fc.invalidFormat">
          <!-- AUTO-SELECT TOGGLE -->
          <div class="auto-select-row">
            <label class="checkbox-label">
              <input type="checkbox" v-model="fc.autoSelect" @change="onAutoManualToggle(index)" />
              Auto-Detect Header Row
            </label>

            <!-- If not autoSelect => let user specify row number -->
            <div v-if="!fc.autoSelect" class="row-number-input">
              <label>Header Row #:</label>
              <input
                type="number"
                min="1"
                v-model.number="fc.manualHeaderRow"
                @change="onManualRowChange(index)"
              />
            </div>
          </div>

          <!-- FOLDER -->
          <label class="dropdown-label">Select Folder:</label>
          <select v-model="fc.folder" @change="onFolderChange(index)" class="dropdown">
            <option value="" disabled>Select Folder</option>
            <option value="MVR">MVR</option>
            <option value="Services & Deductions">Services & Deductions</option>
            <option value="Company Statements">Company Statements</option>
          </select>

          <!-- If folder=MVR => show only companies with mvr_fields -->
          <div v-if="fc.folder === 'MVR'" class="dropdown-group">
            <label class="dropdown-label">Select Company (MVR):</label>
            <select v-model="fc.company" class="dropdown" @change="handleCompanyChange(index)">
              <option value="" disabled>Select a Company</option>
              <option
                v-for="m in fc.filteredCompanies"
                :key="m.full_company_name"
                :value="m.full_company_name"
              >
                {{ m.full_company_name }}
              </option>
            </select>
          </div>

          <!-- If folder=Company Statements => show only companies with statement_fields -->
          <div v-else-if="fc.folder === 'Company Statements'" class="dropdown-group">
            <label class="dropdown-label">Select Company (Statements):</label>
            <select v-model="fc.company" class="dropdown" @change="handleCompanyChange(index)">
              <option value="" disabled>Select a Company</option>
              <option
                v-for="m in fc.filteredCompanies"
                :key="m.full_company_name"
                :value="m.full_company_name"
              >
                {{ m.full_company_name }}
              </option>
            </select>
          </div>

          <!-- Services => no company needed -->
          <p v-else-if="fc.folder === 'Services & Deductions'" class="info-text">
            No company selection needed for Services & Deductions.
          </p>

          <!-- PROGRESS BAR 0-100 => parse + sum + DB -->
          <div
            v-if="fc.fileProcessProgress < 100 && fc.fileProcessProgress > 0"
            class="process-bar-wrapper"
          >
            <div class="process-bar" :style="{ width: fc.fileProcessProgress + '%' }"></div>
            <p class="process-bar-text">{{ fc.fileProcessProgress }}% ...</p>
          </div>

          <!-- MISSING FIELDS or success -->
          <div v-if="fc.missingFields.length" class="missing-fields">
            <p><strong>Missing Fields:</strong> {{ fc.missingFields.join(', ') }}</p>
          </div>
          <p v-else-if="fc.fieldsValid" class="valid-fields">✅ All required fields match.</p>

          <!-- GROSS SUM -->
          <p v-if="fc.grossCommSum !== undefined && fc.fieldsValid" class="gross-comm">
            <strong>Total Gross Commission (this file):</strong>
            {{ fc.grossCommSum.toFixed(2) }}
          </p>

          <!-- DB RESULT -->
          <p v-if="fc.dbCheckDone && fc.matchExists" class="match-alert">
            ⚠️ The total gross commission matches a month in the last 3 months!
          </p>
          <p v-else-if="fc.dbCheckDone && !fc.matchExists" class="match-ok">
            ✅ No matches found in the last 3 months. You're good to go!
          </p>

          <!-- UPLOAD progress if uploading -->
          <div v-if="uploading && uploadProgress[fc.file.name]" class="upload-progress-wrapper">
            <p>Uploading: {{ uploadProgress[fc.file.name] }}%</p>
            <progress :value="uploadProgress[fc.file.name]" max="100"></progress>
          </div>
        </div>
      </div>
    </div>

    <!-- SUBMIT / UPLOAD ALL -->
    <div v-if="selectedFiles.length" class="submit-section">
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
          v-for="(res, i) in uploadResults"
          :key="i"
          :class="{
            'upload-success': res.status === 'success',
            'upload-failed': res.status === 'failed',
          }"
        >
          {{ res.fileName }}: {{ res.message }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

export default {
  data() {
    return {
      selectedFiles: [],
      fileConfigs: [],
      uploading: false,
      uploadResponse: null,
      uploadResults: [],
      uploadProgress: {},
      companyMetadata: [],
    }
  },
  methods: {
    async handleFileSelect(e) {
      const files = Array.from(e.target.files)
      const validExts = ['csv', 'xls', 'xlsx']

      // fetch metadata if not loaded
      if (!this.companyMetadata.length) {
        await this.fetchCompanyMetadata()
      }

      this.selectedFiles = files
      this.fileConfigs = files.map((file) => {
        const ext = file.name.split('.').pop().toLowerCase()
        return {
          file,
          folder: '',
          company: '',
          invalidFormat: !validExts.includes(ext),
          autoSelect: true,
          manualHeaderRow: 1,
          fileProcessProgress: 0,
          missingFields: [],
          fieldsValid: false,
          grossCommSum: undefined,
          dbCheckDone: false,
          matchExists: false,
          filteredCompanies: [],
          _headers: [],
          _dataRows: [],
        }
      })
    },

    async fetchCompanyMetadata() {
      try {
        const resp = await axios.get(
          'https://dev.rocox.co/api/get_file_content?path=/caley-operations-dev/Static Files/company_metadata.json',
        )
        this.companyMetadata = resp.data
      } catch (err) {
        console.error('Failed to fetch metadata:', err)
      }
    },

    onAutoManualToggle(i) {
      const fc = this.fileConfigs[i]
      // Just reset parse results, but keep folder and company so the user doesn't lose their selection
      fc.fileProcessProgress = 0
      fc.missingFields = []
      fc.fieldsValid = false
      fc.grossCommSum = undefined
      fc.dbCheckDone = false
      fc.matchExists = false
      fc._headers = []
      fc._dataRows = []
    },

    async onManualRowChange(i) {
      const fc = this.fileConfigs[i]
      fc.fileProcessProgress = 0
      fc.missingFields = []
      fc.fieldsValid = false
      fc.grossCommSum = undefined
      fc.dbCheckDone = false
      fc.matchExists = false
      fc._headers = []
      fc._dataRows = []

      if (fc.folder && fc.company && !fc.invalidFormat) {
        await this.parseAndValidate(fc, 50)
        if (fc.fieldsValid && fc.grossCommSum !== undefined) {
          fc.fileProcessProgress = 50
          await this.checkDb(fc, 100)
        } else {
          fc.fileProcessProgress = 100
        }
      }
    },

    onFolderChange(i) {
      const fc = this.fileConfigs[i]
      if (!fc.folder) return

      // Keep the user's auto/manual selection, but reset parse results
      fc.company = ''
      fc.missingFields = []
      fc.fieldsValid = false
      fc.grossCommSum = undefined
      fc.dbCheckDone = false
      fc.matchExists = false
      fc.fileProcessProgress = 0

      // Filter companies: MVR => c.mvr_fields, Statements => c.statement_fields
      if (fc.folder === 'MVR') {
        fc.filteredCompanies = this.companyMetadata.filter((c) => c.mvr_fields)
      } else if (fc.folder === 'Company Statements') {
        fc.filteredCompanies = this.companyMetadata.filter((c) => c.statement_fields)
      } else {
        fc.filteredCompanies = []
      }
    },

    async handleCompanyChange(i) {
      const fc = this.fileConfigs[i]
      if (!fc.folder || !fc.company || fc.invalidFormat) return

      fc.fileProcessProgress = 0
      await this.parseAndValidate(fc, 50)

      // Only do DB check if it's Company Statements and fields are valid + sum found
      if (fc.folder === 'Company Statements' && fc.fieldsValid && fc.grossCommSum !== undefined) {
        fc.fileProcessProgress = 50
        await this.checkDb(fc, 100)
      } else {
        // For MVR or no sum, we skip and just set progress = 100
        fc.fileProcessProgress = 100
      }
    },

    async parseAndValidate(fc, halfPoint) {
      fc.missingFields = []
      fc.fieldsValid = false
      fc.grossCommSum = undefined
      fc.dbCheckDone = false
      fc.matchExists = false
      fc._headers = []
      fc._dataRows = []

      // 1) Find relevant metadata
      let meta
      if (fc.folder === 'MVR') {
        // For MVR, we look for the company's mvr_fields
        meta = this.companyMetadata.find((c) => c.full_company_name === fc.company && c.mvr_fields)
      } else if (fc.folder === 'Company Statements') {
        meta = this.companyMetadata.find(
          (c) => c.full_company_name === fc.company && c.statement_fields,
        )
      }

      if (!meta) {
        fc.missingFields.push('No metadata found for this selection')
        return
      }

      // 2) Parse file => 0->half
      await this.parseFile(fc, halfPoint)

      if (!fc._headers.length) {
        fc.missingFields.push('No header row found')
        return
      }

      // 3) Identify the dictionary object for MVR or statements
      let fieldDict // <--- The dictionary from the metadata
      if (fc.folder === 'MVR') {
        fieldDict = meta.mvr_fields
      } else {
        fieldDict = meta.statement_fields
      }
      if (!fieldDict) {
        fc.missingFields.push('No fields defined in metadata')
        return
      }

      // 4) We gather all distinct internal fields from the dictionary.
      // For example, { "Policy #": "policy_number", "Pol #": "policy_number", "Prem": "premium" }
      // => we might need to find "policy_number", "premium" as required internal fields
      const neededFields = [...new Set(Object.values(fieldDict))]
      // Example result: ["policy_number", "premium", "gross_comission"]

      // Build a map: internalField -> array of possible CSV headers
      // e.g. "policy_number" -> ["Policy #", "Pol #"], "premium" -> ["Prem"]
      const fieldMap = {}
      neededFields.forEach((internal) => {
        fieldMap[internal] = []
      })

      for (const [csvField, internalField] of Object.entries(fieldDict)) {
        if (fieldMap[internalField]) {
          fieldMap[internalField].push(csvField)
        }
      }

      // 5) Check missing. For each internal field, at least one possible CSV header must appear in user’s file
      const missing = []
      for (const [internalField, possibleCsvHeaders] of Object.entries(fieldMap)) {
        // If dictionary told us "Pol #", "Policy #" both map to "policy_number",
        // then possibleCsvHeaders = ["Pol #", "Policy #"].
        // We only need at least one of these in fc._headers.
        if (!possibleCsvHeaders.length) continue

        const found = possibleCsvHeaders.some((hdr) => fc._headers.includes(hdr))
        if (!found) {
          missing.push(`"${internalField}"`)
        }
      }
      fc.missingFields = missing
      fc.fieldsValid = missing.length === 0
      if (!fc.fieldsValid) {
        // If any required internal field not found, mark as invalid
        return
      }

      // 6) If folder = MVR => skip summation & DB check, done
      if (fc.folder === 'MVR') {
        return
      }

      // 7) If folder = Company Statements => do summation for "gross_comission"
      // e.g. internal field = "gross_comission"
      const possibleGross = fieldMap['gross_comission'] || []
      const matchedGrossHdr = possibleGross.find((h) => fc._headers.includes(h))
      if (!matchedGrossHdr) {
        fc.missingFields.push(`"gross_comission" field`)
        fc.fieldsValid = false
        return
      }

      // 8) Summation: handle negative parentheses, strip out non-numerics
      let sum = 0
      for (const row of fc._dataRows) {
        let val = row[matchedGrossHdr]
        if (val) {
          if (typeof val !== 'string') {
            val = val == null ? '' : String(val)
          }
          let strVal = val.trim()
          let isNegative = false
          // parentheses => negative
          if (strVal.startsWith('(') && strVal.endsWith(')')) {
            isNegative = true
            strVal = strVal.slice(1, -1)
          }
          strVal = strVal.replace(/[^0-9.\-]+/g, '')
          let numericVal = parseFloat(strVal) || 0
          if (isNegative) numericVal = -numericVal

          sum += numericVal
        }
      }
      fc.grossCommSum = sum
    },
    async checkDb(fc, endPoint) {
      fc.dbCheckDone = false
      fc.matchExists = false
      fc.fileProcessProgress = Math.max(fc.fileProcessProgress, 50)

      const now = new Date()
      let found = false
      const sum2d = parseFloat(fc.grossCommSum.toFixed(2))

      try {
        for (let offset = 0; offset < 3; offset++) {
          const d = new Date(now.getFullYear(), now.getMonth() - offset, 1)
          const m = d.getMonth() + 1
          const y = d.getFullYear()

          const queryStr = `
            SELECT SUM(gross_comission) as sum_gross
            FROM PRD.PremiumReport
            WHERE MONTH(AddedDate) = ${m}
              AND YEAR(AddedDate) = ${y}
              AND carrier = '${fc.company}'
          `
          const resp = await axios.post('https://dev.rocox.co/api/query_db', {
            query: queryStr,
          })
          const [row] = resp.data || []
          const moSum = parseFloat(parseFloat(row?.sum_gross || 0).toFixed(2))
          if (moSum === sum2d) {
            found = true
          }
        }
        fc.matchExists = found
      } catch (err) {
        console.error('DB check error:', err)
      }

      fc.dbCheckDone = true
      fc.fileProcessProgress = endPoint
    },

    // parseFile => single pass parse with worker for CSV up to ~5k rows
    async parseFile(fc, halfPoint) {
      fc._headers = []
      fc._dataRows = []
      fc.fileProcessProgress = 0

      const file = fc.file
      const ext = file.name.split('.').pop().toLowerCase()

      if (ext === 'csv') {
        await this.parseCSV(fc, file, halfPoint)
      } else if (ext === 'xls' || ext === 'xlsx') {
        await this.parseXLS(fc, file, halfPoint)
      } else {
        fc.fileProcessProgress = halfPoint
      }
    },

    async parseCSV(fc, file, halfPoint) {
      return new Promise((resolve) => {
        Papa.parse(file, {
          delimiter: '',
          skipEmptyLines: true,
          header: false,
          worker: true,
          complete: (results) => {
            if (!results.data.length) {
              fc._headers = []
              fc._dataRows = []
              fc.fileProcessProgress = halfPoint
              resolve()
              return
            }
            let rawRows = results.data
            if (fc.autoSelect) {
              // detect best row
              let bestIndex = 0
              let bestScore = 0
              const maxCheck = Math.min(rawRows.length, 20)
              for (let i = 0; i < maxCheck; i++) {
                const row = rawRows[i]
                const sc = row.filter((c) => c && c.toString().trim() !== '').length
                if (sc > bestScore) {
                  bestScore = sc
                  bestIndex = i
                }
              }
              this.buildRowsFromIndex(fc, rawRows, bestIndex)
            } else {
              let userIndex = fc.manualHeaderRow - 1
              if (userIndex < 0 || userIndex >= rawRows.length) {
                fc._headers = []
                fc._dataRows = []
              } else {
                this.buildRowsFromIndex(fc, rawRows, userIndex)
              }
            }
            fc.fileProcessProgress = halfPoint
            resolve()
          },
          error: (err) => {
            console.error('Papa parse error:', err)
            fc._headers = []
            fc._dataRows = []
            fc.fileProcessProgress = halfPoint
            resolve()
          },
        })
      })
    },

    async parseXLS(fc, file, halfPoint) {
      return new Promise((resolve) => {
        fc.fileProcessProgress = 10
        const reader = new FileReader()
        reader.onload = (e) => {
          fc.fileProcessProgress = halfPoint - 10
          const data = new Uint8Array(e.target.result)
          const wb = XLSX.read(data, { type: 'array' })
          const sheet = wb.Sheets[wb.SheetNames[0]]
          const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
          if (!raw.length) {
            fc._headers = []
            fc._dataRows = []
            fc.fileProcessProgress = halfPoint
            resolve()
            return
          }
          if (fc.autoSelect) {
            let bestIndex = 0
            let bestScore = 0
            const maxCheck = Math.min(raw.length, 20)
            for (let i = 0; i < maxCheck; i++) {
              const row = raw[i]
              const sc = row.filter((c) => c && c.toString().trim() !== '').length
              if (sc > bestScore) {
                bestScore = sc
                bestIndex = i
              }
            }
            this.buildRowsFromXLSIndex(fc, raw, bestIndex)
          } else {
            let userIndex = fc.manualHeaderRow - 1
            if (userIndex < 0 || userIndex >= raw.length) {
              fc._headers = []
              fc._dataRows = []
            } else {
              this.buildRowsFromXLSIndex(fc, raw, userIndex)
            }
          }
          fc.fileProcessProgress = halfPoint
          resolve()
        }
        reader.onerror = (err) => {
          console.error('XLS parse error:', err)
          fc._headers = []
          fc._dataRows = []
          fc.fileProcessProgress = halfPoint
          resolve()
        }
        reader.readAsArrayBuffer(file)
      })
    },

    buildRowsFromIndex(fc, rawRows, headerIndex) {
      const headers = rawRows[headerIndex].map((x) => (x || '').trim())
      const dataRows = []
      for (let i = 0; i < rawRows.length; i++) {
        if (i === headerIndex) continue
        const row = rawRows[i]
        const obj = {}
        row.forEach((val, idx) => {
          const head = headers[idx] || `Unknown_${idx}`
          obj[head] = val
        })
        dataRows.push(obj)
      }
      fc._headers = headers
      fc._dataRows = dataRows
    },

    buildRowsFromXLSIndex(fc, raw, headerIndex) {
      const headers = raw[headerIndex].map((h) => (h || '').toString().trim())
      const dataRows = []
      for (let i = 0; i < raw.length; i++) {
        if (i === headerIndex) continue
        const row = raw[i]
        const obj = {}
        row.forEach((val, idx) => {
          const head = headers[idx] || `Unknown_${idx}`
          obj[head] = val
        })
        dataRows.push(obj)
      }
      fc._headers = headers
      fc._dataRows = dataRows
    },

    /* 6) Final upload of all files, each with separate progress */
    async uploadFiles() {
      this.uploading = true
      this.uploadResponse = null
      this.uploadResults = []

      for (let i = 0; i < this.fileConfigs.length; i++) {
        const fc = this.fileConfigs[i]
        if (fc.invalidFormat) {
          this.uploadResults.push({
            fileName: fc.file.name,
            status: 'failed',
            message: 'Invalid format, not uploaded.',
          })
          continue
        }

        const formData = new FormData()
        formData.append('file', fc.file)
        formData.append('folder', fc.folder)
        formData.append('company', fc.company)

        try {
          await axios.post('https://dev.rocox.co/api/upload_files', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (pe) => {
              const pc = Math.round((pe.loaded * 100) / pe.total)
              this.uploadProgress[fc.file.name] = pc
            },
          })

          this.uploadResults.push({
            fileName: fc.file.name,
            status: 'success',
            message: 'Uploaded successfully',
          })
        } catch (error) {
          console.error(`Error uploading file '${fc.file.name}':`, error.message)
          this.uploadResults.push({
            fileName: fc.file.name,
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
/* Container */
.container {
  max-width: 850px;
  margin: 20px auto;
  padding: 20px;
  font-family: Arial, sans-serif;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  color: #333;
}

/* File Upload */
.form-section {
  text-align: center;
  margin-bottom: 20px;
}
.file-upload-label {
  display: inline-block;
  background-color: #007bff;
  color: #fff;
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

/* File Config Section */
.file-config-section {
  margin-top: 20px;
  text-align: left;
}
.file-config-section h2 {
  font-size: 1.5rem;
  margin-bottom: 10px;
  text-align: center;
}
.file-config {
  margin: 15px 0;
  padding: 10px;
  background: #f9f9f9;
  border-radius: 8px;
  border: 1px solid #ddd;
}
.file-details {
  margin-bottom: 10px;
}
.invalid-format {
  color: #dc3545;
  margin-top: 5px;
}

/* Auto / Manual Row */
.auto-select-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 10px;
}
.checkbox-label {
  font-size: 14px;
}
.row-number-input {
  display: flex;
  align-items: center;
  gap: 8px;
}
.row-number-input input {
  width: 60px;
  padding: 4px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

/* Folder / Company */
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

/* Summaries & Errors */
.missing-fields {
  margin-top: 10px;
  color: #dc3545;
  font-size: 14px;
}
.valid-fields {
  margin-top: 10px;
  color: #28a745;
  font-size: 14px;
}
.gross-comm {
  margin-top: 10px;
  font-size: 14px;
  color: #333;
}
.match-alert {
  margin-top: 5px;
  font-size: 14px;
  color: #dc3545;
  font-weight: bold;
}
.match-ok {
  margin-top: 5px;
  font-size: 14px;
  color: #28a745;
  font-weight: bold;
}

/* Progress Bar for parse+db check */
.process-bar-wrapper {
  width: 100%;
  background-color: #f0f0f0;
  margin: 10px 0;
  height: 20px;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}
.process-bar {
  background: linear-gradient(90deg, #007bff, #00bfff);
  height: 100%;
  transition: width 0.3s ease;
}
.process-bar-text {
  font-size: 14px;
  margin-top: 5px;
  color: #555;
}

/* Upload progress bar */
.upload-progress-wrapper {
  margin-top: 10px;
}

/* Submit Section */
.submit-section {
  margin-top: 20px;
  text-align: center;
}
.upload-button {
  background-color: #28a745;
  color: #fff;
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
.upload-response {
  margin-top: 10px;
  font-size: 14px;
  color: #555;
}
.upload-results {
  list-style: none;
  padding: 0;
  margin-top: 10px;
}
.upload-results li {
  font-size: 14px;
  margin: 5px 0;
}
.upload-success {
  color: #28a745;
}
.upload-failed {
  color: #dc3545;
}
</style>
