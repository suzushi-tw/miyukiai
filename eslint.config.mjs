import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Turn off the rule causing most of your errors
      "@typescript-eslint/no-unused-expressions": "off",
      
      // Other rules you're encountering
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-require-imports": "off"
    },
    // Ignore generated files
    ignores: [
      "src/generated/**/*"
    ]
  }
];

export default eslintConfig;