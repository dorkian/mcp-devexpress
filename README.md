# DevExpress MCP Server

This repository provides a Model Context Protocol (MCP) server for DevExpress components. It is designed to be used as a backend for Copilot tools, enabling intelligent assistance and code completion for DevExpress components with accurate properties and methods.

## Purpose

- **Centralized DevExpress Documentation**: The server fetches and processes the official DevExpress documentation, converting it into structured JSON and HTML for easy consumption.
- **Copilot Integration**: Serves as a backend for Copilot and other AI tools, providing up-to-date component information, properties, and methods.
- **Easy Browsing**: Exposes a web interface to browse all available DevExpress components and their documentation.

## Usage

1. **Start the Server**
   ```sh
   node server.js
   # or, if you prefer using npm:
   npm start
   ```
   The server will be available at [http://localhost:3010](http://localhost:3010).

2. **Browse Components**
   - Visit the home page to see a list of all DevExpress components.
   - Click a component to view its properties and methods.
   - Click a property/method to view its documentation (rendered as HTML).

## Example API Calls

You can fetch component data directly from the API endpoints. Here are some examples:

- **Get JSON data for a component (e.g., dxPopover):**
  ```sh
  curl http://localhost:3010/api/devexpress/dxPopover
  ```
  Or open in your browser:
  [http://localhost:3010/api/devexpress/dxPopover](http://localhost:3010/api/devexpress/dxPopover)

- **Get the OpenAPI specification:**
  ```sh
  curl http://localhost:3010/openapi.json
  ```
  Or open in your browser:
  [http://localhost:3010/openapi.json](http://localhost:3010/openapi.json)

- **Get the AI Plugin manifest:**
  ```sh
  curl http://localhost:3010/.well-known/ai-plugin.json
  ```
  Or open in your browser:
  [http://localhost:3010/.well-known/ai-plugin.json](http://localhost:3010/.well-known/ai-plugin.json)

## Updating DevExpress Documentation

The documentation is fetched from the official DevExpress GitHub repository using the GitHub API. To update the documentation:

1. **Set your GitHub Token**
   - Open the `.env` file in the root of this repository.
   - Set the `GITHUB_TOKEN` variable to your personal GitHub access token:
     ```env
     GITHUB_TOKEN=your_personal_token_here
     ```
   - This token is required to avoid GitHub API rate limits when fetching documentation.

2. **Run the Scraper**
   ```sh
   node scrape/scarpeAllComponentsFromGit.js
   # or, if you prefer using npm:
   npm run scrape-git
   ```
   This will update the JSON files in the `data/` directory with the latest documentation.

## Requirements
- Node.js 18+
- A valid GitHub personal access token (for updating documentation)

## License
This project is for internal use only. Please refer to DevExpress licensing for documentation usage.
