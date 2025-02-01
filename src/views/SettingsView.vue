<template>
  <div class="settings-container">
    <h1 class="title">Company Metadata Management</h1>

    <!-- Action Buttons -->
    <div class="action-selection">
      <button @click="chooseAction('add')" class="action-btn">
        ➕ Add New Company
      </button>
      <button @click="chooseAction('edit')" class="action-btn">
        ✏️ Modify Existing Company
      </button>
      <button @click="chooseAction('view')" class="action-btn">
        👀 View Mappings
      </button>
    </div>

    <!-- Loading Indicator -->
    <div v-if="loading" class="load-section">
      <p>Loading company data...</p>
    </div>
    <!-- Error Message -->
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>

    <!-- Modify Existing or View Mappings: Choose a company -->
    <div
      v-if="(action === 'edit' || action === 'view') && companyData.length && !loading"
      class="edit-section"
    >
      <h2 class="subtitle">
        {{ action === 'edit' ? 'Select Company to Modify' : 'Select Company to View' }}
      </h2>
      <select v-model="selectedCompanyIndex" class="dropdown select-company">
        <option value="" disabled>Select Company</option>
        <option
          v-for="(company, index) in companyData"
          :key="index"
          :value="index"
        >
          {{ company.full_company_name }}
        </option>
      </select>
    </div>

    <!-- Add or Edit Company Form -->
    <div
      v-if="(action === 'add') || (action === 'edit' && selectedCompanyIndex !== '')"
      class="form-section"
    >
      <h2 class="subtitle">
        {{ action === 'add' ? 'Add New Company' : 'Modify Company' }}
      </h2>

      <div class="form-group">
        <label>Carrier ID</label>
        <input
          type="number"
          v-model="currentCompany.carrier_id"
          placeholder="Carrier ID"
          class="input-field"
        />
      </div>

      <div class="form-group">
        <label>Full Company Name</label>
        <input
          type="text"
          v-model="currentCompany.full_company_name"
          placeholder="Full Company Name"
          class="input-field"
        />
      </div>

      <div class="form-group">
        <label>Simple Names <small>(comma-separated)</small></label>
        <input
          type="text"
          v-model="simpleCompanyInput"
          placeholder="Simple Names, e.g. AmWINS, AmWINS Access"
          class="input-field"
        />
      </div>

      <!-- MVR & Statement Checkboxes -->
      <div class="checkbox-group form-group">
        <label class="checkbox-label">
          <input type="checkbox" v-model="isMVR" />
          Includes MVR Data
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="isStatement" />
          Includes Statement Data
        </label>
      </div>

      <!-- MVR Fields -->
      <div v-if="isMVR" class="fields-section">
        <h3>MVR Fields</h3>
        <div class="fields-scroll">
          <!-- Render each field using an array index -->
          <div
            v-for="(field, index) in mvrInputs"
            :key="index"
            class="field-entry"
          >
            <input
              type="text"
              v-model="field.key"
              class="input-field key-field"
              placeholder="Field Key"
            />
            <select v-model="field.value" class="input-field dropdown">
              <option value="" disabled>Select Mapped Field</option>
              <option
                v-for="option in fieldOptions"
                :key="option"
                :value="option"
              >
                {{ option }}
              </option>
            </select>
            <button @click="removeMvrField(index)" class="remove-btn">
              ✖
            </button>
          </div>
        </div>
        <!-- Add new MVR Field -->
        <div class="add-new-fields">
          <input
            type="text"
            v-model="newMvrKey"
            placeholder="New MVR Field Key"
            class="input-field"
          />
          <select v-model="newMvrValue" class="input-field dropdown">
            <option value="" disabled>Select Mapped Field</option>
            <option
              v-for="option in fieldOptions"
              :key="option"
              :value="option"
            >
              {{ option }}
            </option>
          </select>
          <button @click="addMvrField" class="add-field-btn">
            ➕ Add MVR Field
          </button>
        </div>
      </div>

      <!-- Statement Fields -->
      <div v-if="isStatement" class="fields-section">
        <h3>Statement Fields</h3>
        <div class="fields-scroll">
          <div
            v-for="(field, index) in statementInputs"
            :key="index"
            class="field-entry"
          >
            <input
              type="text"
              v-model="field.key"
              class="input-field key-field"
              placeholder="Field Key"
            />
            <select v-model="field.value" class="input-field dropdown">
              <option value="" disabled>Select Mapped Field</option>
              <option
                v-for="option in fieldOptions"
                :key="option"
                :value="option"
              >
                {{ option }}
              </option>
            </select>
            <button @click="removeStatementField(index)" class="remove-btn">
              ✖
            </button>
          </div>
        </div>
        <!-- Add new Statement Field -->
        <div class="add-new-fields">
          <input
            type="text"
            v-model="newStatementKey"
            placeholder="New Statement Field Key"
            class="input-field"
          />
          <select v-model="newStatementValue" class="input-field dropdown">
            <option value="" disabled>Select Mapped Field</option>
            <option
              v-for="option in fieldOptions"
              :key="option"
              :value="option"
            >
              {{ option }}
            </option>
          </select>
          <button @click="addStatementField" class="add-field-btn">
            ➕ Add Statement Field
          </button>
        </div>
      </div>

      <!-- Save Button -->
      <button @click="saveChanges" class="save-btn">
        {{ action === 'add' ? 'Add Company' : 'Save Changes' }}
      </button>
      <p v-if="saveMessage" class="save-message">{{ saveMessage }}</p>
    </div>

    <!-- View-Only Company Mappings -->
    <div v-if="action === 'view' && selectedCompanyIndex !== ''" class="view-only-section">
      <h2 class="subtitle">View Company Mappings</h2>
      <div>
        <h4>MVR Fields (read-only)</h4>
        <div
          v-if="Object.keys(currentCompany.mvr_fields || {}).length"
          class="view-mapping-list"
        >
          <ul>
            <li
              v-for="(value, key) in currentCompany.mvr_fields"
              :key="key"
            >
              <strong>{{ key }}</strong> → {{ value }}
            </li>
          </ul>
        </div>
        <p v-else>No MVR fields defined.</p>
      </div>

      <div>
        <h4>Statement Fields (read-only)</h4>
        <div
          v-if="Object.keys(currentCompany.statement_fields || {}).length"
          class="view-mapping-list"
        >
          <ul>
            <li
              v-for="(value, key) in currentCompany.statement_fields"
              :key="key"
            >
              <strong>{{ key }}</strong> → {{ value }}
            </li>
          </ul>
        </div>
        <p v-else>No Statement fields defined.</p>
      </div>
    </div>

    <!-- Last Edited Log Section -->
    <div class="log-section" v-if="lastEditedLog">
      <p>
        Last Edited by:
        <span class="log-user" @click="toggleLogDetails" style="cursor: pointer; text-decoration: underline;">
          {{ lastEditedLog.user_email }}
        </span>
        on {{ formatDate(lastEditedLog.change_timestamp) }}
      </p>
      <div v-if="showLogDetails" class="log-details">
        <p>Action: {{ lastEditedLog.action }}</p>
        <!-- Diff output with highlighted changes -->
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
      // action can be "add", "edit", or "view"
      action: "",
      companyData: [],
      selectedCompanyIndex: "",
      currentCompany: {
        carrier_id: "",
        full_company_name: "",
        simple_company: [],
        mvr_fields: {},
        statement_fields: {},
      },
      // Store original company data for logging purposes when editing
      originalCompany: {},
      simpleCompanyInput: "",

      // Use arrays for dynamic fields
      mvrInputs: [],
      statementInputs: [],

      // New field inputs
      newMvrKey: "",
      newMvrValue: "",
      newStatementKey: "",
      newStatementValue: "",

      // Toggles
      isMVR: false,
      isStatement: false,

      // Predefined field options
      fieldOptions: [
        "full_name",
        "order_date",
        "premium",
        "gross_comission",
        "effective_date",
        "transaction_type",
        "fee",
        "User",
        "charge",
        "credit",
        "policy_statement",
        "carrier_name"
      ],

      loading: false,
      errorMessage: "",
      saveMessage: "",

      // Log info
      lastEditedLog: null,
      showLogDetails: false,
    };
  },
  computed: {
    diffHtml() {
      if (!this.lastEditedLog) return "";
      // Attempt to parse the JSON values; if parsing fails, fall back to raw preformatted text.
      let oldParsed, newParsed;
      try {
        oldParsed = this.lastEditedLog.old_value
          ? JSON.parse(this.lastEditedLog.old_value)
          : {};
        newParsed = this.lastEditedLog.new_value
          ? JSON.parse(this.lastEditedLog.new_value)
          : {};
      } catch (e) {
        return `<pre>Old Value: ${this.lastEditedLog.old_value}\nNew Value: ${this.lastEditedLog.new_value}</pre>`;
      }
      // Pretty-print the JSON with indentation.
      const oldStr = JSON.stringify(oldParsed, null, 2);
      const newStr = JSON.stringify(newParsed, null, 2);
      // Compute the diff using diffJson.
      const diff = diffJson(oldStr, newStr);
      let html = "";
      diff.forEach(part => {
        // Added parts in green, removed parts in red, unchanged in black.
        const color = part.added ? "green" : part.removed ? "red" : "black";
        // Replace newlines with <br> to preserve formatting.
        const text = part.value.replace(/\n/g, "<br>");
        html += `<span style="color:${color}; white-space: pre-wrap;">${text}</span>`;
      });
      return html;
    },
  },
  mounted() {
    const userStore = useUserStore();
    console.log("Logged in user email:", userStore.user.email);
    this.fetchLastEditedLog();
  },
  methods: {
    // Called when user picks an action
    chooseAction(selected) {
      this.action = selected;
      this.selectedCompanyIndex = "";
      this.resetCurrentCompany();
      this.saveMessage = "";
      this.errorMessage = "";
      this.fetchCompanyData();
    },

    // Reset the company form.
    resetCurrentCompany() {
      this.currentCompany = {
        carrier_id: "",
        full_company_name: "",
        simple_company: [],
        mvr_fields: {},
        statement_fields: {},
      };
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

    // Fetch company metadata.
    async fetchCompanyData() {
      if (this.companyData.length) return; // already loaded
      this.loading = true;
      this.errorMessage = "";
      try {
        const response = await axios.get(
          "https://dev.rocox.co/api/get_file_content?path=/caley-operations-dev/Static Files/company_metadata.json"
        );
        this.companyData = response.data || [];
      } catch (error) {
        console.error("Error fetching data:", error);
        this.errorMessage = "Failed to load company data.";
      } finally {
        this.loading = false;
      }
    },

    // Fetch the last edited log entry from the database.
    async fetchLastEditedLog() {
      try {
        const response = await axios.post("https://dev.rocox.co/api/query_db", {
          query:
            "SELECT TOP 1 user_email, change_timestamp, action, old_value, new_value FROM dbo.configuration_logs ORDER BY change_timestamp DESC"
        });
        if (response.data && response.data.length > 0) {
          this.lastEditedLog = response.data[0];
        }
      } catch (error) {
        console.error("Error fetching last edited log:", error);
      }
    },

    // Toggle display of log details.
    toggleLogDetails() {
      this.showLogDetails = !this.showLogDetails;
    },

    // MVR Field methods
    addMvrField() {
      if (this.newMvrKey.trim() && this.newMvrValue.trim()) {
        this.mvrInputs.push({
          key: this.newMvrKey.trim(),
          value: this.newMvrValue.trim()
        });
        this.newMvrKey = "";
        this.newMvrValue = "";
      } else {
        alert("Please enter a Field Key and choose a Mapped Field for MVR.");
      }
    },
    removeMvrField(index) {
      this.mvrInputs.splice(index, 1);
    },

    // Statement Field methods
    addStatementField() {
      if (this.newStatementKey.trim() && this.newStatementValue.trim()) {
        this.statementInputs.push({
          key: this.newStatementKey.trim(),
          value: this.newStatementValue.trim()
        });
        this.newStatementKey = "";
        this.newStatementValue = "";
      } else {
        alert("Please enter a Field Key and choose a Mapped Field for Statement.");
      }
    },
    removeStatementField(index) {
      this.statementInputs.splice(index, 1);
    },

    // Helper: Convert array of field objects to an object mapping keys to values
    arrayToObject(arr) {
      const obj = {};
      arr.forEach(item => {
        if (item.key) {
          obj[item.key] = item.value;
        }
      });
      return obj;
    },

    // Save changes (for add or edit)
    async saveChanges() {
      // Build the final company object.
      this.currentCompany.simple_company = this.simpleCompanyInput
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);
      this.currentCompany.mvr_fields = this.isMVR ? this.arrayToObject(this.mvrInputs) : {};
      this.currentCompany.statement_fields = this.isStatement ? this.arrayToObject(this.statementInputs) : {};

      if (this.action === "add") {
        this.companyData.push({ ...this.currentCompany });
      } else if (this.action === "edit" && this.selectedCompanyIndex !== "") {
        this.companyData[this.selectedCompanyIndex] = { ...this.currentCompany };
      }

      try {
        const resp = await axios.post("https://dev.rocox.co/api/create_file", {
          directory: "Static Files/",
          file_name: "company_metadata.json",
          content: this.companyData,
        });
        console.log("Save Response:", resp.data);
        this.saveMessage = "Changes saved successfully!";

        // If editing, store the original values for logging (if not already set)
        if (this.action === "edit" && Object.keys(this.originalCompany).length === 0) {
          this.originalCompany = JSON.parse(JSON.stringify(this.companyData[this.selectedCompanyIndex]));
        }

        // Update the log table
        await this.updateLog();

        // Refresh the last edited log info
        this.fetchLastEditedLog();
      } catch (error) {
        console.error("Error saving file:", error);
        this.saveMessage = "Failed to save changes.";
      }
    },

    // Update the log table by calling the update_sql endpoint.
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
      try {
        const response = await axios.post("https://dev.rocox.co/api/update_sql", {
          table: "configuration_logs",
          data: logData
        });
        console.log("Log update response:", response.data);
      } catch (error) {
        console.error("Error updating log:", error);
      }
    },

    // Format date string for display.
    formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleString();
    },
  },
  watch: {
    // When a company is selected, load its data into the form and store original values.
    selectedCompanyIndex(newVal) {
      if (newVal !== "") {
        const selected = this.companyData[newVal];
        if (!selected) return;
        this.currentCompany = JSON.parse(JSON.stringify(selected));
        this.originalCompany = JSON.parse(JSON.stringify(selected));
        this.simpleCompanyInput = this.currentCompany.simple_company.join(", ");
        this.isMVR = Object.keys(this.currentCompany.mvr_fields || {}).length > 0;
        this.mvrInputs = Object.keys(this.currentCompany.mvr_fields || {}).map(key => ({
          key,
          value: this.currentCompany.mvr_fields[key]
        }));
        this.isStatement = Object.keys(this.currentCompany.statement_fields || {}).length > 0;
        this.statementInputs = Object.keys(this.currentCompany.statement_fields || {}).map(key => ({
          key,
          value: this.currentCompany.statement_fields[key]
        }));
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
  max-width: 950px;
  margin: 30px auto;
  padding: 20px;
  background: #ffffff;
  border-radius: 10px;
  font-family: Arial, sans-serif;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);
  color: #333;
}

.title {
  text-align: center;
  margin-bottom: 1.5rem;
}

/* Action Buttons */
.action-selection {
  text-align: center;
  margin-bottom: 1.5rem;
}
.action-btn {
  background-color: #0d6efd;
  color: #fff;
  border: none;
  margin: 0 10px;
  font-size: 16px;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
}
.action-btn:hover {
  background-color: #0a58ca;
}

/* Load Section */
.load-section {
  text-align: center;
  margin-bottom: 1.5rem;
  font-size: 16px;
  color: #555;
}
.error-message {
  color: red;
  font-weight: bold;
  margin-top: 10px;
  text-align: center;
}

/* Edit/Select Section */
.edit-section {
  margin-top: 20px;
}
.subtitle {
  margin-bottom: 1rem;
  text-align: center;
}
.dropdown.select-company {
  display: block;
  margin: 0 auto;
  max-width: 300px;
  padding: 8px;
  font-size: 14px;
  border-radius: 6px;
  border: 1px solid #ccc;
}

/* Form Section */
.form-section {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-top: 20px;
}
.form-group {
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
}
.form-group label {
  margin-bottom: 5px;
  font-weight: 600;
}
.input-field {
  padding: 8px;
  font-size: 14px;
  border-radius: 6px;
  border: 1px solid #ccc;
}

/* Checkbox Group */
.checkbox-group {
  display: flex;
  gap: 15px;
  align-items: center;
}
.checkbox-label {
  font-size: 14px;
}

/* Fields Section */
.fields-section {
  background: #ffffff;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 1rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}
.fields-section h3 {
  margin-bottom: 0.5rem;
  font-weight: 600;
}
.fields-scroll {
  max-height: 200px;
  overflow-y: auto;
  margin-bottom: 10px;
}
.field-entry {
  display: flex;
  gap: 10px;
  margin-bottom: 8px;
}
.key-field {
  flex: 1;
}
.add-new-fields {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

/* Remove and Add Buttons */
.remove-btn {
  background: none;
  color: #dc3545;
  font-size: 18px;
  border: none;
  cursor: pointer;
  padding: 0 8px;
  align-self: center;
}
.remove-btn:hover {
  text-shadow: 0 0 2px #dc3545;
}
.add-field-btn {
  background: #20c997;
  color: #fff;
  font-size: 14px;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
}
.add-field-btn:hover {
  background: #0fb18d;
}

/* Save Button */
.save-btn {
  background-color: #28a745;
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  padding: 10px 18px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: block;
  margin: 0 auto;
  margin-top: 20px;
}
.save-btn:hover {
  background-color: #218838;
}
.save-message {
  text-align: center;
  margin-top: 15px;
  font-weight: bold;
  color: #333;
}

/* View-Only Section */
.view-only-section {
  background: #fdfdfd;
  border: 1px solid #ccc;
  border-radius: 8px;
  margin-top: 20px;
  padding: 15px;
}
.view-only-section h2 {
  text-align: center;
  margin-bottom: 1rem;
}
.view-mapping-list ul {
  margin: 0;
  padding-left: 1rem;
}
.view-mapping-list li {
  margin: 4px 0;
  font-size: 14px;
}

/* Log Section */
.log-section {
  margin-top: 20px;
  padding: 15px;
  background: #eef;
  border: 1px solid #ccd;
  border-radius: 8px;
}
.log-user {
  font-weight: bold;
  color: #007bff;
}
.log-details {
  margin-top: 10px;
  background: #f8f9fa;
  padding: 10px;
  border-radius: 6px;
  border: 1px solid #ccc;
}

/* Diff Container */
.diff-container {
  background: #f7f7f7;
  padding: 10px;
  border-radius: 6px;
  font-family: monospace;
  white-space: pre-wrap;
  margin-top: 10px;
}
</style>
