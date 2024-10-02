declare module 'vite-plugin-move-file' {
    interface MoveFileOptions {
      src: string;
      dest: string;
    }
  
    function moveFile(options: MoveFileOptions[]): any;
  
    export default moveFile;
  }
  