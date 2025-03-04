<template>
  <div class="file-management">
    <!-- Header -->
    <header class="header">
      <h1>File Management</h1>
      <p class="subtitle">Browse, download, and upload files effortlessly.</p>
    </header>

    <!-- Main Content -->
    <main class="content">
      <div class="controls">
        <select
          v-model="rootFolder"
          class="folder-select"
          @change="changeRootFolder"
          :disabled="filesLoading"
        >
          <option value="/output_files">Output Files</option>
          <option value="/processed_files">Processed Files</option>
        </select>
        <input
          type="text"
          placeholder="Search files..."
          v-model="searchQuery"
          class="search-input"
          :disabled="filesLoading"
        />
        <button
          v-if="currentPath !== rootFolder"
          @click="goBack"
          class="btn back-btn"
          :disabled="filesLoading"
        >
          <i class="pi pi-arrow-left"></i> Back
        </button>
      </div>

      <!-- File List -->
      <div class="file-table" v-if="!filesLoading && !errorFiles">
        <div class="file-grid" v-if="filteredItems.length">
          <div
            v-for="item in filteredItems"
            :key="item.path"
            class="file-card"
            :class="{ selected: selectedItem?.path === item.path }"
            @click="navigate(item)"
          >
            <div class="file-icon">
              <i :class="itemIcon(item)" />
            </div>
            <div class="file-details">
              <span class="file-name" :title="item.name">{{ truncateName(item.name) }}</span>
              <span v-if="item.type === 'file'" class="file-type">
                {{ item.name.split('.').pop() }}
              </span>
            </div>
            <button
              v-if="item.type === 'file'"
              class="btn download-btn"
              @click.stop="downloadFile(item)"
              :disabled="downloading && downloadingFile === item.path"
            >
              <i class="pi pi-download" :class="{ 'pi-spin': downloading && downloadingFile === item.path }"></i>
            </button>
          </div>
        </div>
        <p v-else class="no-data">
          No folders or files found in {{ currentPath.split('/').pop() || rootFolder.split('/').pop() }}.
        </p>
      </div>

      <!-- Loading/Error States -->
      <div class="status" v-if="filesLoading || errorFiles">
        <p v-if="filesLoading" class="loading">Loading files...</p>
        <p v-if="errorFiles" class="error">{{ errorFiles }}</p>
      </div>

      <!-- Upload Button (Below File Table) -->
      <button
        class="btn upload-btn"
        @click="showUploadDialog = true"
        :disabled="uploading || filesLoading"
      >
        <i class="pi pi-plus"></i> Upload Files
      </button>

      <!-- Upload Dialog -->
      <div v-if="showUploadDialog" class="upload-dialog" :class="{ open: showUploadDialog }">
        <div class="dialog-content">
          <h2>Upload Files</h2>
          <button class="close-btn" @click="cancelUpload" :disabled="uploading">×</button>

          <div class="upload-section">
            <label for="file-input" class="file-upload-label">
              <i class="pi pi-cloud-upload"></i>
              Drag and drop files here or click to select (CSV, XLS, XLSX, XLSM)
            </label>
            <input
              id="file-input"
              type="file"
              multiple
              @change="handleFileSelect"
              accept=".csv,.xls,.xlsx,.xlsm"
              class="file-input"
            />
            <div v-if="selectedFiles.length" class="selected-files">
              <p><strong>Selected:</strong> {{ selectedFiles.map((f) => f.name).join(', ') }}</p>
              <button @click="clearFiles" class="btn clear-btn" :disabled="uploading">Clear</button>
            </div>

            <div v-if="fileConfigs.length" class="file-configs">
              <h3>Configure Upload</h3>
              <div v-for="(fc, index) in fileConfigs" :key="index" class="file-config">
                <div class="file-header">
                  <span class="file-name">{{ fc.file.name }}</span>
                  <button @click="removeFile(index)" class="remove-btn" :disabled="uploading">
                    ×
                  </button>
                </div>

                <div v-if="fc.invalidFormat" class="invalid-format">
                  <p class="error">Unsupported format. Only CSV, XLS, XLSX, XLSM allowed.</p>
                </div>
                <div v-else class="config-fields">
                  <div class="field">
                    <label for="folder">Folder <span class="required">*</span></label>
                    <select
                      v-model="fc.folder"
                      :id="'folder-' + index"
                      @change="onFolderChange(index)"
                      :class="{ invalid: !fc.folder }"
                      :disabled="uploading"
                    >
                      <option value="" disabled>Select Folder</option>
                      <option v-for="option in folderOptions" :key="option.value" :value="option.value">
                        {{ option.label }}
                      </option>
                    </select>
                    <p v-if="!fc.folder" class="error">Folder is required.</p>
                  </div>

                  <div v-if="fc.folder === 'MVR' || fc.folder === 'Company Statements'" class="field">
                    <label :for="'company-' + index">Company <span class="required">*</span></label>
                    <select
                      v-model="fc.company"
                      :id="'company-' + index"
                      @change="handleCompanyChange(index)"
                      :class="{ invalid: fc.folder && !fc.company }"
                      :disabled="uploading"
                    >
                      <option value="" disabled>Select a Company</option>
                      <option v-for="company in fc.filteredCompanies" :key="company.full_company_name" :value="company.full_company_name">
                        {{ company.full_company_name }}
                      </option>
                    </select>
                    <p v-if="fc.folder && !fc.company" class="error">Company is required.</p>
                  </div>
                  <div v-else-if="fc.folder === 'Deduction & Services'" class="field">
                    <p class="info">No company selection needed for Deduction & Services.</p>
                  </div>

                  <div class="field">
                    <label>
                      <input
                        type="checkbox"
                        v-model="fc.autoSelect"
                        @change="onAutoManualToggle(index)"
                        :disabled="uploading"
                      />
                      <span class="checkbox-label">Auto-Detect Header Row</span>
                    </label>
                    <div v-if="!fc.autoSelect" class="header-row-input">
                      <label>Header Row #:</label>
                      <input
                        type="number"
                        v-model.number="fc.manualHeaderRow"
                        min="1"
                        @input="onManualRowChange(index)"
                        class="input-number"
                        :disabled="uploading"
                      />
                    </div>
                  </div>

                  <div v-if="fc.fileProcessProgress > 0 && fc.fileProcessProgress < 100" class="progress-wrapper">
                    <div class="progress-bar" :style="{ width: `${fc.fileProcessProgress}%` }"></div>
                    <p class="progress-text">{{ fc.fileProcessProgress }}% Processing...</p>
                  </div>

                  <div v-if="fc.missingFields.length" class="validation-message">
                    <p class="warn">
                      <strong>Missing Fields:</strong> {{ fc.missingFields.join(', ') }}
                    </p>
                  </div>
                  <div v-else-if="fc.fieldsValid" class="validation-message">
                    <p class="success">All required fields match.</p>
                  </div>

                  <div v-if="fc.carrierNameMessage" class="validation-message">
                    <p :class="fc.carrierNameIsMatch ? 'success' : 'warn'">
                      {{ fc.carrierNameMessage }}
                    </p>
                  </div>

                  <div v-if="fc.dbCheckDone && fc.matchExists" class="validation-message">
                    <p class="warn">Total gross commission matches a recent month!</p>
                  </div>
                  <div v-else-if="fc.dbCheckDone && !fc.matchExists" class="validation-message">
                    <p class="success">No recent matches found.</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="submit-section">
              <button
                :disabled="!selectedFiles.length || uploading || !allConfigsValid"
                @click="uploadFiles"
                class="btn upload-btn-dialog"
              >
                <i class="pi pi-upload"></i> {{ uploading ? 'Uploading...' : 'Upload Files' }}
              </button>
              <button @click="cancelUpload" class="btn cancel-btn" :disabled="uploading">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Toast Notifications -->
      <div v-if="toast.visible" class="toast" :class="toast.type">
        <p>{{ toast.message }}</p>
        <button @click="closeToast" class="toast-close">×</button>
      </div>
    </main>
  </div>
</template>

<script>
import axios from 'axios'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

export default {
  data() {
    return {
      files: [],
      filesLoading: false,
      downloading: false,
      downloadingFile: null,
      showUploadDialog: false,
      selectedFiles: [],
      fileConfigs: [],
      uploading: false,
      uploadResponse: null,
      uploadResults: [],
      uploadProgress: {},
      companyMetadata: [],
      folderOptions: [
        { label: 'MVR', value: 'MVR' },
        { label: 'Deduction & Services', value: 'Deduction & Services' },
        { label: 'Company Statements', value: 'Company Statements' },
      ],
      searchQuery: '',
      rootFolder: '/output_files',
      currentPath: '/output_files',
      selectedItem: null,
      errorFiles: null, // now defined so template can access it
      toast: { visible: false, type: '', message: '' },
      persistedFiles: JSON.parse(localStorage.getItem('persistedFiles')) || [],
    }
  },
  computed: {
    allConfigsValid() {
      return this.fileConfigs.every((fc) => {
        if (fc.invalidFormat || !fc.folder) return false
        if (fc.folder === 'Deduction & Services') return true
        if (fc.folder === 'MVR' || fc.folder === 'Company Statements') return !!fc.company
        return false
      })
    },
    filteredItems() {
      if (!this.searchQuery) {
        return this.files.filter((f) => f.folder === this.currentPath)
      }
      const query = this.searchQuery.toLowerCase()
      return this.files.filter(
        (f) =>
          f.folder === this.currentPath &&
          (f.name.toLowerCase().includes(query) ||
            (f.type === 'folder' && f.name.toLowerCase().includes(query))),
      )
    },
  },
  methods: {
    async fetchFiles() {
      if (
        this.persistedFiles.length &&
        this.persistedFiles.some((f) => f.folder.startsWith(this.rootFolder))
      ) {
        this.files = this.persistedFiles
        this.filesLoading = false
        return
      }
      this.filesLoading = true
      try {
        const resp = await axios.get(
          `https://dev.rocox.co/api/fetch_files?folder=${this.rootFolder.split('/')[1]}&code=${process.env.VUE_APP_FUNCTION_KEY}`,
        )
        const paths = this.processPaths(resp.data, this.rootFolder)
        this.files = paths
        this.persistFiles(this.files)
        if (!this.files.length) {
          this.showToast(
            'info',
            `No folders or files found in ${this.rootFolder.split('/').pop()}.`,
          )
        }
      } catch (err) {
        console.error('Failed to fetch ADLS files:', err)
        this.showToast('error', `Failed to load ${this.rootFolder.split('/').pop()}.`)
        this.files = []
      } finally {
        this.filesLoading = false
      }
    },
    processPaths(paths, root) {
      const result = []
      const folderMap = new Map()
      paths.forEach((path) => {
        const parts = path
          .split('/')
          .filter((p) => p && p !== 'caley-operations-dev' && p !== root.split('/')[1])
        let currentPath = root
        let currentFolder = root
        parts.forEach((part, index) => {
          currentPath += `/${part}`
          if (index === parts.length - 1 && !path.endsWith('/') && /\.\w+$/.test(part)) {
            result.push({
              path: currentPath,
              name: part,
              type: 'file',
              folder: currentFolder,
            })
          } else {
            if (!folderMap.has(currentPath)) {
              result.push({
                path: currentPath,
                name: part,
                type: 'folder',
                folder: currentFolder,
              })
              folderMap.set(currentPath, part)
            }
            currentFolder = currentPath
          }
        })
      })
      return result.sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name))
    },
    itemIcon(item) {
      if (item.type === 'folder') return 'pi pi-folder'
      if (item.name.endsWith('.pdf')) return 'pi pi-file-pdf'
      if (item.name.endsWith('.json')) return 'pi pi-file'
      if (item.name.endsWith('.csv')) return 'pi pi-table'
      if (item.name.endsWith('.xls') || item.name.endsWith('.xlsx') || item.name.endsWith('.xlsm'))
        return 'pi pi-file-excel'
      return 'pi pi-file'
    },
    async downloadFile(file) {
      this.downloading = true
      this.downloadingFile = file.path
      try {
        const response = await axios.get(
          `https://dev.rocox.co/api/download_file?filePath=${encodeURIComponent(file.path)}&code=${process.env.VUE_APP_FUNCTION_KEY}`,
          {
            responseType: 'blob',
          },
        )
        if (!response.data || response.data.size === 0) {
          throw new Error('Empty file received from server')
        }
        const contentType = response.headers['content-type'] || 'application/octet-stream'
        const blob = new Blob([response.data], { type: contentType })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', file.name)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        this.showToast('success', `${file.name} downloaded successfully.`)
      } catch (err) {
        console.error('Failed to download file:', err)
        this.showToast('error', `Failed to download ${file.name}.`)
      } finally {
        this.downloading = false
        this.downloadingFile = null
      }
    },
    navigate(item) {
      if (item.type === 'folder') {
        this.currentPath = item.path
        this.selectedItem = null
      } else if (item.type === 'file') {
        this.selectedItem = item === this.selectedItem ? null : item
      }
    },
    goBack() {
      if (this.currentPath === this.rootFolder) return
      const parent = this.currentPath.substring(0, this.currentPath.lastIndexOf('/'))
      this.currentPath = parent || this.rootFolder
      this.selectedItem = null
    },
    changeRootFolder() {
      this.currentPath = this.rootFolder
      this.fetchFiles()
    },
    truncateName(name) {
      return name.length > 20 ? name.substring(0, 20) + '...' : name
    },
    async handleFileSelect(event) {
      const files = event.target.files
      if (!this.companyMetadata.length) {
        await this.fetchCompanyMetadata()
      }
      this.selectedFiles = Array.from(files)
      this.fileConfigs = this.selectedFiles.map((file) => {
        const ext = file.name.split('.').pop().toLowerCase()
        const validExts = ['csv', 'xls', 'xlsx', 'xlsm']
        return {
          file,
          fullPath: file.name,
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
          carrierNameMessage: '',
          carrierNameIsMatch: false,
        }
      })
      this.showToast('info', `${this.selectedFiles.length} file(s) ready to configure.`)
    },
    async fetchCompanyMetadata() {
      try {
        const resp = await axios.get(
          `https://dev.rocox.co/api/get_file_content?path=/caley-operations-dev/Static%20Files/company_metadata.json&code=${process.env.VUE_APP_FUNCTION_KEY}`,
        )
        this.companyMetadata = resp.data
      } catch (err) {
        console.error('Failed to fetch metadata:', err)
        this.showToast('error', 'Failed to load company metadata.')
      }
    },
    onAutoManualToggle(index) {
      const fc = this.fileConfigs[index]
      this.resetValidation(fc)
    },
    async onManualRowChange(index) {
      const fc = this.fileConfigs[index]
      this.resetValidation(fc)
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
    onFolderChange(index) {
      const fc = this.fileConfigs[index]
      if (!fc.folder) return
      fc.company = ''
      this.resetFileConfig(fc)
      fc.filteredCompanies = this.getFilteredCompanies(fc.folder)
    },
    async handleCompanyChange(index) {
      const fc = this.fileConfigs[index]
      if (!fc.folder || !fc.company || fc.invalidFormat) return
      this.resetValidation(fc)
      await this.parseAndValidate(fc, 50)
      if (
        (fc.folder === 'Company Statements' || fc.folder === 'MVR') &&
        fc.fieldsValid &&
        fc.grossCommSum !== undefined
      ) {
        fc.fileProcessProgress = 50
        await this.checkDb(fc, 100)
      } else {
        fc.fileProcessProgress = 100
      }
    },
    resetFileConfig(fc) {
      fc.company = ''
      fc.missingFields = []
      fc.fieldsValid = false
      fc.grossCommSum = undefined
      fc.dbCheckDone = false
      fc.matchExists = false
      fc.fileProcessProgress = 0
      fc._headers = []
      fc._dataRows = []
      fc.carrierNameMessage = ''
      fc.carrierNameIsMatch = false
    },
    resetValidation(fc) {
      fc.missingFields = []
      fc.fieldsValid = false
      fc.grossCommSum = undefined
      fc.dbCheckDone = false
      fc.matchExists = false
      fc.fileProcessProgress = 0
      fc._headers = []
      fc._dataRows = []
      fc.carrierNameMessage = ''
      fc.carrierNameIsMatch = false
    },
    getFilteredCompanies(folder) {
      if (folder === 'MVR') {
        return this.companyMetadata.filter(
          (c) => c.mvr_fields && Object.values(c.mvr_fields).some((val) => val),
        )
      } else if (folder === 'Company Statements') {
        return this.companyMetadata.filter((c) => c.statement_fields)
      } else if (folder === 'Deduction & Services') {
        return []
      }
      return []
    },
    async parseAndValidate(fc, halfPoint) {
      fc.missingFields = []
      fc.fieldsValid = false
      fc.grossCommSum = undefined
      fc.dbCheckDone = false
      fc.matchExists = false
      fc._headers = []
      fc._dataRows = []
      fc.carrierNameMessage = ''
      fc.carrierNameIsMatch = false

      let meta = this.companyMetadata.find(
        (c) => c.full_company_name === fc.company && this.getMetadataFields(fc.folder, c),
      )
      if (!meta) {
        fc.missingFields.push('No metadata found for this selection')
        return
      }

      await this.parseFile(fc, halfPoint)
      if (!fc._headers.length) {
        fc.missingFields.push('No header row found')
        return
      }

      let fieldDict = this.getMetadataFields(fc.folder, meta)
      if (!fieldDict) {
        fc.missingFields.push('No fields defined in metadata')
        return
      }

      if (fc.folder === 'Company Statements' || fc.folder === 'MVR') {
        const carrierNameKey = 'Carrier Name'
        const matchedHeader = fc._headers.find(
          (h) => h.toLowerCase() === carrierNameKey.toLowerCase(),
        )
        if (matchedHeader && fc._dataRows.length > 0) {
          const firstVal = String(fc._dataRows[0][matchedHeader] || '')
            .trim()
            .toLowerCase()
          const selectedCo = fc.company.toLowerCase()
          const aliasMap = {
            ambetter: 'ambetter',
            'uhc aca': 'united healthcare',
            cigna: 'cigna hlth grp',
            'molina marketplace': 'molina hlthcare of fl inc',
            aetna: 'aetna override',
            'oscar healthcare': 'oscar override',
          }
          const expanded = aliasMap[firstVal] || firstVal
          fc.carrierNameIsMatch = expanded.includes(selectedCo) || selectedCo.includes(expanded)
          fc.carrierNameMessage = fc.carrierNameIsMatch
            ? `✅ "Carrier Name" ("${firstVal}") matches "${fc.company}".`
            : `⚠️ "Carrier Name" ("${firstVal}") does NOT match "${fc.company}".`
        }
      }

      const neededFields = [...new Set(Object.values(fieldDict))]
      const fieldMap = Object.fromEntries(neededFields.map((f) => [f, []]))
      for (const [csvField, internalField] of Object.entries(fieldDict)) {
        if (fieldMap[internalField]) fieldMap[internalField].push(csvField)
      }

      fc.missingFields = Object.entries(fieldMap)
        .filter(
          ([_, possibleCsvHeaders]) => !possibleCsvHeaders.some((hdr) => fc._headers.includes(hdr)),
        )
        .map(([internalField]) => `"${internalField}"`)
      fc.fieldsValid = fc.missingFields.length === 0

      if (fc.fieldsValid && (fc.folder === 'Company Statements' || fc.folder === 'MVR')) {
        const possibleGross = fieldMap['gross_comission'] || []
        const matchedGrossHdr = possibleGross.find((h) => fc._headers.includes(h))
        if (!matchedGrossHdr) {
          fc.missingFields.push('"gross_comission" field')
          fc.fieldsValid = false
        } else {
          fc.grossCommSum = fc._dataRows.reduce((sum, row) => {
            let val = row[matchedGrossHdr]
            if (val) {
              val = String(val).trim()
              const isNegative = val.startsWith('(') && val.endsWith(')')
              val = isNegative ? val.slice(1, -1) : val
              val = val.replace(/[^0-9.\-]+/g, '')
              let num = parseFloat(val) || 0
              if (isNegative) num = -num
              return sum + num
            }
            return sum
          }, 0)
        }
      }
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
          const resp = await axios.post(
            `https://dev.rocox.co/api/query_db?code=${process.env.VUE_APP_FUNCTION_KEY}`,
            { query: queryStr },
          )
          const [row] = resp.data || []
          const moSum = parseFloat(parseFloat(row?.sum_gross || 0).toFixed(2))
          if (moSum === sum2d) {
            found = true
            break
          }
        }
        fc.matchExists = found
      } catch (err) {
        console.error('DB check error:', err)
      }
      fc.dbCheckDone = true
      fc.fileProcessProgress = endPoint
    },
    async parseFile(fc, halfPoint) {
      fc._headers = []
      fc._dataRows = []
      fc.fileProcessProgress = 0
      const file = fc.file
      const ext = file.name.split('.').pop().toLowerCase()
      if (ext === 'csv') {
        await this.parseCSV(fc, file, halfPoint)
      } else if (['xls', 'xlsx', 'xlsm'].includes(ext)) {
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
      const dataRows = rawRows
        .filter((_, i) => i !== headerIndex)
        .map((row) =>
          Object.fromEntries(row.map((val, idx) => [headers[idx] || `Unknown_${idx}`, val])),
        )
      fc._headers = headers
      fc._dataRows = dataRows
    },
    buildRowsFromXLSIndex(fc, raw, headerIndex) {
      const headers = raw[headerIndex].map((h) => (h || '').toString().trim())
      const dataRows = raw
        .filter((_, i) => i !== headerIndex)
        .map((row) =>
          Object.fromEntries(row.map((val, idx) => [headers[idx] || `Unknown_${idx}`, val])),
        )
      fc._headers = headers
      fc._dataRows = dataRows
    },
    async uploadFiles() {
      this.uploading = true
      this.uploadResponse = null
      this.uploadResults = []
      for (const fc of this.fileConfigs) {
        if (fc.invalidFormat) {
          this.uploadResults.push({
            fileName: fc.file.name,
            status: 'failed',
            message: 'Invalid format, not uploaded.',
          })
          continue
        }
        if (
          !fc.folder ||
          ((fc.folder === 'MVR' || fc.folder === 'Company Statements') && !fc.company)
        ) {
          this.uploadResults.push({
            fileName: fc.file.name,
            status: 'failed',
            message: 'Folder and Company (if applicable) are required.',
          })
          continue
        }
        const formData = new FormData()
        formData.append('file', fc.file)
        formData.append('folder', fc.folder)
        formData.append('company', fc.company)
        try {
          await axios.post(
            `https://dev.rocox.co/api/upload_files?code=${process.env.VUE_APP_FUNCTION_KEY}`,
            formData,
            {
              headers: { 'Content-Type': 'multipart/form-data' },
              onUploadProgress: (pe) => {
                const pc = Math.round((pe.loaded * 100) / pe.total)
                this.uploadProgress[fc.file.name] = pc
              },
            },
          )
          this.uploadResults.push({
            fileName: fc.file.name,
            status: 'success',
            message: 'Uploaded successfully',
          })
          this.showToast('success', `${fc.file.name} uploaded successfully.`)
          await this.fetchFiles()
        } catch (error) {
          console.error(`Error uploading file '${fc.file.name}':`, error.message)
          this.showToast('error', `Upload failed: ${error.message || 'Unknown error'}`)
          this.uploadResults.push({
            fileName: fc.file.name,
            status: 'failed',
            message: `Upload failed: ${error.message || 'Unknown error'}`,
          })
        }
      }
      this.uploadResponse = 'File upload process completed.'
      this.uploading = false
      this.showUploadDialog = false
      this.selectedFiles = []
      this.fileConfigs = []
    },
    clearFiles() {
      this.selectedFiles = []
      this.fileConfigs = []
      this.showToast('info', 'Selected files cleared.')
    },
    removeFile(index) {
      this.selectedFiles.splice(index, 1)
      this.fileConfigs.splice(index, 1)
      this.showToast('info', 'File removed from selection.')
    },
    cancelUpload() {
      this.showUploadDialog = false
      this.selectedFiles = []
      this.fileConfigs = []
      this.showToast('info', 'Upload cancelled.')
    },
    showToast(type, message) {
      this.toast = { visible: true, type, message }
      setTimeout(() => {
        this.closeToast()
      }, 3000)
    },
    closeToast() {
      this.toast.visible = false
    },
    persistFiles(files) {
      this.persistedFiles = files
      localStorage.setItem('persistedFiles', JSON.stringify(files))
    },
    clearPersistedFiles() {
      this.persistedFiles = []
      this.files = []
      localStorage.removeItem('persistedFiles')
      this.showToast('info', 'File state cleared.')
    },
    getMetadataFields(folder, meta) {
      switch (folder) {
        case 'MVR':
          return meta.mvr_fields
        case 'Company Statements':
          return meta.statement_fields
        case 'Deduction & Services':
          return null
        default:
          return null
      }
    },
  },
  beforeMount() {
    if (
      this.persistedFiles.length &&
      this.persistedFiles.some((f) => f.folder.startsWith(this.rootFolder))
    ) {
      this.files = this.persistedFiles
    } else {
      this.fetchFiles()
    }
  },
  beforeUnmount() {
    this.persistFiles(this.files)
  },
}
</script>


<style scoped>
.file-management {
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

/* Main Content */
.content {
  max-width: 1200px;
  margin: 0 auto;
}

/* Controls */
.controls {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.folder-select {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  font-size: 0.9rem;
  background: #fff;
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.folder-select:focus {
  border-color: #4299e1;
  outline: none;
}

.folder-select:disabled {
  background: #edf2f7;
  color: #a0aec0;
  cursor: not-allowed;
}

.search-input {
  flex: 1;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  font-size: 0.9rem;
  transition: border-color 0.2s ease;
}

.search-input:focus {
  border-color: #4299e1;
  outline: none;
}

.search-input:disabled {
  background: #edf2f7;
  color: #a0aec0;
  cursor: not-allowed;
}

.back-btn {
  background: #4299e1;
  color: white;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: background 0.2s ease;
}

.back-btn:hover:not(:disabled) {
  background: #3182ce;
}

.back-btn:disabled {
  background: #a0aec0;
  cursor: not-allowed;
}

/* File Table */
.file-table {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.file-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.file-card {
  display: flex;
  align-items: center;
  background: #f9fafb;
  border-radius: 8px;
  padding: 1rem;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.file-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.file-card.selected {
  background: #e6f0ff;
}

.file-icon {
  font-size: 1.25rem;
  margin-right: 1rem;
  color: #718096;
}

.file-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.file-name {
  font-size: 0.95rem;
  font-weight: 500;
  color: #2d3748;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-type {
  font-size: 0.85rem;
  color: #718096;
}

.download-btn {
  background: #48bb78;
  color: white;
  padding: 0.5rem;
  border-radius: 6px;
  transition: background 0.2s ease;
}

.download-btn:hover:not(:disabled) {
  background: #38a169;
}

.download-btn:disabled {
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

.no-data {
  color: #718096;
  font-size: 0.9rem;
  text-align: center;
  padding: 2rem 0;
}

/* Upload Button (Below Table) */
.upload-btn {
  background: #4299e1;
  color: white;
  padding: 0.75rem 2rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  max-width: 300px;
  margin: 0 auto;
  transition: background 0.2s ease;
}

.upload-btn:hover:not(:disabled) {
  background: #3182ce;
}

.upload-btn:disabled {
  background: #a0aec0;
  cursor: not-allowed;
}

/* Upload Dialog */
.upload-dialog {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: none;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.upload-dialog.open {
  display: flex;
}

.dialog-content {
  background: #ffffff;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
}

.dialog-content h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 1.5rem;
}

.close-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #718096;
  cursor: pointer;
  transition: color 0.2s ease;
}

.close-btn:hover:not(:disabled) {
  color: #2d3748;
}

.close-btn:disabled {
  color: #a0aec0;
  cursor: not-allowed;
}

.upload-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.file-upload-label {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #4299e1;
  color: white;
  padding: 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.2s ease;
}

.file-upload-label:hover {
  background: #3182ce;
}

.file-input {
  display: none;
}

.selected-files {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.9rem;
  color: #2d3748;
}

.clear-btn {
  background: #e53e3e;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  transition: background 0.2s ease;
}

.clear-btn:hover:not(:disabled) {
  background: #c53030;
}

.clear-btn:disabled {
  background: #a0aec0;
  cursor: not-allowed;
}

.file-configs {
  margin-top: 1.5rem;
}

.file-configs h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 1rem;
}

.file-config {
  background: #f9fafb;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  border: 1px solid #e2e8f0;
}

.file-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.file-name {
  font-size: 1rem;
  font-weight: 500;
  color: #2d3748;
  flex: 1;
}

.remove-btn {
  background: #e53e3e;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  font-size: 1rem;
  transition: background 0.2s ease;
}

.remove-btn:hover:not(:disabled) {
  background: #c53030;
}

.remove-btn:disabled {
  background: #a0aec0;
  cursor: not-allowed;
}

.invalid-format .error {
  color: #e53e3e;
  font-size: 0.9rem;
}

.config-fields {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field label {
  font-size: 0.9rem;
  font-weight: 500;
  color: #4a5568;
}

select,
.input-number {
  padding: 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.9rem;
  background: #fff;
  transition: border-color 0.2s ease;
}

select:focus,
.input-number:focus {
  border-color: #4299e1;
  outline: none;
}

select:disabled,
.input-number:disabled {
  background: #edf2f7;
  color: #a0aec0;
  cursor: not-allowed;
}

select.invalid {
  border-color: #e53e3e;
}

.checkbox-label {
  font-size: 0.9rem;
  color: #4a5568;
}

.header-row-input {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.progress-wrapper {
  margin-top: 1rem;
}

.progress-bar {
  height: 8px;
  background: #4299e1;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.85rem;
  color: #718096;
  text-align: center;
  margin-top: 0.25rem;
}

.validation-message {
  margin-top: 1rem;
}

.success {
  color: #38a169;
  font-size: 0.9rem;
}

.warn {
  color: #e53e3e;
  font-size: 0.9rem;
}

.info {
  color: #718096;
  font-size: 0.9rem;
}

.required {
  color: #e53e3e;
}

.submit-section {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 1.5rem;
}

.upload-btn-dialog {
  background: #4299e1;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: background 0.2s ease;
}

.upload-btn-dialog:hover:not(:disabled) {
  background: #3182ce;
}

.upload-btn-dialog:disabled {
  background: #a0aec0;
  cursor: not-allowed;
}

.cancel-btn {
  background: #718096;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  transition: background 0.2s ease;
}

.cancel-btn:hover:not(:disabled) {
  background: #5a6678;
}

.cancel-btn:disabled {
  background: #a0aec0;
  cursor: not-allowed;
}

/* Toast */
.toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  font-size: 0.9rem;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  z-index: 1001;
}

.toast.success {
  background: #38a169;
}

.toast.error {
  background: #e53e3e;
}

.toast.info {
  background: #4299e1;
}

.toast-close {
  background: none;
  border: none;
  color: #fff;
  font-size: 1rem;
  cursor: pointer;
  padding: 0;
  margin-left: 0.5rem;
}

.toast-close:hover {
  color: #edf2f7;
}
</style>
