<template>
  <div class="container">
    <h1>File Management</h1>

    <!-- File Navigation Section -->
    <div class="card">
      <div class="card-header">
        <!-- <h2>Output Files</h2> -->
        <select v-model="rootFolder" class="folder-select" @change="changeRootFolder">
          <option value="/output_files">Output Files</option>
          <option value="/processed_files">Processed Files</option>
        </select>
        <input type="text" placeholder="Search files..." v-model="searchQuery" class="search-input" />
        <button v-if="currentPath !== rootFolder" @click="goBack" class="back-btn">
          <i class="fas fa-arrow-left"></i> Back
        </button>
      </div>

      <!-- Folder and File List (One Level at a Time) -->
      <div class="folder-list" v-if="!filesLoading">
        <div
          v-for="item in filteredItems"
          :key="item.path"
          class="item-card"
          @click="navigate(item)"
          :class="{ 'selected': selectedItem?.path === item.path }"
        >
          <div class="item-icon">
            <i :class="itemIcon(item)" />
          </div>
          <div class="item-details">
            <span class="item-name" :title="item.name">{{ truncateName(item.name) }}</span>
            <span v-if="item.type === 'file'" class="file-type">{{ item.name.split('.').pop() }}</span>
          </div>
          <button
            v-if="item.type === 'file'"
            class="download-btn"
            @click.stop="downloadFile(item)"
            :disabled="downloading && downloadingFile === item.path"
          >
            <i class="fas fa-download" :class="{ 'loading': downloading && downloadingFile === item.path }"></i>
          </button>
        </div>
        <p v-if="!filteredItems.length" class="no-data">
          No folders or files found in {{ currentPath.split('/').pop() || rootFolder.split('/').pop() }}.
        </p>
      </div>
      <div v-if="filesLoading" class="loading">Loading files...</div>
    </div>

    <!-- Upload Button (Bottom Right) -->
    <button
      class="upload-btn"
      @click="showUploadDialog = true"
      :disabled="uploading"
      aria-label="Upload File"
    >
      <i class="fas fa-plus"></i>
    </button>

    <!-- Enhanced Upload Dialog -->
    <div v-if="showUploadDialog" class="upload-dialog" :class="{ 'open': showUploadDialog }">
      <div class="dialog-content">
        <h2>Upload Files</h2>
        <button class="close-btn" @click="cancelUpload" :disabled="uploading">×</button>

        <div class="upload-section">
          <label for="file-input" class="file-upload-label">
            <i class="fas fa-cloud-upload-alt"></i>
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
            <p><strong>Selected Files:</strong> {{ selectedFiles.map(f => f.name).join(', ') }}</p>
            <button @click="clearFiles" class="clear-btn" :disabled="uploading">Clear</button>
          </div>

          <div v-if="fileConfigs.length" class="file-configs">
            <h3>Configure Files</h3>
            <div v-for="(fc, index) in fileConfigs" :key="index" class="file-config">
              <div class="file-header">
                <span class="file-name">{{ fc.file.name }}</span>
                <button @click="removeFile(index)" class="remove-btn" :disabled="uploading">×</button>
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
                    :class="{ 'invalid': !fc.folder }"
                  >
                    <option value="" disabled>Select Folder</option>
                    <!-- Allowed folders only -->
                    <option v-for="option in folderOptions" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                  <p v-if="!fc.folder" class="error">Folder is required.</p>
                </div>

                <!-- Company selection shown only for MVR and Company Statements -->
                <div v-if="fc.folder === 'MVR' || fc.folder === 'Company Statements'" class="field">
                  <label :for="'company-' + index">Company <span class="required">*</span></label>
                  <select
                    v-model="fc.company"
                    :id="'company-' + index"
                    @change="handleCompanyChange(index)"
                    :class="{ 'invalid': fc.folder && !fc.company }"
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
                    <input type="checkbox" v-model="fc.autoSelect" @change="onAutoManualToggle(index)" />
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
                    />
                  </div>
                </div>

                <div v-if="fc.fileProcessProgress > 0 && fc.fileProcessProgress < 100" class="progress-wrapper">
                  <div class="progress-bar" :style="{ width: `${fc.fileProcessProgress}%` }"></div>
                  <p class="progress-text">{{ fc.fileProcessProgress }}% Processing...</p>
                </div>

                <div v-if="fc.missingFields.length" class="validation-message">
                  <p class="warn"><strong>Missing Fields:</strong> {{ fc.missingFields.join(', ') }}</p>
                </div>
                <div v-else-if="fc.fieldsValid" class="validation-message">
                  <p class="success">All required fields match.</p>
                </div>

                <div v-if="fc.carrierNameMessage" class="validation-message">
                  <p :class="fc.carrierNameIsMatch ? 'success' : 'warn'">{{ fc.carrierNameMessage }}</p>
                </div>

                <div v-if="fc.dbCheckDone && fc.matchExists" class="validation-message">
                  <p class="warn">The total gross commission matches a month in the last 3 months!</p>
                </div>
                <div v-else-if="fc.dbCheckDone && !fc.matchExists" class="validation-message">
                  <p class="success">No matches found in the last 3 months. You're good to go!</p>
                </div>
              </div>
            </div>
          </div>

          <div class="submit-section">
            <button
              :disabled="!selectedFiles.length || uploading || !allConfigsValid"
              @click="uploadFiles"
              class="upload-btn-dialog"
            >
              {{ uploading ? 'Uploading...' : 'Upload Files' }}
              <i class="fas fa-upload"></i>
            </button>
            <button @click="cancelUpload" class="cancel-btn" :disabled="uploading">Cancel</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Toast Notifications -->
    <div v-if="toast.visible" class="toast" :class="toast.type">
      <p>{{ toast.message }}</p>
      <button @click="closeToast" class="toast-close">×</button>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

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
      // Allowed folders: MVR, Deduction & Services, Company Statements
      folderOptions: [
        { label: 'MVR', value: 'MVR' },
        { label: 'Deduction & Services', value: 'Deduction & Services' },
        { label: 'Company Statements', value: 'Company Statements' },
      ],
      searchQuery: '',
      rootFolder: '/output_files',
      currentPath: '/output_files',
      selectedItem: null,
      toast: { visible: false, type: '', message: '' },
      persistedFiles: JSON.parse(localStorage.getItem('persistedFiles')) || [],
    }
  },
  computed: {
    allConfigsValid() {
      return this.fileConfigs.every(fc => {
        if (fc.invalidFormat || !fc.folder) return false;
        // For Deduction & Services, no company is required.
        if (fc.folder === 'Deduction & Services') return true;
        // For MVR and Company Statements, company must be selected.
        if (fc.folder === 'MVR' || fc.folder === 'Company Statements') return !!fc.company;
        return false;
      })
    },
    filteredItems() {
      if (!this.searchQuery) {
        return this.files.filter(f => f.folder === this.currentPath)
      }
      const query = this.searchQuery.toLowerCase();
      return this.files.filter(f =>
        f.folder === this.currentPath &&
        (f.name.toLowerCase().includes(query) || (f.type === 'folder' && f.name.toLowerCase().includes(query)))
      )
    },
  },
  methods: {
    async fetchFiles() {
      if (this.persistedFiles.length && this.persistedFiles.some(f => f.folder.startsWith(this.rootFolder))) {
        this.files = this.persistedFiles;
        this.filesLoading = false;
        return;
      }
      this.filesLoading = true;
      try {
        const resp = await axios.get(`https://dev.rocox.co/api/fetch_files?folder=${this.rootFolder.split('/')[1]}`);
        // console.log('API Response:', resp.data);
        const paths = this.processPaths(resp.data, this.rootFolder);
        this.files = paths;
        this.persistFiles(this.files);
        if (!this.files.length) {
          console.warn('No files or folders retrieved.');
          this.showToast('info', `No folders or files found in ${this.rootFolder.split('/').pop()}.`);
        }
      } catch (err) {
        console.error('Failed to fetch ADLS files:', err);
        this.showToast('error', `Failed to load ${this.rootFolder.split('/').pop()}. Check network or server status.`);
        this.files = [];
      } finally {
        this.filesLoading = false;
      }
    },
    processPaths(paths, root) {
      const result = [];
      const folderMap = new Map();
      paths.forEach(path => {
        const parts = path.split('/').filter(p => p && p !== 'caley-operations-dev' && p !== root.split('/')[1]);
        let currentPath = root;
        let currentFolder = root;
        parts.forEach((part, index) => {
          currentPath += `/${part}`;
          if (index === parts.length - 1 && !path.endsWith('/') && /\.\w+$/.test(part)) {
            result.push({
              path: currentPath,
              name: part,
              type: 'file',
              folder: currentFolder,
            });
          } else {
            if (!folderMap.has(currentPath)) {
              result.push({
                path: currentPath,
                name: part,
                type: 'folder',
                folder: currentFolder,
              });
              folderMap.set(currentPath, part);
            }
            currentFolder = currentPath;
          }
        });
      });
      return result.sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));
    },
    itemIcon(item) {
      if (item.type === 'folder') return 'fas fa-folder';
      if (item.name.endsWith('.pdf')) return 'fas fa-file-pdf';
      if (item.name.endsWith('.json')) return 'fas fa-file';
      if (item.name.endsWith('.csv')) return 'fas fa-table';
      if (item.name.endsWith('.xls') || item.name.endsWith('.xlsx') || item.name.endsWith('.xlsm')) return 'fas fa-file-excel';
      return 'fas fa-file';
    },
    async downloadFile(file) {
      this.downloading = true;
      this.downloadingFile = file.path;
      try {
        // Convert full file path (e.g. "/output_files/MVR/fileName.csv")
        // to a relative path for the download endpoint (e.g. "MVR/fileName.csv")
        // const relativePath = file.path.replace(/^\/output_files\//, '');
        // Call the new download endpoint passing the relative path as query parameter filePath
        // console.log(relativePath)
        const response = await axios.get(`https://dev.rocox.co/api/download_file?filePath=${encodeURIComponent(file.path)}`, {
          responseType: 'blob',
          headers: {
            // Optionally include auth header if your endpoint requires it
            // 'Authorization': `Bearer ${this.userStore.token}`
          }
        });
        if (!response.data || response.data.size === 0) {
          throw new Error('Empty file received from server');
        }
        // Use the content type from the response headers
        const contentType = response.headers['content-type'] || 'application/octet-stream';
        const blob = new Blob([response.data], { type: contentType });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        // Use the file name from the original file info
        const fileName = file.name;
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        this.showToast('success', `${fileName} downloaded successfully.`);
      } catch (err) {
        console.error('Failed to download file:', err);
        this.showToast('error', `Failed to download ${file.name}: ${err.message}`);
      } finally {
        this.downloading = false;
        this.downloadingFile = null;
      }
    },
    getMimeType(filename) {
      const extension = filename.split('.').pop().toLowerCase();
      const mimeTypes = {
        pdf: 'application/pdf',
        csv: 'text/csv',
        xls: 'application/vnd.ms-excel',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        xlsm: 'application/vnd.ms-excel.sheet.macroEnabled.12',
        json: 'application/json',
      };
      return mimeTypes[extension];
    },
    navigate(item) {
      if (item.type === 'folder') {
        this.currentPath = item.path;
        this.selectedItem = null;
      } else if (item.type === 'file') {
        this.selectedItem = item === this.selectedItem ? null : item;
      }
    },
    goBack() {
      if (this.currentPath === this.rootFolder) return;
      const parent = this.currentPath.substring(0, this.currentPath.lastIndexOf('/'));
      this.currentPath = parent || this.rootFolder;
      this.selectedItem = null;
    },
    changeRootFolder() {
      this.currentPath = this.rootFolder;
      this.fetchFiles();
    },
    truncateName(name) {
      return name.length > 20 ? name.substring(0, 20) + '...' : name;
    },
    async handleFileSelect(event) {
      const files = event.target.files;
      console.log('Selected Files:', files);
      if (!this.companyMetadata.length) {
        await this.fetchCompanyMetadata();
      }
      this.selectedFiles = Array.from(files);
      this.fileConfigs = this.selectedFiles.map(file => {
        const ext = file.name.split('.').pop().toLowerCase();
        const validExts = ['csv', 'xls', 'xlsx', 'xlsm'];
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
        };
      });
      this.showToast('info', `${this.selectedFiles.length} file(s) ready to configure.`);
    },
    async fetchCompanyMetadata() {
      try {
        const resp = await axios.get('https://dev.rocox.co/api/get_file_content?path=/caley-operations-dev/Static Files/company_metadata.json');
        this.companyMetadata = resp.data;
      } catch (err) {
        console.error('Failed to fetch metadata:', err);
        this.showToast('error', 'Failed to load company metadata.');
      }
    },
    onAutoManualToggle(index) {
      const fc = this.fileConfigs[index];
      this.resetValidation(fc);
    },
    async onManualRowChange(index) {
      const fc = this.fileConfigs[index];
      this.resetValidation(fc);
      if (fc.folder && fc.company && !fc.invalidFormat) {
        await this.parseAndValidate(fc, 50);
        if (fc.fieldsValid && fc.grossCommSum !== undefined) {
          fc.fileProcessProgress = 50;
          await this.checkDb(fc, 100);
        } else {
          fc.fileProcessProgress = 100;
        }
      }
    },
    onFolderChange(index) {
      const fc = this.fileConfigs[index];
      if (!fc.folder) return;
      fc.company = '';
      this.resetFileConfig(fc);
      fc.filteredCompanies = this.getFilteredCompanies(fc.folder);
    },
    async handleCompanyChange(index) {
      const fc = this.fileConfigs[index];
      if (!fc.folder || !fc.company || fc.invalidFormat) return;
      this.resetValidation(fc);
      await this.parseAndValidate(fc, 50);
      if ((fc.folder === 'Company Statements' || fc.folder === 'MVR') && fc.fieldsValid && fc.grossCommSum !== undefined) {
        fc.fileProcessProgress = 50;
        await this.checkDb(fc, 100);
      } else {
        fc.fileProcessProgress = 100;
      }
    },
    resetFileConfig(fc) {
      fc.company = '';
      fc.missingFields = [];
      fc.fieldsValid = false;
      fc.grossCommSum = undefined;
      fc.dbCheckDone = false;
      fc.matchExists = false;
      fc.fileProcessProgress = 0;
      fc._headers = [];
      fc._dataRows = [];
      fc.carrierNameMessage = '';
      fc.carrierNameIsMatch = false;
    },
    resetValidation(fc) {
      fc.missingFields = [];
      fc.fieldsValid = false;
      fc.grossCommSum = undefined;
      fc.dbCheckDone = false;
      fc.matchExists = false;
      fc.fileProcessProgress = 0;
      fc._headers = [];
      fc._dataRows = [];
      fc.carrierNameMessage = '';
      fc.carrierNameIsMatch = false;
    },
    getFilteredCompanies(folder) {
      if (folder === 'MVR') {
        return this.companyMetadata.filter(c => c.mvr_fields && Object.values(c.mvr_fields).some(val => val));
      } else if (folder === 'Company Statements') {
        return this.companyMetadata.filter(c => c.statement_fields);
      } else if (folder === 'Deduction & Services') {
        return [];
      }
      return [];
    },
    async parseAndValidate(fc, halfPoint) {
      fc.missingFields = [];
      fc.fieldsValid = false;
      fc.grossCommSum = undefined;
      fc.dbCheckDone = false;
      fc.matchExists = false;
      fc._headers = [];
      fc._dataRows = [];
      fc.carrierNameMessage = '';
      fc.carrierNameIsMatch = false;

      let meta = this.companyMetadata.find(c => c.full_company_name === fc.company && this.getMetadataFields(fc.folder, c));
      if (!meta) {
        fc.missingFields.push('No metadata found for this selection');
        return;
      }

      await this.parseFile(fc, halfPoint);
      if (!fc._headers.length) {
        fc.missingFields.push('No header row found');
        return;
      }

      let fieldDict = this.getMetadataFields(fc.folder, meta);
      if (!fieldDict) {
        fc.missingFields.push('No fields defined in metadata');
        return;
      }

      if (fc.folder === 'Company Statements' || fc.folder === 'MVR') {
        const carrierNameKey = 'Carrier Name';
        const matchedHeader = fc._headers.find(h => h.toLowerCase() === carrierNameKey.toLowerCase());
        if (matchedHeader && fc._dataRows.length > 0) {
          const firstVal = String(fc._dataRows[0][matchedHeader] || '').trim().toLowerCase();
          const selectedCo = fc.company.toLowerCase();
          const aliasMap = {
            ambetter: 'ambetter',
            'uhc aca': 'united healthcare',
            cigna: 'cigna hlth grp',
            'molina marketplace': 'molina hlthcare of fl inc',
            aetna: 'aetna override',
            'oscar healthcare': 'oscar override',
          };
          const expanded = aliasMap[firstVal] || firstVal;
          fc.carrierNameIsMatch = expanded.includes(selectedCo) || selectedCo.includes(expanded);
          fc.carrierNameMessage = fc.carrierNameIsMatch
            ? `✅ "Carrier Name" ("${firstVal}") matches "${fc.company}".`
            : `⚠️ "Carrier Name" ("${firstVal}") does NOT match "${fc.company}".`;
        }
      }

      const neededFields = [...new Set(Object.values(fieldDict))];
      const fieldMap = Object.fromEntries(neededFields.map(f => [f, []]));
      for (const [csvField, internalField] of Object.entries(fieldDict)) {
        if (fieldMap[internalField]) fieldMap[internalField].push(csvField);
      }

      fc.missingFields = Object.entries(fieldMap)
        .filter(([_, possibleCsvHeaders]) => !possibleCsvHeaders.some(hdr => fc._headers.includes(hdr)))
        .map(([internalField]) => `"${internalField}"`);
      fc.fieldsValid = fc.missingFields.length === 0;

      if (fc.fieldsValid && (fc.folder === 'Company Statements' || fc.folder === 'MVR')) {
        const possibleGross = fieldMap['gross_comission'] || [];
        const matchedGrossHdr = possibleGross.find(h => fc._headers.includes(h));
        if (!matchedGrossHdr) {
          fc.missingFields.push('"gross_comission" field');
          fc.fieldsValid = false;
        } else {
          fc.grossCommSum = fc._dataRows.reduce((sum, row) => {
            let val = row[matchedGrossHdr];
            if (val) {
              val = String(val).trim();
              const isNegative = val.startsWith('(') && val.endsWith(')');
              val = isNegative ? val.slice(1, -1) : val;
              val = val.replace(/[^0-9.\-]+/g, '');
              let num = parseFloat(val) || 0;
              if (isNegative) num = -num;
              return sum + num;
            }
            return sum;
          }, 0);
        }
      }
    },
    getMetadataFields(folder, meta) {
      switch (folder) {
        case 'MVR':
          return meta.mvr_fields;
        case 'Company Statements':
          return meta.statement_fields;
        case 'Deduction & Services':
          return null;
        default:
          return null;
      }
    },
    async checkDb(fc, endPoint) {
      fc.dbCheckDone = false;
      fc.matchExists = false;
      fc.fileProcessProgress = Math.max(fc.fileProcessProgress, 50);
      const now = new Date();
      let found = false;
      const sum2d = parseFloat(fc.grossCommSum.toFixed(2));
      try {
        for (let offset = 0; offset < 3; offset++) {
          const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
          const m = d.getMonth() + 1;
          const y = d.getFullYear();
          const queryStr = `
            SELECT SUM(gross_comission) as sum_gross
            FROM PRD.PremiumReport
            WHERE MONTH(AddedDate) = ${m}
              AND YEAR(AddedDate) = ${y}
              AND carrier = '${fc.company}'
          `;
          const resp = await axios.post('https://dev.rocox.co/api/query_db', { query: queryStr });
          const [row] = resp.data || [];
          const moSum = parseFloat(parseFloat(row?.sum_gross || 0).toFixed(2));
          if (moSum === sum2d) {
            found = true;
            break;
          }
        }
        fc.matchExists = found;
      } catch (err) {
        console.error('DB check error:', err);
      }
      fc.dbCheckDone = true;
      fc.fileProcessProgress = endPoint;
    },
    async parseFile(fc, halfPoint) {
      fc._headers = [];
      fc._dataRows = [];
      fc.fileProcessProgress = 0;
      const file = fc.file;
      const ext = file.name.split('.').pop().toLowerCase();
      if (ext === 'csv') {
        await this.parseCSV(fc, file, halfPoint);
      } else if (['xls', 'xlsx', 'xlsm'].includes(ext)) {
        await this.parseXLS(fc, file, halfPoint);
      } else {
        fc.fileProcessProgress = halfPoint;
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
              fc._headers = [];
              fc._dataRows = [];
              fc.fileProcessProgress = halfPoint;
              resolve();
              return;
            }
            let rawRows = results.data;
            if (fc.autoSelect) {
              let bestIndex = 0;
              let bestScore = 0;
              const maxCheck = Math.min(rawRows.length, 20);
              for (let i = 0; i < maxCheck; i++) {
                const row = rawRows[i];
                const sc = row.filter(c => c && c.toString().trim() !== '').length;
                if (sc > bestScore) {
                  bestScore = sc;
                  bestIndex = i;
                }
              }
              this.buildRowsFromIndex(fc, rawRows, bestIndex);
            } else {
              let userIndex = fc.manualHeaderRow - 1;
              if (userIndex < 0 || userIndex >= rawRows.length) {
                fc._headers = [];
                fc._dataRows = [];
              } else {
                this.buildRowsFromIndex(fc, rawRows, userIndex);
              }
            }
            fc.fileProcessProgress = halfPoint;
            resolve();
          },
          error: (err) => {
            console.error('Papa parse error:', err);
            fc._headers = [];
            fc._dataRows = [];
            fc.fileProcessProgress = halfPoint;
            resolve();
          },
        });
      });
    },
    async parseXLS(fc, file, halfPoint) {
      return new Promise((resolve) => {
        fc.fileProcessProgress = 10;
        const reader = new FileReader();
        reader.onload = (e) => {
          fc.fileProcessProgress = halfPoint - 10;
          const data = new Uint8Array(e.target.result);
          const wb = XLSX.read(data, { type: 'array' });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
          if (!raw.length) {
            fc._headers = [];
            fc._dataRows = [];
            fc.fileProcessProgress = halfPoint;
            resolve();
            return;
          }
          if (fc.autoSelect) {
            let bestIndex = 0;
            let bestScore = 0;
            const maxCheck = Math.min(raw.length, 20);
            for (let i = 0; i < maxCheck; i++) {
              const row = raw[i];
              const sc = row.filter(c => c && c.toString().trim() !== '').length;
              if (sc > bestScore) {
                bestScore = sc;
                bestIndex = i;
              }
            }
            this.buildRowsFromXLSIndex(fc, raw, bestIndex);
          } else {
            let userIndex = fc.manualHeaderRow - 1;
            if (userIndex < 0 || userIndex >= raw.length) {
              fc._headers = [];
              fc._dataRows = [];
            } else {
              this.buildRowsFromXLSIndex(fc, raw, userIndex);
            }
          }
          fc.fileProcessProgress = halfPoint;
          resolve();
        };
        reader.onerror = (err) => {
          console.error('XLS parse error:', err);
          fc._headers = [];
          fc._dataRows = [];
          fc.fileProcessProgress = halfPoint;
          resolve();
        };
        reader.readAsArrayBuffer(file);
      });
    },
    buildRowsFromIndex(fc, rawRows, headerIndex) {
      const headers = rawRows[headerIndex].map(x => (x || '').trim());
      const dataRows = rawRows
        .filter((_, i) => i !== headerIndex)
        .map(row => Object.fromEntries(row.map((val, idx) => [headers[idx] || `Unknown_${idx}`, val])));
      fc._headers = headers;
      fc._dataRows = dataRows;
    },
    buildRowsFromXLSIndex(fc, raw, headerIndex) {
      const headers = raw[headerIndex].map(h => (h || '').toString().trim());
      const dataRows = raw
        .filter((_, i) => i !== headerIndex)
        .map(row => Object.fromEntries(row.map((val, idx) => [headers[idx] || `Unknown_${idx}`, val])));
      fc._headers = headers;
      fc._dataRows = dataRows;
    },
    async uploadFiles() {
      this.uploading = true;
      this.uploadResponse = null;
      this.uploadResults = [];
      for (const fc of this.fileConfigs) {
        if (fc.invalidFormat) {
          this.uploadResults.push({
            fileName: fc.file.name,
            status: 'failed',
            message: 'Invalid format, not uploaded.',
          });
          continue;
        }
        if (!fc.folder || ((fc.folder === 'MVR' || fc.folder === 'Company Statements') && !fc.company)) {
          this.uploadResults.push({
            fileName: fc.file.name,
            status: 'failed',
            message: 'Folder and Company (if applicable) are required.',
          });
          continue;
        }
        const formData = new FormData();
        formData.append('file', fc.file);
        // Send the raw folder value so backend can validate it.
        formData.append('folder', fc.folder);
        formData.append('company', fc.company);
        try {
          await axios.post('https://dev.rocox.co/api/upload_files', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (pe) => {
              const pc = Math.round((pe.loaded * 100) / pe.total);
              this.uploadProgress[fc.file.name] = pc;
            },
          });
          this.uploadResults.push({
            fileName: fc.file.name,
            status: 'success',
            message: 'Uploaded successfully',
          });
          this.showToast('success', `${fc.file.name} uploaded successfully.`);
          await this.fetchFiles();
        } catch (error) {
          console.error(`Error uploading file '${fc.file.name}':`, error.message);
          this.showToast('error', `Upload failed: ${error.message || 'Unknown error'}`);
          this.uploadResults.push({
            fileName: fc.file.name,
            status: 'failed',
            message: `Upload failed: ${error.message || 'Unknown error'}`,
          });
        }
      }
      this.uploadResponse = 'File upload process completed.';
      this.uploading = false;
      this.showUploadDialog = false;
      this.selectedFiles = [];
      this.fileConfigs = [];
    },
    clearFiles() {
      this.selectedFiles = [];
      this.fileConfigs = [];
      this.showToast('info', 'Selected files cleared.');
    },
    removeFile(index) {
      this.selectedFiles.splice(index, 1);
      this.fileConfigs.splice(index, 1);
      this.showToast('info', 'File removed from selection.');
    },
    cancelUpload() {
      this.showUploadDialog = false;
      this.selectedFiles = [];
      this.fileConfigs = [];
      this.showToast('info', 'Upload cancelled.');
    },
    showToast(type, message) {
      this.toast = { visible: true, type, message };
      setTimeout(() => {
        this.closeToast();
      }, 3000);
    },
    closeToast() {
      this.toast.visible = false;
    },
    persistFiles(files) {
      this.persistedFiles = files;
      localStorage.setItem('persistedFiles', JSON.stringify(files));
    },
    clearPersistedFiles() {
      this.persistedFiles = [];
      this.files = [];
      localStorage.removeItem('persistedFiles');
      this.showToast('info', 'File state cleared.');
    },
  },
  beforeMount() {
    if (this.persistedFiles.length && this.persistedFiles.some(f => f.folder.startsWith(this.rootFolder))) {
      this.files = this.persistedFiles;
    } else {
      this.fetchFiles();
    }
  },
  beforeUnmount() {
    this.persistFiles(this.files);
  },
};
</script>

<style scoped>
/* Styles for FileManagement.vue */
.container {
  max-width: 1200px;
  margin: 20px auto;
  padding: 20px;
  font-family: 'Open Sans', Arial, sans-serif;
  position: relative;
  background: #f5f7fa;
}

h1 {
  text-align: center;
  font-size: 28px;
  color: #2c3e50;
  margin-bottom: 20px;
  font-weight: 500;
}

.card {
  background: #ffffff;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

h2 {
  font-size: 20px;
  color: #34495e;
  margin: 0;
}

.folder-select {
  padding: 8px 12px;
  border-radius: 20px;
  border: 1px solid #e0e6ed;
  font-size: 14px;
  margin-right: 10px;
  background: #fff;
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.folder-select:focus {
  border-color: #3498db;
  outline: none;
}

.search-input {
  width: 300px;
  padding: 8px 12px;
  border-radius: 20px;
  border: 1px solid #e0e6ed;
  font-size: 14px;
}

.back-btn {
  background: #3498db;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  margin-left: 10px;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: background 0.2s ease;
}

.back-btn:hover:not(:disabled) {
  background: #2980b9;
}

.back-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.folder-list {
  max-height: calc(100vh - 200px);
  overflow-y: auto;
  padding: 10px 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 15px;
}

.item-card {
  display: flex;
  align-items: center;
  padding: 12px 15px;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  min-height: 60px;
}

.item-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.item-card.selected {
  background: #e6f0ff;
  border-color: #3498db;
}

.item-icon {
  font-size: 24px;
  margin-right: 15px;
  color: #7f8c8d;
  min-width: 24px;
}

.item-details {
  flex: 1;
  color: #34495e;
  overflow: hidden;
}

.item-name {
  font-size: 14px;
  font-weight: 500;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-type {
  font-size: 12px;
  color: #7f8c8d;
  display: block;
}

.download-btn {
  background: #3498db;
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  margin-left: 10px;
  transition: background 0.2s ease;
}

.download-btn:hover:not(:disabled) {
  background: #2980b9;
}

.download-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.download-btn.loading::before {
  content: '';
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid #fff;
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading {
  text-align: center;
  font-size: 16px;
  color: #7f8c8d;
  margin-top: 20px;
}

.no-data {
  text-align: center;
  font-size: 16px;
  color: #7f8c8d;
  margin-top: 20px;
}

.upload-btn {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 50px;
  height: 50px;
  background: #3498db;
  color: #fff;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: background 0.2s ease;
}

.upload-btn:hover:not(:disabled) {
  background: #2980b9;
}

.upload-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.upload-dialog {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.1);
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
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
}

.dialog-content h2 {
  font-size: 20px;
  color: #34495e;
  margin-bottom: 15px;
}

.close-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  font-size: 24px;
  color: #7f8c8d;
  cursor: pointer;
  transition: color 0.2s ease;
}

.close-btn:hover:not(:disabled) {
  color: #34495e;
}

.close-btn:disabled {
  color: #ccc;
  cursor: not-allowed;
}

.upload-section {
  margin-bottom: 20px;
}

.file-upload-label {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #3498db;
  color: #fff;
  padding: 15px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s ease;
}

.file-upload-label:hover {
  background: #2980b9;
}

.file-input {
  display: none;
}

.selected-files {
  display: flex;
  align-items: center;
  margin-top: 10px;
  font-size: 14px;
  color: #34495e;
}

.clear-btn {
  background: #dc3545;
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 5px 10px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s ease;
}

.clear-btn:hover:not(:disabled) {
  background: #c82333;
}

.clear-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.file-configs {
  margin-top: 20px;
}

.file-config {
  margin-bottom: 15px;
  padding: 15px;
  background: #f9f9f9;
  border-radius: 8px;
  border: 1px solid #e0e6ed;
}

.file-header {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.file-name {
  font-size: 16px;
  font-weight: 500;
  color: #34495e;
  flex: 1;
}

.remove-btn {
  background: #dc3545;
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  font-size: 16px;
  transition: background 0.2s ease;
}

.remove-btn:hover:not(:disabled) {
  background: #c82333;
}

.remove-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.invalid-format {
  margin-bottom: 15px;
}

.error {
  color: #dc3545;
  font-size: 14px;
  margin-top: 5px;
}

.info {
  color: #7f8c8d;
  font-size: 14px;
  margin-top: 5px;
}

.config-fields {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field label {
  font-size: 14px;
  color: #34495e;
}

select {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #e0e6ed;
  font-size: 14px;
  width: 100%;
  transition: border-color 0.2s ease;
}

select.invalid {
  border-color: #dc3545;
}

input[type="checkbox"] {
  margin-right: 8px;
  cursor: pointer;
}

.checkbox-label {
  font-size: 14px;
  color: #34495e;
}

.header-row-input {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.input-number {
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid #e0e6ed;
  font-size: 14px;
  width: 60px;
}

.progress-wrapper {
  margin-top: 15px;
}

.progress-bar {
  height: 8px;
  background: #3498db;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  color: #7f8c8d;
  text-align: center;
  margin-top: 5px;
}

.validation-message {
  margin-top: 15px;
}

.success {
  color: #28a745;
  font-size: 14px;
}

.warn {
  color: #dc3545;
  font-size: 14px;
}

.required {
  color: #dc3545;
  font-weight: bold;
}

.submit-section {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 20px;
}

.upload-btn-dialog {
  background: #3498db;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: background 0.2s ease;
}

.upload-btn-dialog:hover:not(:disabled) {
  background: #2980b9;
}

.upload-btn-dialog:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.cancel-btn {
  background: #7f8c8d;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s ease;
}

.cancel-btn:hover:not(:disabled) {
  background: #6c757d;
}

.cancel-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.upload-response {
  font-size: 14px;
  color: #555;
  margin-top: 10px;
  text-align: center;
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

.toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  font-size: 14px;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 1001;
}

.toast.success {
  background: #28a745;
}

.toast.error {
  background: #dc3545;
}

.toast.info {
  background: #3498db;
}

.toast-close {
  background: none;
  border: none;
  color: #fff;
  font-size: 16px;
  cursor: pointer;
  padding: 0;
  margin-left: 10px;
}

.toast-close:hover {
  color: #ddd;
}
</style>
