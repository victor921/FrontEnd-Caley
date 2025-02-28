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
        <Button
          label="Select Columns"
          icon="pi pi-eye"
          class="p-button-secondary"
          @click="showColumnSelector = true"
          :disabled="tableData.length === 0 || loading"
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
        v-model:filters="filters"
        :value="tableData"
        paginator
        :rows="25"
        :rowsPerPageOptions="[10, 25, 50]"
        scrollable
        scrollHeight="60vh"
        class="p-datatable-gridlines"
        :loading="loading"
        filterDisplay="menu"
        @filter="onFilter"
      >
        <template #header>
          <div class="flex justify-between">
            <Button
              type="button"
              icon="pi pi-filter-slash"
              label="Clear Filters"
              outlined
              @click="clearFilters()"
            />
          </div>
        </template>
        <Column
          v-for="column in visibleColumns"
          :key="column"
          :field="column"
          :header="column"
          sortable
          filter
          :filterMatchModeOptions="[
            { label: 'Equals', value: FilterMatchMode.EQUALS },
            { label: 'Contains', value: FilterMatchMode.CONTAINS },
            { label: 'Starts With', value: FilterMatchMode.STARTS_WITH },
            { label: 'Ends With', value: FilterMatchMode.ENDS_WITH },
          ]"
          :filterMenuStyle="{ width: '200px' }"
          style="white-space: nowrap; text-overflow: ellipsis; overflow: hidden"
        >
          <template #filter="{ filterModel, filterCallback }">
            <Select
              v-model="filterModel.value"
              :options="getUniqueValues(column)"
              optionLabel="label"
              optionValue="value"
              placeholder="Filter by value"
              class="p-column-filter"
              @change="filterCallback()"
            >
              <template #option="slotProps">
                <span>{{
                  slotProps.option.label.length > 20
                    ? slotProps.option.label.substring(0, 20) + '...'
                    : slotProps.option.label
                }}</span>
              </template>
            </Select>
          </template>
          <template #filterclear="{ filterCallback }">
            <Button
              type="button"
              icon="pi pi-times"
              @click="filterCallback()"
              severity="secondary"
            />
          </template>
          <template #filterapply="{ filterCallback }">
            <Button type="button" icon="pi pi-check" @click="filterCallback()" severity="success" />
          </template>
        </Column>
        <template #paginatorstart>
          <Button
            type="button"
            icon="pi pi-download"
            text
            @click="downloadCSV"
            :disabled="loading || filteredData.length === 0"
            class="p-button-success"
          />
        </template>
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

    <!-- Column Selector Dialog -->
    <Dialog
      v-model:visible="showColumnSelector"
      header="Select Columns to Display"
      :style="{ width: '40vw' }"
      :modal="true"
    >
      <MultiSelect
        v-model="visibleColumns"
        :options="availableColumns"
        optionLabel="label"
        optionValue="value"
        placeholder="Select columns"
        :filter="true"
        display="chip"
        class="column-multiselect"
      />
      <template #footer>
        <Button
          label="Apply"
          icon="pi pi-check"
          class="p-button-primary"
          @click="showColumnSelector = false"
        />
        <Button
          label="Cancel"
          icon="pi pi-times"
          class="p-button-secondary"
          @click="resetColumnSelector"
        />
      </template>
    </Dialog>

    <!-- AI Agent Dialog -->
    <Dialog
      v-model:visible="showAIAgent"
      header="Chat with CAS"
      :style="{ width: '40vw' }"
      :modal="true"
    >
      <div class="ai-chat-container">
        <div class="chat-history" ref="chatHistoryRef">
          <div
            v-for="(message, index) in chatHistory.messages"
            :key="index"
            :class="['chat-message', message.role === 'user' ? 'user-message' : 'ai-message']"
          >
            <span v-html="renderMarkdown(message.content)"></span>
          </div>
        </div>
        <Textarea
          v-model="aiQuery"
          rows="3"
          placeholder="Ask about the filtered table data..."
          class="ai-input"
          @keyup.enter="processAIQuery"
        />
        <Button
          label="Send"
          icon="pi pi-send"
          class="p-button-primary mt-2"
          @click="processAIQuery"
          :disabled="!aiQuery.trim() || aiLoading"
          :loading="aiLoading"
        />
      </div>
      <template #footer>
        <Button
          label="Close"
          icon="pi pi-times"
          class="p-button-secondary"
          @click="showAIAgent = false"
        />
      </template>
    </Dialog>

    <!-- Modern Ask AI Floating Button -->
    <Button
      v-if="tableData.length > 0"
      label="AI Chat (Beta)"
      class="ai-modern-btn"
      @click="showAIAgent = true"
      :disabled="loading"
    />

    <!-- Toast Notifications -->
    <Toast />
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted, reactive, nextTick } from 'vue'
import axios from 'axios'
import OpenAI from 'openai'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import DatePicker from 'primevue/datepicker'
import Button from 'primevue/button'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import Toast from 'primevue/toast'
import Dialog from 'primevue/dialog'
import MultiSelect from 'primevue/multiselect'
import { FilterMatchMode } from '@primevue/core/api'
import { useToast } from 'primevue/usetoast'
import { exportCSV } from '../utils/exportCSV'
import 'prismjs/themes/prism.css'
import Prism from 'prismjs'
import { marked } from 'marked'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY'],
  dangerouslyAllowBrowser: true,
})

// Toast
const toast = useToast()

// Markdown rendering helper
const renderMarkdown = (text) => marked(text || '')

// State
const today = new Date()
const startDate = ref(new Date(today.setDate(today.getDate() - 30)))
const endDate = ref(new Date())
const tableData = ref([])
const filteredData = ref([])
const errorMessage = ref('')
const loading = ref(false)
const selectedTable = ref(null)
const customQuery = ref('')
const showCustomQuery = ref(false)
const showFieldsDialog = ref(false)
const showColumnSelector = ref(false)
const showAIAgent = ref(false)
const tableFields = ref([])
const visibleColumns = ref([])
const allColumns = ref([])
const filters = ref({})
const aiQuery = ref('')
const aiResponse = ref('')
const displayedResponse = ref('')
const aiLoading = ref(false)
const chatHistory = reactive({ messages: [] })
let typingInterval = null
const chatHistoryRef = ref(null)

// Table options
const availableTables = ref([
  { name: 'Premium Report', value: 'PRD.PremiumReport' },
  { name: 'Policy Details', value: 'PRD.policies' },
  { name: 'Customer Info', value: 'PRD.contacts' },
])

// Computed properties
const dateFieldName = computed(() =>
  selectedTable.value === 'PRD.policies' || selectedTable.value === 'PRD.contacts'
    ? 'DateLastModified'
    : 'addedDate'
)

const highlightedSQL = computed(() =>
  Prism.highlight(customQuery.value || '', Prism.languages.sql, 'sql')
)

const availableColumns = computed(() =>
  allColumns.value.map((col) => ({ label: col, value: col }))
)

// Function to auto-scroll only if user is near bottom
const autoScroll = () => {
  nextTick(() => {
    if (chatHistoryRef.value) {
      const el = chatHistoryRef.value
      const tolerance = 20
      // Check if user is at or near the bottom
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - tolerance) {
        el.scrollTop = el.scrollHeight
      }
    }
  })
}

// Watch tableData to initialize columns, filters, and reset chat history
watch(
  tableData,
  (newVal) => {
    if (newVal && newVal.length > 0) {
      const columns = Object.keys(newVal[0])
      allColumns.value = columns
      visibleColumns.value = [...columns]
      filteredData.value = [...newVal]
      initFilters()
    } else {
      allColumns.value = []
      visibleColumns.value = []
      filteredData.value = []
      filters.value = {}
      chatHistory.messages = []
    }
  },
  { immediate: true }
)

// Watch chatHistory messages length to auto-scroll (if user hasn't scrolled up)
watch(
  () => chatHistory.messages.length,
  () => {
    autoScroll()
  }
)

// Methods
const toggleCustomQuery = () => {
  if (showCustomQuery.value) customQuery.value = ''
  showCustomQuery.value = !showCustomQuery.value
}

const formatDate = (date) => date.toISOString().split('T')[0]

const fetchTableFields = async () => {
  if (!selectedTable.value) {
    tableFields.value = []
    return
  }
  loading.value = true
  try {
    const [schema, table] = selectedTable.value.split('.')
    const query = `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '${schema}' AND TABLE_NAME = '${table}'`
    const response = await axios.post(
      `https://dev.rocox.co/api/query_db?code=${process.env.VUE_APP_FUNCTION_KEY}`,
      { query }
    )
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

const getUniqueValues = (key) => {
  if (!tableData.value.length) return []
  const uniqueValues = [
    ...new Set(tableData.value.map((row) => row[key])),
  ]
    .filter((value) => value !== null && value !== undefined)
    .map((value) => ({ label: String(value), value: String(value) }))
  return [{ label: 'All', value: null }, ...uniqueValues]
}

const initFilters = () => {
  filters.value = allColumns.value.reduce((acc, col) => {
    acc[col] = { value: null, matchMode: FilterMatchMode.EQUALS }
    return acc
  }, {})
}

watch(selectedTable, () => fetchTableFields())

const generateDefaultQuery = () => {
  if (!selectedTable.value) return ''
  return `
    SELECT *
    FROM ${selectedTable.value}
    WHERE ${dateFieldName.value} BETWEEN '${formatDate(startDate.value)}' AND '${formatDate(endDate.value)}'
  `.trim()
}

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
      detail: 'Please select both start and end dates.',
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
    const response = await axios.post(
      `https://dev.rocox.co/api/query_db?code=${process.env.VUE_APP_FUNCTION_KEY}`,
      { query }
    )
    tableData.value = response.data || []
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Data fetched successfully!',
      life: 3000,
    })
  } catch (error) {
    errorMessage.value = error?.response?.data?.message || 'Failed to fetch data.'
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: errorMessage.value,
      life: 3000,
    })
  } finally {
    loading.value = false
  }
}

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

const downloadCSV = () => {
  if (filteredData.value.length > 0) {
    const exportData = filteredData.value.map((row) =>
      Object.fromEntries(visibleColumns.value.map((col) => [col, row[col]]))
    )
    exportCSV(exportData, `query_results_${new Date().toISOString().split('T')[0]}.csv`)
    toast.add({
      severity: 'info',
      summary: 'Download',
      detail: 'CSV file downloaded.',
      life: 3000,
    })
  } else {
    toast.add({
      severity: 'warn',
      summary: 'No Data',
      detail: 'No filtered data available to download.',
      life: 3000,
    })
  }
}

const resetForm = () => {
  startDate.value = new Date(today.setDate(today.getDate() - 30))
  endDate.value = new Date()
  selectedTable.value = null
  customQuery.value = ''
  showCustomQuery.value = false
  tableData.value = []
  filteredData.value = []
  errorMessage.value = ''
  tableFields.value = []
  initFilters()
  aiQuery.value = ''
  aiResponse.value = ''
  displayedResponse.value = ''
  chatHistory.messages = []
  clearTypingEffect()
  toast.add({
    severity: 'info',
    summary: 'Reset',
    detail: 'Form reset to defaults.',
    life: 3000,
  })
}

const resetColumnSelector = () => {
  visibleColumns.value = [...allColumns.value]
  showColumnSelector.value = false
}

const highlightSQL = () => {
  setTimeout(() => Prism.highlightAll(), 0)
}

const clearFilters = () => {
  initFilters()
  filteredData.value = [...tableData.value]
}

const onFilter = (event) => {
  filteredData.value = event.filteredValue || []
}

// Typing Effect with Markdown Support using marked
const startTypingEffect = (text, callback) => {
  clearTypingEffect()
  let index = 0
  let buffer = ''
  displayedResponse.value = ''

  typingInterval = setInterval(() => {
    if (index < text.length) {
      buffer += text[index]
      displayedResponse.value = renderMarkdown(buffer)
      index++
      autoScroll()
    } else {
      clearTypingEffect()
      if (callback) callback()
    }
  }, 50)
}

const clearTypingEffect = () => {
  if (typingInterval) {
    clearInterval(typingInterval)
    typingInterval = null
  }
}

onUnmounted(() => {
  clearTypingEffect()
})

// OpenAI ChatGPT Integration with Filtered Data Only
const processAIQuery = async () => {
  if (!aiQuery.value.trim()) return

  aiLoading.value = true
  displayedResponse.value = ''

  const data = filteredData.value || []
  if (!data.length) {
    aiResponse.value = 'No data available to analyze. Please fetch data first.'
    chatHistory.messages.push({ role: 'user', content: aiQuery.value })
    chatHistory.messages.push({ role: 'ai', content: aiResponse.value })
    startTypingEffect(aiResponse.value)
    aiLoading.value = false
    return
  }

  try {
    const columns = visibleColumns.value || []
    if (!columns.length) {
      aiResponse.value = 'No visible columns to analyze. Please select columns.'
      chatHistory.messages.push({ role: 'user', content: aiQuery.value })
      chatHistory.messages.push({ role: 'ai', content: aiResponse.value })
      startTypingEffect(aiResponse.value)
      aiLoading.value = false
      return
    }

    const displayData = data.map((row) =>
      Object.fromEntries(columns.map((col) => [col, row[col]]))
    )

    const tableString = JSON.stringify(displayData)
    const approxTokens = tableString.length / 4

    let prompt
    if (approxTokens > 16000) {
      prompt = `
        The filtered table has ${data.length} rows and columns: ${columns.join(', ')}.
        It’s too large to process fully (${approxTokens} tokens). Please filter the data further to reduce the row count, then try again.
        Query: "${aiQuery.value}".
      `
    } else {
      prompt = `
        You are an AI assistant analyzing a filtered table with ${data.length} rows and columns: ${columns.join(', ')}.
        Here is the full filtered table data: ${tableString}.
        Based on this, answer the query: "${aiQuery.value}".
        Use **bold** markdown (e.g., **value**) for key figures or emphasis in your response.
        If the query is unclear, suggest a valid example like "Show me the total gross commission for Aetna".
        Keep the response as concise as possible. The person who you will be talking to does not have any technical experience.
      `
    }

    chatHistory.messages.push({ role: 'user', content: aiQuery.value })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a data analysis assistant.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 16000,
      temperature: 0.3,
    })

    aiResponse.value = completion.choices[0].message.content.trim()
    chatHistory.messages.push({ role: 'ai', content: aiResponse.value })
    startTypingEffect(aiResponse.value, () => {
      autoScroll()
    })
  } catch (error) {
    console.error('OpenAI API error:', error)
    aiResponse.value = `Failed to process query: ${error.message || 'Unknown error'}. Try a smaller dataset or check your API key.`
    chatHistory.messages.push({ role: 'user', content: aiQuery.value })
    chatHistory.messages.push({ role: 'ai', content: aiResponse.value })
    startTypingEffect(aiResponse.value)
  } finally {
    aiLoading.value = false
    aiQuery.value = ''
  }
}
</script>

<style scoped>
/* Standardize font to Roboto globally */
* {
  font-family: 'Roboto', Arial, sans-serif !important;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  color: #333;
}

h1 {
  text-align: center;
  margin-bottom: 30px;
  font-size: 28px;
  font-weight: 500;
  color: #2c3e50;
}

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

.fields-list {
  list-style: none;
  padding: 0;
}

.fields-list li {
  font-size: 14px;
  padding: 5px 0;
  color: #34495e;
}

.column-multiselect {
  width: 100%;
}

.p-column-filter {
  width: 100%;
}

:deep(.p-dialog .p-dialog-content) {
  padding: 1rem;
}

:deep(.p-multiselect) {
  width: 100%;
}

/* Modern AI Button - Sleek and Modern */
.ai-modern-btn {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 100px;
  height: 45px;
  border-radius: 25px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  z-index: 1000;
}

.ai-modern-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.25);
}

.ai-modern-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

/* Chat Interface */
.ai-chat-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 400px;
}

.chat-history {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  background: #f9f9f9;
  border-radius: 5px;
  border: 1px solid #e0e6ed;
}

.chat-message {
  margin-bottom: 10px;
  padding: 8px 12px;
  border-radius: 5px;
  max-width: 80%;
  word-wrap: break-word;
}

.user-message {
  background: #e3f2fd;
  align-self: flex-end;
  margin-left: auto;
  color: #1976d2;
}

.ai-message {
  background: #eceff1;
  align-self: flex-start;
  margin-right: auto;
  color: #455a64;
}

.ai-input {
  width: 100%;
  font-size: 14px;
  resize: vertical;
  border-radius: 5px;
}

.mt-2 {
  margin-top: 0.5rem;
}

.flex {
  display: flex;
}

.justify-between {
  justify-content: space-between;
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
