import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/DIPLOM_SN/",
  server: {
    port: 5173,
  },
});
