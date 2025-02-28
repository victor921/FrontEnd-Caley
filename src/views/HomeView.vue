<template>
  <div class="container">
    <h1>Policy Data Query</h1>

    <!-- Filters Card -->
    <div class="card">
      <div class="filters">
        <div class="filter-group">
          <label>Start Date</label>
          <DatePicker
            v-model="startDate"
            dateFormat="yy-mm-dd"
            showIcon
            :placeholder="`Start ${dateFieldName}`"
            class="input"
            :disabled="showCustomQuery"
          />
        </div>
        <div class="filter-group">
          <label>End Date</label>
          <DatePicker
            v-model="endDate"
            dateFormat="yy-mm-dd"
            showIcon
            :placeholder="`End ${dateFieldName}`"
            class="input"
            :disabled="showCustomQuery"
          />
        </div>
        <div class="filter-group">
          <label>Table</label>
          <Select
            v-model="selectedTable"
            :options="availableTables"
            optionLabel="name"
            optionValue="value"
            placeholder="Select Table"
            class="input"
            :disabled="showCustomQuery"
          />
        </div>
      </div>

      <!-- Display SQL Table Name -->
      <div v-if="selectedTable" class="table-name">
        <strong>SQL Table Name:</strong> {{ selectedTable }}
      </div>

      <div class="button-group">
        <Button
          label="Fetch Data"
          icon="pi pi-search"
          class="p-button-primary"
          :loading="loading"
          @click="fetchData"
        />
        <Button
          label="Show Fields"
          icon="pi pi-list"
          class="p-button-secondary"
          @click="showFields"
          :disabled="!selectedTable || loading"
        />
        <Button
          label="Download CSV"
          icon="pi pi-download"
          class="p-button-success"
          @click="downloadCSV"
          :disabled="loading || tableData.length === 0"
        />
        <Button
          label="Reset"
          icon="pi pi-refresh"
          class="p-button-warning"
          @click="resetForm"
          :disabled="loading"
        />
        <Button
          :label="showCustomQuery ? 'Default Query' : 'Custom Query'"
          icon="pi pi-code"
          class="p-button-info"
          @click="toggleCustomQuery"
        />
      </div>

      <!-- Custom Query Input -->
      <div v-if="showCustomQuery" class="custom-query-container">
        <p class="warning">
          ⚠️ Custom SQL requires experience. Only SELECT queries are allowed (read-only).
        </p>
        <Textarea
          v-model="customQuery"
          rows="5"
          placeholder="Enter your SQL query here (e.g., SELECT * FROM PRD.PremiumReport WHERE ...)"
          class="sql-input"
          @input="highlightSQL"
        />
        <pre class="language-sql">
          <code v-html="highlightedSQL"></code>
        </pre>
      </div>
    </div>

    <!-- Error Message -->
    <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

    <!-- Data Table -->
    <div class="table-container" v-if="tableData.length > 0">
      <DataTable
        :value="tableData"
        paginator
        rows="25"
        :rowsPerPageOptions="[10, 25, 50]"
        scrollable
        scrollHeight="60vh"
        class="p-datatable-gridlines"
        :loading="loading"
        filterDisplay="menu"
      >
        <Column
          v-for="(value, key) in tableData[0]"
          :key="key"
          :field="key"
          :header="key"
          sortable
          filter
          :filterMatchModeOptions="[
            { label: 'Equals', value: 'equals' },
            { label: 'Contains', value: 'contains' },
          ]"
          :filterMenuStyle="{ width: '200px' }"
          style="white-space: nowrap; text-overflow: ellipsis; overflow: hidden"
        >
          <!-- Custom filter template for Select of unique values -->
          <template #filter="{ filterModel, filterCallback }">
            <Select
              v-model="filterModel.value"
              :options="getUniqueValues(key)"
              optionLabel="label"
              optionValue="value"
              placeholder="Filter by value"
              class="p-column-filter"
              @change="filterCallback()"
            >
              <template #option="slotProps">
                <span>{{ slotProps.option.label }}</span>
              </template>
            </Select>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- No Data Message -->
    <p v-if="!loading && tableData.length === 0 && !errorMessage" class="no-data">
      No data available. Select a table or enter a query to fetch data.
    </p>

    <!-- Fields Dialog -->
    <Dialog
      v-model:visible="showFieldsDialog"
      header="Available Fields"
      :style="{ width: '30vw' }"
      :modal="true"
    >
      <ul class="fields-list">
        <li v-for="field in tableFields" :key="field">{{ field }}</li>
      </ul>
      <template #footer>
        <Button
          label="Close"
          icon="pi pi-times"
          class="p-button-secondary"
          @click="showFieldsDialog = false"
        />
      </template>
    </Dialog>

    <!-- Toast Notifications -->
    <Toast />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import axios from 'axios'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import DatePicker from 'primevue/datepicker'
import Button from 'primevue/button'
import Select from 'primevue/select';
import Textarea from 'primevue/textarea'
import Toast from 'primevue/toast'
import Dialog from 'primevue/dialog'
import { useToast } from 'primevue/usetoast'
import { exportCSV } from '../utils/exportCSV' // Assuming this utility exists
import 'prismjs/themes/prism.css'
import Prism from 'prismjs'

const toast = useToast()

// State
const today = new Date()
const startDate = ref(new Date(today.setDate(today.getDate() - 30))) // Last 30 days start
const endDate = ref(new Date()) // Today
const tableData = ref([])
const errorMessage = ref('')
const loading = ref(false)
const selectedTable = ref(null)
const customQuery = ref('')
const showCustomQuery = ref(false)
const showFieldsDialog = ref(false)
const tableFields = ref([])

// Hardcoded table options
const availableTables = ref([
  { name: 'Premium Report', value: 'PRD.PremiumReport' },
  { name: 'Policy Details', value: 'PRD.policies' },
  { name: 'Customer Info', value: 'PRD.contacts' },
])

// Computed property for dynamic date field name
const dateFieldName = computed(() => {
  if (selectedTable.value === 'PRD.policies' || selectedTable.value === 'PRD.contacts') {
    return 'DateLastModified'
  }
  return 'addedDate'
})

// Computed property for highlighted SQL query using Prism
const highlightedSQL = computed(() => {
  return Prism.highlight(customQuery.value || '', Prism.languages.sql, 'sql')
})

// Toggle custom query input and reset customQuery if needed
const toggleCustomQuery = () => {
  if (showCustomQuery.value) {
    customQuery.value = ''
  }
  showCustomQuery.value = !showCustomQuery.value
}

// Format date to YYYY-MM-DD
const formatDate = (date) => {
  return date.toISOString().split('T')[0]
}

// Fetch table fields dynamically
const fetchTableFields = async () => {
  if (!selectedTable.value) {
    tableFields.value = []
    return
  }
  loading.value = true
  try {
    const [schema, table] = selectedTable.value.split('.')
    const query = `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '${schema}' AND TABLE_NAME = '${table}'`
    const response = await axios.post(`https://dev.rocox.co/api/query_db?code=${process.env.VUE_APP_FUNCTION_KEY}`, { query })
    tableFields.value = response.data.map((row) => row.COLUMN_NAME)
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to fetch table fields.',
      life: 5000,
    })
    tableFields.value = []
  } finally {
    loading.value = false
  }
}

// Get unique values for a column key for filtering
const getUniqueValues = (key) => {
  if (!tableData.value.length) return []
  const uniqueValues = [...new Set(tableData.value.map((row) => row[key]))]
    .filter((value) => value !== null && value !== undefined)
    .map((value) => ({ label: String(value), value: String(value) }))
  return [{ label: 'All', value: null }, ...uniqueValues]
}

// Watch for table selection changes to fetch fields
watch(selectedTable, () => {
  fetchTableFields()
})

// Default query generator
const generateDefaultQuery = () => {
  if (!selectedTable.value) return ''
  return `
    SELECT *
    FROM ${selectedTable.value}
    WHERE ${dateFieldName.value} BETWEEN '${formatDate(startDate.value)}' AND '${formatDate(endDate.value)}'
  `.trim()
}

// Fetch data from the API with validation
const fetchData = async () => {
  if (!selectedTable.value && !customQuery.value.trim()) {
    toast.add({
      severity: 'warn',
      summary: 'Warning',
      detail: 'Please select a table or enter a custom query.',
      life: 3000,
    })
    return
  }

  if (!showCustomQuery.value && (!startDate.value || !endDate.value)) {
    toast.add({
      severity: 'warn',
      summary: 'Warning',
      detail: 'Please select both start and end dates for default query.',
      life: 3000,
    })
    return
  }

  loading.value = true
  errorMessage.value = ''
  const query = customQuery.value.trim() || generateDefaultQuery()

  if (!query.toUpperCase().startsWith('SELECT')) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Only SELECT queries are allowed.',
      life: 5000,
    })
    loading.value = false
    return
  }

  try {
    console.log('Executing query:', query)
    const response = await axios.post('https://dev.rocox.co/api/query_db', { query })
    tableData.value = response.data
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Data fetched successfully!',
      life: 3000,
    })
  } catch (error) {
    errorMessage.value = error?.response?.data?.message || 'Failed to fetch data.'
    toast.add({ severity: 'error', summary: 'Error', detail: errorMessage.value, life: 5000 })
  } finally {
    loading.value = false
  }
}

// Show table fields
const showFields = () => {
  if (!selectedTable.value) {
    toast.add({
      severity: 'warn',
      summary: 'Warning',
      detail: 'Please select a table first.',
      life: 3000,
    })
    return
  }
  showFieldsDialog.value = true
}

// Download CSV
const downloadCSV = () => {
  if (tableData.value.length > 0) {
    exportCSV(tableData.value, `query_results_${new Date().toISOString().split('T')[0]}.csv`)
    toast.add({ severity: 'info', summary: 'Download', detail: 'CSV file downloaded.', life: 3000 })
  } else {
    toast.add({
      severity: 'warn',
      summary: 'No Data',
      detail: 'No data available to download.',
      life: 3000,
    })
  }
}

// Reset form
const resetForm = () => {
  startDate.value = new Date(today.setDate(today.getDate() - 30))
  endDate.value = new Date()
  selectedTable.value = null
  customQuery.value = ''
  showCustomQuery.value = false
  tableData.value = []
  errorMessage.value = ''
  tableFields.value = []
  toast.add({ severity: 'info', summary: 'Reset', detail: 'Form reset to defaults.', life: 3000 })
}

// Highlight SQL on change
const highlightSQL = () => {
  setTimeout(() => Prism.highlightAll(), 0)
}
</script>

<style scoped>
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Roboto', Arial, sans-serif;
  color: #333;
}

h1 {
  text-align: center;
  margin-bottom: 30px;
  font-size: 28px;
  font-weight: 500;
  color: #2c3e50;
}

/* Card */
.card {
  background: #ffffff;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.filters {
  display: flex;
  gap: 20px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 15px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.filter-group label {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 5px;
  color: #34495e;
}

.input {
  width: 220px;
  font-size: 14px;
}

.table-name {
  text-align: center;
  font-size: 14px;
  color: #2c3e50;
  margin-bottom: 15px;
}

.table-name strong {
  font-weight: 600;
}

.button-group {
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}

.p-button-primary {
  background-color: #3498db;
  border-color: #3498db;
}

.p-button-secondary {
  background-color: #7f8c8d;
  border-color: #7f8c8d;
}

.p-button-success {
  background-color: #2ecc71;
  border-color: #2ecc71;
}

.p-button-warning {
  background-color: #e67e22;
  border-color: #e67e22;
}

.p-button-info {
  background-color: #9b59b6;
  border-color: #9b59b6;
}

/* Custom Query */
.custom-query-container {
  margin-top: 15px;
}

.warning {
  color: #e67e22;
  font-size: 14px;
  text-align: center;
  margin-bottom: 10px;
}

.sql-input {
  width: 100%;
  font-family: 'Source Code Pro', monospace;
  font-size: 14px;
  resize: vertical;
  border-radius: 5px;
}

.language-sql {
  background: #f5f6fa;
  padding: 10px;
  border-radius: 5px;
  overflow-x: auto;
  margin-top: 10px;
  font-family: 'Source Code Pro', monospace;
  font-size: 14px;
}

/* Data Table */
.table-container {
  width: 100%;
  margin-top: 20px;
}

.p-datatable {
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.p-datatable-header {
  background-color: #ecf0f1;
  font-weight: 500;
  font-size: 14px;
  color: #2c3e50;
}

.p-column-filter {
  width: 100%;
}

/* Messages */
.error-message {
  color: #e74c3c;
  font-size: 16px;
  text-align: center;
  margin-top: 20px;
}

.no-data {
  font-size: 16px;
  text-align: center;
  color: #7f8c8d;
  margin-top: 20px;
}

/* Fields Dialog */
.fields-list {
  list-style: none;
  padding: 0;
}

.fields-list li {
  font-size: 14px;
  padding: 5px 0;
  color: #34495e;
}
</style>
