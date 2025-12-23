import { defineConfig } from "vite";
import { copyFileSync } from "fs";

export default defineConfig({
  build: {
    lib: {
      entry: "src/bundle.manifests.ts", // Bundle registers one or more manifests
      formats: ["es"],
      fileName: "oc-power-sorting",
    },
    outDir: "../wwwroot/App_Plugins/OCPowerSorting", // your web component will be saved in this location
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      external: [/^@umbraco/],
    },
  },
  plugins: [
    {
      name: "copy-umbraco-package",
      closeBundle() {
        copyFileSync(
          "public/umbraco-package.json",
          "../wwwroot/App_Plugins/OCPowerSorting/umbraco-package.json"
        );
      },
    },
  ],
});
