<template>
  <button @click="fetchData">Test API</button>
</template>
<script>
import axios from "axios";

export default {
  methods: {
    async fetchData() {
      try {
       const response = await axios.get("/api/test");
        console.log("Request URL:", response.request.responseURL);
        console.log("API Response:", response.data); // "Hello, test8!"
      } catch (error) {
        console.error("API call error:", error);
        if (error.response) {
          console.error("Response Data:", error.response.data);
          console.error("Status:", error.response.status);
        }
      }
    },
  },
  mounted() {
    this.fetchData();
  },
};
</script>
