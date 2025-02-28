<template>
  <div class="settings-container">
    <header class="header">
      <h1 class="title">Company Metadata Management</h1>
    </header>

    <!-- Tabs for Actions -->
    <div class="tab-bar">
      <button @click="chooseAction('add')" :class="['tab', { active: action === 'add' }]">Add New</button>
      <button @click="chooseAction('edit')" :class="['tab', { active: action === 'edit' }]">Edit</button>
      <button @click="chooseAction('view')" :class="['tab', { active: action === 'view' }]">View</button>
    </div>

    <!-- Main Content Area -->
    <div class="content-area">
      <!-- Loading/Error -->
      <div v-if="loading" class="status-message">Loading company data...</div>
      <div v-if="errorMessage" class="status-message error">{{ errorMessage }}</div>

      <!-- Add Tab -->
      <div v-if="action === 'add' && !loading" class="tab-content">
        <div class="form-section">
          <div class="form-grid">
            <div class="form-group">
              <label for="carrier-id-add">Carrier ID <span class="required">*</span></label>
              <input id="carrier-id-add" v-model="currentCompany.carrier_id" type="number" placeholder="Enter Carrier ID" class="input-field" />
            </div>
            <div class="form-group">
              <label for="full-name-add">Full Company Name <span class="required">*</span></label>
              <input id="full-name-add" v-model="currentCompany.full_company_name" type="text" placeholder="Enter Full Name" class="input-field" />
            </div>
            <div class="form-group">
              <label for="simple-names-add">Simple Names <span class="required">*</span> <span>(comma-separated)</span></label>
              <input id="simple-names-add" v-model="simpleCompanyInput" type="text" placeholder="e.g., AmWINS, AX" class="input-field" />
            </div>
          </div>
          <div class="checkbox-group">
            <label><input type="checkbox" v-model="isMVR" /> MVR Data</label>
            <label><input type="checkbox" v-model="isStatement" /> Statement Data</label>
          </div>
          <div class="fields-container">
            <div v-if="isMVR" class="fields-section">
              <h3>MVR Fields</h3>
              <div v-for="(field, index) in mvrInputs" :key="index" class="field-row">
                <input v-model="field.key" placeholder="Key" class="input-field small" />
                <select v-model="field.value" class="dropdown small">
                  <option value="" disabled>Select Value</option>
                  <option v-for="option in fieldOptions" :key="option" :value="option">{{ option }}</option>
                </select>
                <button @click="removeMvrField(index)" class="remove-btn">×</button>
              </div>
              <div class="field-row field-add">
                <input v-model="newMvrKey" placeholder="Key" class="input-field small" />
                <select v-model="newMvrValue" class="dropdown small">
                  <option value="" disabled>Select Value</option>
                  <option v-for="option in fieldOptions" :key="option" :value="option">{{ option }}</option>
                </select>
                <button @click="addMvrField" class="add-btn">+</button>
              </div>
            </div>
            <div v-if="isStatement" class="fields-section">
              <h3>Statement Fields</h3>
              <div v-for="(field, index) in statementInputs" :key="index" class="field-row">
                <input v-model="field.key" placeholder="Key" class="input-field small" />
                <select v-model="field.value" class="dropdown small">
                  <option value="" disabled>Select Value</option>
                  <option v-for="option in fieldOptions" :key="option" :value="option">{{ option }}</option>
                </select>
                <button @click="removeStatementField(index)" class="remove-btn">×</button>
              </div>
              <div class="field-row field-add">
                <input v-model="newStatementKey" placeholder="Key" class="input-field small" />
                <select v-model="newStatementValue" class="dropdown small">
                  <option value="" disabled>Select Value</option>
                  <option v-for="option in fieldOptions" :key="option" :value="option">{{ option }}</option>
                </select>
                <button @click="addStatementField" class="add-btn">+</button>
              </div>
            </div>
          </div>
          <button @click="saveChanges" class="save-btn">Add Company</button>
          <p v-if="saveMessage" class="save-message">{{ saveMessage }}</p>
        </div>
      </div>

      <!-- Edit Tab -->
      <div v-if="action === 'edit' && !loading" class="tab-content split-content">
        <div class="company-list">
          <h3>Companies</h3>
          <select v-model="selectedCompanyIndex" class="company-dropdown" size="10">
            <option v-for="(company, index) in companyData" :key="index" :value="index">
              {{ company.full_company_name }}
            </option>
          </select>
        </div>
        <div class="form-section" v-if="selectedCompanyIndex !== ''">
          <div class="form-grid">
            <div class="form-group">
              <label for="carrier-id-edit">Carrier ID <span class="required">*</span></label>
              <input id="carrier-id-edit" v-model="currentCompany.carrier_id" type="number" placeholder="Enter Carrier ID" class="input-field" />
            </div>
            <div class="form-group">
              <label for="full-name-edit">Full Company Name <span class="required">*</span></label>
              <input id="full-name-edit" v-model="currentCompany.full_company_name" type="text" placeholder="Enter Full Name" class="input-field" />
            </div>
            <div class="form-group">
              <label for="simple-names-edit">Simple Names <span class="required">*</span> <span>(comma-separated)</span></label>
              <input id="simple-names-edit" v-model="simpleCompanyInput" type="text" placeholder="e.g., AmWINS, AX" class="input-field" />
            </div>
          </div>
          <div class="checkbox-group">
            <label><input type="checkbox" v-model="isMVR" /> MVR Data</label>
            <label><input type="checkbox" v-model="isStatement" /> Statement Data</label>
          </div>
          <div class="fields-container">
            <div v-if="isMVR" class="fields-section">
              <h3>MVR Fields</h3>
              <div v-for="(field, index) in mvrInputs" :key="index" class="field-row">
                <input v-model="field.key" placeholder="Key" class="input-field small" />
                <select v-model="field.value" class="dropdown small">
                  <option value="" disabled>Select Value</option>
                  <option v-for="option in fieldOptions" :key="option" :value="option">{{ option }}</option>
                </select>
                <button @click="removeMvrField(index)" class="remove-btn">×</button>
              </div>
              <div class="field-row field-add">
                <input v-model="newMvrKey" placeholder="Key" class="input-field small" />
                <select v-model="newMvrValue" class="dropdown small">
                  <option value="" disabled>Select Value</option>
                  <option v-for="option in fieldOptions" :key="option" :value="option">{{ option }}</option>
                </select>
                <button @click="addMvrField" class="add-btn">+</button>
              </div>
            </div>
            <div v-if="isStatement" class="fields-section">
              <h3>Statement Fields</h3>
              <div v-for="(field, index) in statementInputs" :key="index" class="field-row">
                <input v-model="field.key" placeholder="Key" class="input-field small" />
                <select v-model="field.value" class="dropdown small">
                  <option value="" disabled>Select Value</option>
                  <option v-for="option in fieldOptions" :key="option" :value="option">{{ option }}</option>
                </select>
                <button @click="removeStatementField(index)" class="remove-btn">×</button>
              </div>
              <div class="field-row field-add">
                <input v-model="newStatementKey" placeholder="Key" class="input-field small" />
                <select v-model="newStatementValue" class="dropdown small">
                  <option value="" disabled>Select Value</option>
                  <option v-for="option in fieldOptions" :key="option" :value="option">{{ option }}</option>
                </select>
                <button @click="addStatementField" class="add-btn">+</button>
              </div>
            </div>
          </div>
          <button @click="saveChanges" class="save-btn">Save Changes</button>
          <p v-if="saveMessage" class="save-message">{{ saveMessage }}</p>
        </div>
      </div>

      <!-- View Tab -->
      <div v-if="action === 'view' && !loading" class="tab-content split-content">
        <div class="company-list">
          <h3>Companies</h3>
          <select v-model="selectedCompanyIndex" class="company-dropdown" size="10">
            <option v-for="(company, index) in companyData" :key="index" :value="index">
              {{ company.full_company_name }}
            </option>
          </select>
        </div>
        <div class="view-section" v-if="selectedCompanyIndex !== ''">
          <div class="view-grid">
            <div><strong>Carrier ID:</strong> {{ currentCompany.carrier_id }}</div>
            <div><strong>Full Name:</strong> {{ currentCompany.full_company_name }}</div>
            <div><strong>Simple Names:</strong> {{ currentCompany.simple_company.join(', ') }}</div>
          </div>
          <div class="mappings">
            <div>
              <h3>MVR Fields</h3>
              <ul v-if="Object.keys(currentCompany.mvr_fields).length">
                <li v-for="(value, key) in currentCompany.mvr_fields" :key="key">{{ key }} → {{ value }}</li>
              </ul>
              <p v-else>No fields defined.</p>
            </div>
            <div>
              <h3>Statement Fields</h3>
              <ul v-if="Object.keys(currentCompany.statement_fields).length">
                <li v-for="(value, key) in currentCompany.statement_fields" :key="key">{{ key }} → {{ value }}</li>
              </ul>
              <p v-else>No fields defined.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Log Section (Sticky Footer) -->
    <div class="log-section" v-if="lastEditedLog">
      <p>Last edited by <span class="log-user" @click="toggleLogDetails">{{ lastEditedLog.user_email }}</span> on {{ formatDate(lastEditedLog.change_timestamp) }}</p>
      <div v-if="showLogDetails" class="log-details">
        <p><strong>Action:</strong> {{ lastEditedLog.action }}</p>
        <div class="diff-container" v-html="diffHtml"></div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";
import { useUserStore } from "@/stores/userStore";
import { diffJson } from "diff";

export default {
  name: "ConfigurationView",
  data() {
    return {
      action: "add",
      companyData: [],
      selectedCompanyIndex: "",
      currentCompany: { carrier_id: "", full_company_name: "", simple_company: [], mvr_fields: {}, statement_fields: {} },
      originalCompany: {},
      simpleCompanyInput: "",
      mvrInputs: [],
      statementInputs: [],
      newMvrKey: "",
      newMvrValue: "",
      newStatementKey: "",
      newStatementValue: "",
      isMVR: false,
      isStatement: false,
      fieldOptions: ["full_name", "order_date", "premium", "gross_comission", "effective_date", "transaction_type", "fee", "User", "charge", "credit", "policy_statement", "carrier_name"],
      loading: false,
      errorMessage: "",
      saveMessage: "",
      lastEditedLog: null,
      showLogDetails: false,
    };
  },
  computed: {
    diffHtml() {
      if (!this.lastEditedLog) return "";
      let oldParsed = this.lastEditedLog.old_value ? JSON.parse(this.lastEditedLog.old_value) : {};
      let newParsed = this.lastEditedLog.new_value ? JSON.parse(this.lastEditedLog.new_value) : {};
      const diff = diffJson(JSON.stringify(oldParsed, null, 2), JSON.stringify(newParsed, null, 2));
      return diff.map(part => `<span style="color:${part.added ? '#2ecc71' : part.removed ? '#e74c3c' : '#7f8c8d'}">${part.value.replace(/\n/g, "<br>")}</span>`).join("");
    },
  },
  mounted() {
    this.fetchLastEditedLog();
    this.fetchCompanyData();
  },
  methods: {
    chooseAction(selected) {
      this.action = selected;
      this.selectedCompanyIndex = "";
      this.resetCurrentCompany();
      this.saveMessage = "";
      this.errorMessage = "";
      if (selected !== "add") this.fetchCompanyData();
    },
    resetCurrentCompany() {
      this.currentCompany = { carrier_id: "", full_company_name: "", simple_company: [], mvr_fields: {}, statement_fields: {} };
      this.originalCompany = {};
      this.simpleCompanyInput = "";
      this.isMVR = false;
      this.isStatement = false;
      this.mvrInputs = [];
      this.statementInputs = [];
      this.newMvrKey = "";
      this.newMvrValue = "";
      this.newStatementKey = "";
      this.newStatementValue = "";
    },
    async fetchCompanyData() {
      if (this.companyData.length) return;
      this.loading = true;
      try {
        const response = await axios.get(`https://dev.rocox.co/api/get_file_content?path=/caley-operations-dev/Static Files/company_metadata.json&code=${process.env.VUE_APP_FUNCTION_KEY}`);
        this.companyData = response.data || [];
      } catch (error) {
        this.errorMessage = "Failed to load company data.";
      } finally {
        this.loading = false;
      }
    },
    async fetchLastEditedLog() {
      try {
        const response = await axios.post(`https://dev.rocox.co/api/query_db?code=${process.env.VUE_APP_FUNCTION_KEY}`, {
          query: "SELECT TOP 1 user_email, change_timestamp, action, old_value, new_value FROM dbo.configuration_logs ORDER BY change_timestamp DESC"
        });
        if (response.data?.length) this.lastEditedLog = response.data[0];
      } catch (error) {
        console.error("Error fetching log:", error);
      }
    },
    toggleLogDetails() {
      this.showLogDetails = !this.showLogDetails;
    },
    addMvrField() {
      if (this.newMvrKey.trim() && this.newMvrValue.trim()) {
        this.mvrInputs.push({ key: this.newMvrKey.trim(), value: this.newMvrValue.trim() });
        this.newMvrKey = "";
        this.newMvrValue = "";
      } else {
        this.errorMessage = "Please enter both a key and value.";
      }
    },
    removeMvrField(index) {
      this.mvrInputs.splice(index, 1);
    },
    addStatementField() {
      if (this.newStatementKey.trim() && this.newStatementValue.trim()) {
        this.statementInputs.push({ key: this.newStatementKey.trim(), value: this.newStatementValue.trim() });
        this.newStatementKey = "";
        this.newStatementValue = "";
      } else {
        this.errorMessage = "Please enter both a key and value.";
      }
    },
    removeStatementField(index) {
      this.statementInputs.splice(index, 1);
    },
    arrayToObject(arr) {
      return Object.fromEntries(arr.map(item => [item.key, item.value]));
    },
    async saveChanges() {
      // Validation for required fields
      if (!this.currentCompany.carrier_id || !this.currentCompany.full_company_name || !this.simpleCompanyInput.trim()) {
        this.errorMessage = "Please fill out all required fields: Carrier ID, Full Company Name, and Simple Names.";
        this.saveMessage = ""; // Clear success message if validation fails
        return;
      }

      this.currentCompany.simple_company = this.simpleCompanyInput.split(",").map(s => s.trim()).filter(Boolean);
      this.currentCompany.mvr_fields = this.isMVR ? this.arrayToObject(this.mvrInputs) : {};
      this.currentCompany.statement_fields = this.isStatement ? this.arrayToObject(this.statementInputs) : {};

      if (this.action === "add") this.companyData.push({ ...this.currentCompany });
      else if (this.action === "edit" && this.selectedCompanyIndex !== "") this.companyData[this.selectedCompanyIndex] = { ...this.currentCompany };

      try {
        await axios.post(`https://dev.rocox.co/api/create_file?code=${process.env.VUE_APP_FUNCTION_KEY}`, {
          directory: "Static Files/",
          file_name: "company_metadata.json",
          content: this.companyData,
        });
        this.saveMessage = "Saved successfully!";
        this.errorMessage = ""; // Clear error message on success
        await this.updateLog();
        this.fetchLastEditedLog();
        if (this.action === "add") this.resetCurrentCompany();
      } catch (error) {
        this.saveMessage = "Failed to save.";
        this.errorMessage = "An error occurred while saving. Please try again.";
      }
    },
    async updateLog() {
      const userStore = useUserStore();
      const logData = {
        company_id: this.currentCompany.carrier_id || null,
        user_id: userStore.user.id || null,
        user_email: userStore.user.email,
        action: this.action === "add" ? "create" : "update",
        old_value: this.action === "edit" ? JSON.stringify(this.originalCompany) : "",
        new_value: JSON.stringify(this.currentCompany)
      };
      await axios.post(`https://dev.rocox.co/api/update_sql?code=${process.env.VUE_APP_FUNCTION_KEY}`, { table: "configuration_logs", data: logData });
    },
    formatDate(dateString) {
      return new Date(dateString).toLocaleString();
    },
  },
  watch: {
    selectedCompanyIndex(newVal) {
      if (newVal !== "" && this.companyData[newVal]) {
        const selected = this.companyData[newVal];
        this.currentCompany = {
          carrier_id: selected.carrier_id || "",
          full_company_name: selected.full_company_name || "",
          simple_company: Array.isArray(selected.simple_company) ? [...selected.simple_company] : [],
          mvr_fields: selected.mvr_fields || {},
          statement_fields: selected.statement_fields || {}
        };
        this.originalCompany = { ...this.currentCompany };
        this.simpleCompanyInput = this.currentCompany.simple_company.join(", ");
        this.isMVR = !!Object.keys(this.currentCompany.mvr_fields).length;
        this.mvrInputs = Object.entries(this.currentCompany.mvr_fields).map(([key, value]) => ({ key, value }));
        this.isStatement = !!Object.keys(this.currentCompany.statement_fields).length;
        this.statementInputs = Object.entries(this.currentCompany.statement_fields).map(([key, value]) => ({ key, value }));
        this.newMvrKey = "";
        this.newMvrValue = "";
        this.newStatementKey = "";
        this.newStatementValue = "";
      }
    },
  },
};
</script>

<style scoped>
/* Container */
.settings-container {
  max-width: 1280px;
  margin: 20px auto;
  height: 90vh;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  font-family: 'Inter', Arial, sans-serif;
}

/* Header */
.header {
  padding: 15px 25px;
  background: #2c3e50;
  border-radius: 8px 8px 0 0;
  position: relative;
  overflow: hidden;
}

.header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(52, 152, 219, 0.2), rgba(41, 128, 185, 0.1));
  z-index: 0;
}

.title {
  font-size: 24px;
  text-align: center;
  margin: 0;
  color: #ffffff;
  font-weight: 600;
  position: relative;
  z-index: 1;
}

/* Tab Bar */
.tab-bar {
  display: flex;
  background: #f7f9fc;
  border-bottom: 1px solid #e0e6ed;
  padding: 10px;
}

.tab {
  flex: 1;
  padding: 12px 20px;
  background: transparent;
  border: none;
  font-size: 16px;
  color: #7f8c8d;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
  position: relative;
}

.tab:hover {
  color: #2c3e50;
  background: #e0e6ed;
}

.tab.active {
  color: #3498db;
  background: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.tab.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 100%;
  height: 2px;
  background: #3498db;
}

/* Content Area */
.content-area {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.tab-content {
  height: 100%;
}

/* Split Content */
.split-content {
  display: flex;
  gap: 20px;
  height: 100%;
}

.company-list {
  flex: 1;
  padding: 15px;
  background: #ffffff;
}

.company-list h3 {
  font-size: 16px;
  color: #2c3e50;
  margin-bottom: 10px;
  font-weight: 600;
}

.company-dropdown {
  width: 100%;
  height: calc(100% - 32px);
  padding: 10px;
  font-size: 14px;
  border: 1px solid #dfe6e9;
  border-radius: 6px;
  background: #f9fbfc;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.05);
  appearance: none;
}

.company-dropdown option {
  padding: 8px 12px;
  color: #2c3e50;
  transition: background 0.2s ease;
}

.company-dropdown option:hover {
  background: #ecf0f1;
}

.company-dropdown:focus {
  border-color: #3498db;
  box-shadow: 0 0 6px rgba(52, 152, 219, 0.3);
  outline: none;
}

/* Status Messages */
.status-message {
  text-align: center;
  font-size: 16px;
  padding: 15px;
  color: #7f8c8d;
  background: #f8fafc;
  border-radius: 6px;
  margin-bottom: 15px;
}

.status-message.error {
  color: #e74c3c;
  background: #fef0f0;
}

/* Form Section */
.form-section {
  flex: 2;
  padding: 20px;
  background: #ffffff;
  border-radius: 6px;
  overflow-y: auto;
}

.form-grid {
  display: grid;
  gap: 15px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-size: 14px;
  color: #2c3e50;
  margin-bottom: 5px;
  font-weight: 500;
}

.form-group label span.required {
  color: #e74c3c;
  font-weight: bold;
}

.form-group label span:not(.required) {
  font-size: 12px;
  color: #95a5a6;
}

.input-field {
  padding: 10px;
  font-size: 15px;
  border: 1px solid #dfe6e9;
  border-radius: 6px;
  background: #fff;
  transition: border-color 0.2s ease;
}

.input-field:focus {
  border-color: #3498db;
  outline: none;
  box-shadow: 0 0 5px rgba(52, 152, 219, 0.3);
}

.checkbox-group {
  display: flex;
  gap: 20px;
  margin: 15px 0;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  font-size: 14px;
  color: #2c3e50;
}

.checkbox-group input {
  margin-right: 8px;
  accent-color: #3498db;
}

/* Fields Section */
.fields-container {
  margin-top: 15px;
}

.fields-section {
  margin-bottom: 15px;
}

.fields-section h3 {
  font-size: 16px;
  color: #2c3e50;
  margin-bottom: 8px;
  font-weight: 500;
}

.field-row {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
}

.input-field.small, .dropdown.small {
  padding: 8px;
  font-size: 14px;
}

.field-add {
  margin-top: 8px;
}

.remove-btn {
  padding: 6px 10px;
  background: #e74c3c;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.remove-btn:hover {
  background: #c0392b;
}

.add-btn {
  padding: 6px 10px;
  background: #2ecc71;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.add-btn:hover {
  background: #27ae60;
}

/* Save Button */
.save-btn {
  width: 100%;
  max-width: 180px;
  margin: 20px auto 0;
  padding: 12px;
  background: #3498db;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  display: block;
  transition: background 0.2s ease;
}

.save-btn:hover {
  background: #2980b9;
}

.save-message {
  text-align: center;
  font-size: 14px;
  color: #2ecc71;
  margin-top: 10px;
}

/* View Section */
.view-section {
  flex: 2;
  padding: 20px;
  background: #ffffff;
  border-radius: 6px;
}

.view-grid {
  display: grid;
  gap: 10px;
  margin-bottom: 15px;
}

.view-grid div {
  font-size: 15px;
  color: #7f8c8d;
}

.view-grid strong {
  color: #2c3e50;
}

.mappings {
  display: grid;
  gap: 15px;
}

.mappings h3 {
  font-size: 16px;
  color: #2c3e50;
  font-weight: 500;
}

.mappings ul {
  list-style: none;
  padding: 0;
}

.mappings li {
  font-size: 14px;
  color: #7f8c8d;
  margin: 6px 0;
}

.mappings p {
  font-size: 14px;
  color: #95a5a6;
}

/* Log Section */
.log-section {
  padding: 15px;
  background: #f8fafc;
  border-top: 1px solid #e0e6ed;
  font-size: 13px;
  color: #7f8c8d;
}

.log-user {
  color: #3498db;
  cursor: pointer;
}

.log-user:hover {
  text-decoration: underline;
}

.log-details {
  margin-top: 8px;
  padding: 10px;
  background: #fff;
  border: 1px solid #e0e6ed;
  border-radius: 6px;
}

.diff-container {
  font-family: monospace;
  font-size: 13px;
  padding: 8px;
  background: #f8fafc;
  border-radius: 4px;
  max-height: 120px;
  overflow-y: auto;
}

/* Scrollbar Styling */
.content-area::-webkit-scrollbar,
.form-section::-webkit-scrollbar,
.view-section::-webkit-scrollbar {
  width: 8px;
}

.content-area::-webkit-scrollbar-track,
.form-section::-webkit-scrollbar-track,
.view-section::-webkit-scrollbar-track {
  background: #f1f3f5;
  border-radius: 4px;
}

.content-area::-webkit-scrollbar-thumb,
.form-section::-webkit-scrollbar-thumb,
.view-section::-webkit-scrollbar-thumb {
  background: #b0bec5;
  border-radius: 4px;
}

.content-area::-webkit-scrollbar-thumb:hover,
.form-section::-webkit-scrollbar-thumb:hover,
.view-section::-webkit-scrollbar-thumb:hover {
  background: #95a5a6;
}
</style>
