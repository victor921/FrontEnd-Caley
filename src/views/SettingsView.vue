<template>
  <div class="settings-container">
    <h1 class="title">Company Metadata Management</h1>

    <!-- Step 1: Choose Action -->
    <div class="action-selection">
      <button @click="chooseAction('add')" class="action-btn">➕ Add New Company</button>
      <button @click="chooseAction('edit')" class="action-btn">✏️ Modify Existing Company</button>
      <button @click="chooseAction('view')" class="action-btn">👀 View Mappings</button>
    </div>

    <!-- Modify Existing or View Mappings: Choose a company -->
    <div
      v-if="(action === 'edit' || action === 'view') && companyData.length"
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
          <div
            v-for="(mappedVal, key) in mvrInputs"
            :key="key"
            class="field-entry"
          >
            <input
              type="text"
              :value="key"
              class="input-field key-field"
              @input="updateMvrKey($event, key)"
              placeholder="Field Key"
            />
            <select
              v-model="mvrInputs[key]"
              class="input-field dropdown"
            >
              <option value="" disabled>Select Mapped Field</option>
              <option
                v-for="option in fieldOptions"
                :key="option"
                :value="option"
              >
                {{ option }}
              </option>
            </select>
            <button @click="removeMvrField(key)" class="remove-btn">✖</button>
          </div>
        </div>
        <!-- Add new MVR Key/Value -->
        <div class="add-new-fields">
          <input
            type="text"
            v-model="newMvrKey"
            placeholder="New MVR Field Key"
            class="input-field"
          />
          <select v-model="newMvrValue" class="input-field dropdown">
            <option value="" disabled>Select Mapped Field</option>
            <option v-for="option in fieldOptions" :key="option" :value="option">
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
            v-for="(mappedVal, key) in statementInputs"
            :key="key"
            class="field-entry"
          >
            <input
              type="text"
              :value="key"
              class="input-field key-field"
              @input="updateStatementKey($event, key)"
              placeholder="Field Key"
            />
            <select
              v-model="statementInputs[key]"
              class="input-field dropdown"
            >
              <option value="" disabled>Select Mapped Field</option>
              <option v-for="option in fieldOptions" :key="option" :value="option">
                {{ option }}
              </option>
            </select>
            <button @click="removeStatementField(key)" class="remove-btn">✖</button>
          </div>
        </div>
        <!-- Add new Statement Key/Value -->
        <div class="add-new-fields">
          <input
            type="text"
            v-model="newStatementKey"
            placeholder="New Statement Field Key"
            class="input-field"
          />
          <select v-model="newStatementValue" class="input-field dropdown">
            <option value="" disabled>Select Mapped Field</option>
            <option v-for="option in fieldOptions" :key="option" :value="option">
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
              v-for="(mappedVal, mappedKey) in currentCompany.mvr_fields"
              :key="mappedKey"
            >
              <strong>{{ mappedKey }}</strong> → {{ mappedVal }}
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
              v-for="(mappedVal, mappedKey) in currentCompany.statement_fields"
              :key="mappedKey"
            >
              <strong>{{ mappedKey }}</strong> → {{ mappedVal }}
            </li>
          </ul>
        </div>
        <p v-else>No Statement fields defined.</p>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";
import Button from "primevue/button";

export default {
  name: "SettingsView",
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
      simpleCompanyInput: "",

      // local store for MVR and statement fields
      mvrInputs: {},
      statementInputs: {},

      // new field inputs
      newMvrKey: "",
      newMvrValue: "",
      newStatementKey: "",
      newStatementValue: "",

      // toggles
      isMVR: false,
      isStatement: false,

      // Predefined field map
      fieldOptions: [
        "full_name",
        "order_date",
        "premium",
        "gross_comission",
        "effective_date",
        "fee",
        "User",
        "charge",
        "credit",
        "policy_statement",
      ],

      loading: false,
      errorMessage: "",
      saveMessage: "",
    };
  },
  methods: {
    // Called when user picks an action
    chooseAction(selected) {
      this.action = selected;
      this.selectedCompanyIndex = "";
      this.resetCurrentCompany();
      this.saveMessage = "";
      this.errorMessage = "";
      // As soon as user picks an action, load the data if not loaded
      this.fetchCompanyData();
    },

    // Reset company form
    resetCurrentCompany() {
      this.currentCompany = {
        carrier_id: "",
        full_company_name: "",
        simple_company: [],
        mvr_fields: {},
        statement_fields: {},
      };
      this.simpleCompanyInput = "";
      this.isMVR = false;
      this.isStatement = false;
      this.mvrInputs = {};
      this.statementInputs = {};

      this.newMvrKey = "";
      this.newMvrValue = "";
      this.newStatementKey = "";
      this.newStatementValue = "";
    },

    // Load entire company_metadata.json
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

    // Add new MVR field
    addMvrField() {
      if (this.newMvrKey.trim() && this.newMvrValue.trim()) {
        // Standard JS property assignment
        this.mvrInputs[this.newMvrKey.trim()] = this.newMvrValue.trim();
        // Clear
        this.newMvrKey = "";
        this.newMvrValue = "";
      } else {
        alert("Please enter a Field Key and choose a Mapped Field for MVR.");
      }
    },

    // Remove MVR field
    removeMvrField(key) {
      // Standard JS property removal
      delete this.mvrInputs[key];
    },

    // Update MVR key name
    updateMvrKey(event, oldKey) {
      const newKey = event.target.value;
      if (!newKey.trim()) return;

      const oldVal = this.mvrInputs[oldKey];
      delete this.mvrInputs[oldKey];
      this.mvrInputs[newKey.trim()] = oldVal;
    },

    // Add new Statement field
    addStatementField() {
      if (this.newStatementKey.trim() && this.newStatementValue.trim()) {
        this.statementInputs[this.newStatementKey.trim()] =
          this.newStatementValue.trim();
        this.newStatementKey = "";
        this.newStatementValue = "";
      } else {
        alert("Please enter a Field Key and choose a Mapped Field for Statement.");
      }
    },

    // Remove statement field
    removeStatementField(key) {
      delete this.statementInputs[key];
    },

    // Update statement key name
    updateStatementKey(event, oldKey) {
      const newKey = event.target.value;
      if (!newKey.trim()) return;

      const oldVal = this.statementInputs[oldKey];
      delete this.statementInputs[oldKey];
      this.statementInputs[newKey.trim()] = oldVal;
    },

    // Save changes (Add or Modify)
    async saveChanges() {
      // Build final object
      this.currentCompany.simple_company = this.simpleCompanyInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (this.isMVR) {
        this.currentCompany.mvr_fields = { ...this.mvrInputs };
      } else {
        this.currentCompany.mvr_fields = {};
      }

      if (this.isStatement) {
        this.currentCompany.statement_fields = { ...this.statementInputs };
      } else {
        this.currentCompany.statement_fields = {};
      }

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
      } catch (error) {
        console.error("Error saving file:", error);
        this.saveMessage = "Failed to save changes.";
      }
    },
  },
  watch: {
    // Whenever user selects a company => load data into currentCompany
    selectedCompanyIndex(newVal) {
      if (newVal !== "") {
        const selected = this.companyData[newVal];
        if (!selected) return;
        // Copy to currentCompany
        this.currentCompany = JSON.parse(JSON.stringify(selected));

        // parse simple_company array => comma string
        this.simpleCompanyInput = this.currentCompany.simple_company.join(", ");

        // MVR toggles
        this.isMVR = Object.keys(this.currentCompany.mvr_fields || {}).length > 0;
        this.mvrInputs = JSON.parse(
          JSON.stringify(this.currentCompany.mvr_fields || {})
        );

        // Statement toggles
        this.isStatement =
          Object.keys(this.currentCompany.statement_fields || {}).length > 0;
        this.statementInputs = JSON.parse(
          JSON.stringify(this.currentCompany.statement_fields || {})
        );

        // Reset new field placeholders
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

/* Action buttons */
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

/* Load section */
.load-section {
  text-align: center;
  margin-bottom: 1.5rem;
}
.load-btn {
  background-color: #6c757d;
  color: #fff;
  border: none;
  font-size: 15px;
  padding: 8px 14px;
  border-radius: 6px;
  cursor: pointer;
}
.load-btn:hover {
  background-color: #565e64;
}
.error-message {
  color: red;
  font-weight: bold;
  margin-top: 10px;
  text-align: center;
}

/* Edit/Select existing companies */
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

/* Add/Edit Form */
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

/* MVR/Statement toggles */
.checkbox-group {
  display: flex;
  gap: 15px;
  align-items: center;
}
.checkbox-label {
  font-size: 14px;
}

/* Fields sections */
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

/* Scroll for many fields */
.fields-scroll {
  max-height: 200px; /* adjustable */
  overflow-y: auto;
  margin-bottom: 10px;
}

/* field entry styling */
.field-entry {
  display: flex;
  gap: 10px;
  margin-bottom: 8px;
}
.key-field {
  flex: 1;
}

/* "Add new fields" row */
.add-new-fields {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

/* Remove and Add buttons */
.remove-btn {
  background: none; /* remove red background */
  color: #dc3545;   /* keep red icon color */
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

/* Save button */
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

/* View-only mode */
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
</style>
