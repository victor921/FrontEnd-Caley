<template>
  <div class="search-contact">
    <h2>Search Contacts</h2>
    <div class="search-container">
      <input
        v-model="searchInput"
        type="text"
        placeholder="Search by phone, name, policy number, etc..."
        class="search-input"
        @input="debouncedSearch"
      />
      <span v-if="loading" class="spinner"></span>
    </div>

    <!-- Error state -->
    <p v-if="error" class="error">{{ error }}</p>

    <!-- Results display with scrolling -->
    <div class="results-container">
      <transition-group name="fade" tag="div" class="results" v-if="results.length > 0">
        <div v-for="(item, index) in results" :key="index" class="result-tile">
          <div class="result-header">
            <span class="type-badge" :class="getTypeClass(item.ContactTypeName)">{{
              item.ContactTypeName
            }}</span>
          </div>
          <div class="result-body">
            <p><strong>Name:</strong> {{ item.ContactName }}</p>
            <p><strong>Phone:</strong> {{ item.PrimaryPhone }}</p>
            <p><strong>Address:</strong> {{ formatAddress(item) }}</p>
            <p><strong>Location:</strong> {{ item.LocationName }}</p>
          </div>
        </div>
      </transition-group>
      <p v-else-if="searchPerformed && !results.length" class="no-results">
        No customers or prospects found for "{{ searchInput }}".
      </p>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import debounce from 'lodash/debounce'

export default {
  name: 'SearchContact',
  data() {
    return {
      searchInput: '',
      results: [],
      loading: false,
      error: null,
      searchPerformed: false,
    }
  },
  methods: {
    async searchContacts() {
      if (!this.searchInput.trim()) {
        this.results = []
        this.searchPerformed = false
        return
      }

      this.loading = true
      this.error = null
      this.searchPerformed = false

      try {
        const functionUrl = `/api/search?code=${process.env.VUE_APP_FUNCTION_KEY}`
        const response = await axios.get(functionUrl, {
          params: { searchContent: this.searchInput },
        })

        const data = response.data
        // Filter results to only include Customers and Prospects
        this.results = (data.Contacts || []).filter((item) => {
          const type = item.ContactTypeName?.toLowerCase()
          return type === 'customer' || type === 'prospect'
        })
        this.searchPerformed = true
      } catch (err) {
        this.error = err.response?.data || err.message || 'An error occurred'
        this.results = []
      } finally {
        this.loading = false
      }
    },
    debouncedSearch: debounce(function () {
      this.searchContacts()
    }, 500),
    getTypeClass(type) {
      return type?.toLowerCase().replace(/\s+/g, '-') || 'unknown'
    },
    formatAddress(item) {
      const parts = [
        item.PrimaryAddressLine1,
        item.PrimaryAddressCity,
        item.PrimaryAddressState,
        item.PrimaryAddressZip,
      ].filter(Boolean)
      return parts.join(', ')
    },
  },
}
</script>

<style scoped>
.search-contact {
  max-width: 1200px;
  margin: 40px auto;
  padding: 20px;
  font-family: 'Segoe UI', Arial, sans-serif;
}

h2 {
  color: #333;
  text-align: center;
  margin-bottom: 20px;
}

.search-container {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  width: 100%;
  padding: 12px 40px 12px 12px;
  font-size: 16px;
  border: 2px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: border-color 0.3s;
}

.search-input:focus {
  border-color: #007bff;
  outline: none;
}

.spinner {
  position: absolute;
  right: 10px;
  width: 20px;
  height: 20px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.error {
  color: #d9534f;
  text-align: center;
  margin-top: 10px;
}

.results-container {
  margin-top: 30px;
  max-height: 70vh;
  overflow-y: auto;
  padding-right: 10px;
}

.results {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.result-tile {
  background: #fff;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
  display: flex;
  flex-direction: column;
}

.result-tile:hover {
  transform: translateY(-2px);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.type-badge {
  padding: 4px 8px;
  border-radius: 12px;
  color: white;
  font-size: 12px;
  font-weight: bold;
}

.type-badge.prospect {
  background-color: #007bff;
}

.type-badge.customer {
  background-color: #28a745;
}

.result-body p {
  margin: 5px 0;
  color: #555;
  font-size: 14px;
}

.no-results {
  text-align: center;
  color: #777;
  margin-top: 20px;
  grid-column: 1 / -1;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.results-container::-webkit-scrollbar {
  width: 8px;
}

.results-container::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

.results-container::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>
