<script setup>
import { ref } from "vue";
import axios from "axios";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Calendar from "primevue/calendar";
import Button from "primevue/button";
import { exportCSV } from "../utils/exportCSV";

const startDate = ref(new Date("2024-12-01"));
const endDate = ref(new Date("2024-12-31"));
const tableData = ref([]);
const errorMessage = ref("");
const loading = ref(false);

const fetchData = async () => {
  loading.value = true;
  errorMessage.value = "";
  try {
    const queryString = `
                          SELECT *
                          FROM PRD.PremiumReport
                          WHERE addedDate >= '${startDate.value.toISOString()}'
                          AND addedDate <= '${endDate.value.toISOString()}'
                        `
    console.log(queryString)
    const response = await axios.post("https://dev.rocox.co/api/query_db", {
      query: queryString,
    });
    tableData.value = response.data;
  } catch (error) {
    errorMessage.value = error.response?.data || "Failed to fetch data.";
  } finally {
    loading.value = false;
  }
};

const downloadCSV = () => {
  if (tableData.value.length > 0) {
    exportCSV(tableData.value, "query_results.csv");
  } else {
    alert("No data available to download.");
  }
};
</script>

<template>
  <div class="container">
    <h1>Policy Data Query</h1>

    <!-- Filters Card -->
    <div class="filters-card">
      <div class="filters">
        <Calendar
          v-model="startDate"
          dateFormat="yy-mm-dd"
          showIcon
          placeholder="Start Date"
          class="date-input"
        />
        <Calendar
          v-model="endDate"
          dateFormat="yy-mm-dd"
          showIcon
          placeholder="End Date"
          class="date-input"
        />
        <Button
          label="Fetch Data"
          icon="pi pi-search"
          class="fetch-button"
          :loading="loading"
          @click="fetchData"
        />
        <Button
          label="Download CSV"
          icon="pi pi-download"
          class="download-button"
          @click="downloadCSV"
          :disabled="loading || tableData.length === 0"
        />
      </div>
    </div>

    <!-- Error Message -->
    <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

    <!-- Data Table -->
    <div class="table-container" v-if="tableData.length > 0">
      <DataTable
        :value="tableData"
        paginator
        rows="10"
        :rowsPerPageOptions="[10, 25, 50]"
        scrollable
        scrollHeight="600px"
        responsiveLayout="scroll"
        class="p-datatable-gridlines fixed-table"
        :loading="loading"
      >
        <!-- Dynamic Columns -->
        <Column
          v-for="(value, key) in tableData[0]"
          :key="key"
          :field="key"
          :header="key"
          sortable
          filter
          style="white-space: nowrap; text-overflow: ellipsis; overflow: hidden;"
        />
      </DataTable>
    </div>

    <!-- No Data Message -->
    <p v-if="!loading && tableData.length === 0 && !errorMessage" class="no-data">
      No data available for the selected range.
    </p>
  </div>
</template>

<style scoped>
/* General Container */
.container {
  max-width: 95vw;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
  color: #333;
}

h1 {
  text-align: center;
  margin-bottom: 20px;
  font-size: 24px;
  color: #4a4a4a;
}

/* Filters Card */
.filters-card {
  background: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.filters {
  display: flex;
  justify-content: center;
  gap: 20px;
}

.date-input {
  width: 200px;
}

.fetch-button,
.download-button {
  padding: 10px 15px;
  font-size: 14px;
}

/* Data Table */
.table-container {
  width: 100%;
  height: 80vh; /* Larger table */
  overflow: hidden;
}

.fixed-table {
  width: 100%;
  height: calc(100% - 50px);
  border: 1px solid #ddd;
  border-radius: 4px;
}

.p-datatable-scrollable-body {
  max-height: 600px !important; /* Ensure scrollable table content */
}

.p-datatable .p-datatable-header {
  background-color: #f4f4f4;
  font-weight: bold;
  font-size: 16px;
  text-align: center;
  color: #333;
}

.p-datatable .p-datatable-tbody > tr > td {
  text-align: center;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

/* Error Message */
.error-message {
  color: red;
  font-size: 16px;
  text-align: center;
}

/* No Data Message */
.no-data {
  font-size: 16px;
  text-align: center;
  color: #777;
  margin-top: 20px;
}
</style>
