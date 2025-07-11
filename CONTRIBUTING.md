# Contributing to Pixel Painter

Thank you for your interest in contributing!

## Getting Started

1. **Install dependencies**
   
   Run the following command in the project directory:
   
   ```sh
   npm install
   ```

2. **Start the app**
   
   Launch Pixel Painter with:
   
   ```sh
   npm start
   ```

## Basic Info
- This project uses [Electron](https://www.electronjs.org/).
- The main entry point is `main.js`.
- The UI is in `index.html`, styled by `style.css`, and logic is in `app.js`.

Feel free to open issues or submit pull requests!


## Building a Windows Executable (.exe)

To package Pixel Painter as a Windows installer (.exe):

1. **Install electron-builder** (if not already):
   ```sh
   npm install --save-dev electron-builder
   ```

2. **Build the installer**:
   ```sh
   npm run build
   ```

This will create a `.exe` installer in the `dist/` folder. Share this file to distribute the app.