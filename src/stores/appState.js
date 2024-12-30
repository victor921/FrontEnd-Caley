import { defineStore } from 'pinia';

export const useAppStateStore = defineStore('appState', {
  state: () => ({
    tabData: {}, // Store data for each tab
  }),
  actions: {
    saveTabData(tabName, data) {
      this.tabData[tabName] = data;
    },
    getTabData(tabName) {
      return this.tabData[tabName] || {};
    },
  },
});
