import { rename, existsSync, mkdirSync, rmSync, readdirSync } from 'fs';
import { resolve, join } from 'path';

// Define paths
const sourceFile = resolve('dist/src/popup/index.html');
const destinationFolder = resolve('dist/assets');
const sourceFolder = resolve('dist/src/popup');

// Ensure the destination folder exists
if (!existsSync(destinationFolder)) {
  mkdirSync(destinationFolder, { recursive: true });
}

// Move index.html from dist/src/popup/ to dist/assets/
const destinationFile = join(destinationFolder, 'index.html');
rename(sourceFile, destinationFile, (err) => {
  if (err) {
    console.error('Error moving the file:', err);
  } else {
    console.log('index.html moved successfully to dist/assets/');

    // Check if the source folder is empty and remove it
    const files = readdirSync(sourceFolder);
    if (files.length === 0) {
      rmSync(sourceFolder, { recursive: true, force: true }); // Updated from rmdirSync to rmSync
      console.log('Empty src/popup folder removed.');
    } else {
      console.log('src/popup folder is not empty.');
    }
  }
});
