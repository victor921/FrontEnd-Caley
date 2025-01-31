import { defineStore } from "pinia";

export const useCompanyStore = defineStore("companyStore", {
  state: () => ({
    companies: [],
  }),
  actions: {
    setCompanies(data) {
      this.companies = data;
    },
    addCompany(company) {
      this.companies.push(company);
    },
    updateCompany(updatedCompany) {
      const index = this.companies.findIndex(
        (c) => c.carrier_id === updatedCompany.carrier_id
      );
      if (index !== -1) {
        this.companies[index] = updatedCompany;
      }
    },
  },
});
